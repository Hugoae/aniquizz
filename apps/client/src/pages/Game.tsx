import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { GameOver } from '@/features/game/components/GameOver';
import { StandardGameLayout } from '@/features/game/components/modes/standard/StandardGameLayout';
import { BattleRoyaleGameLayout } from '@/features/game/components/modes/battle-royale/BattleRoyaleGameLayout';
import { GlobalSettingsModal } from '@/features/settings/components/GlobalSettingsModal';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { socket } from '@/lib/socket';
import { useAuth } from '@/features/auth/context/AuthContext';
import { getFuzzySuggestions } from '@aniquizz/shared';

const SUPABASE_PROJECT_URL = "https://qjnfdhmvvledhtwwfrzb.supabase.co"; 
const BUCKET_NAME = "videos";
const getVideoUrl = (key: string | undefined | null) => {
  if (!key) return "";
  if (key.startsWith('http')) return key;
  return `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${BUCKET_NAME}/${key}`;
};

const safePlayerName = (p: any) => {
    if (p.name && p.name.trim() !== "") return p.name;
    if (p.username && p.username.trim() !== "") return p.username;
    return `Joueur ${String(p.id).substring(0, 4)}`;
};

export default function Game() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const initialState = location.state || {};
  const roomId = initialState.roomId;
  const initialPlayers = initialState.players || [];
  
  const settings = initialState.settings || { gameType: 'Standard' };
  const isBattleRoyale = settings.gameType === 'battle-royale';
  const gameMode = (initialState.mode === 'solo' || settings.maxPlayers === 1) ? 'solo' : 'multiplayer';
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const volumeRef = useRef(20);
  const isMutedRef = useRef(false);
  const isReturningToLobbyRef = useRef(false);

  const [players, setPlayers] = useState<any[]>(initialPlayers.map((p: any) => ({ ...p, name: safePlayerName(p), score: p.score || 0 })));
  const [phase, setPhase] = useState<'loading' | 'guessing' | 'revealed' | 'ended'>('loading');
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(settings.soundCount);
  const [currentSong, setCurrentSong] = useState<any | null>(null);
  const [nextVideoKey, setNextVideoKey] = useState<string | null>(initialState.gameData?.firstVideo || null);
  
  const [answer, setAnswer] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [inputMode, setInputMode] = useState<'typing' | 'carre' | 'duo'>('typing');
  const [choices, setChoices] = useState<string[]>([]);
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);
  const [storedQcmChoices, setStoredQcmChoices] = useState<string[]>([]);
  const [storedDuoChoices, setStoredDuoChoices] = useState<string[]>([]);

  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(100);
  const [phaseEndTime, setPhaseEndTime] = useState<number>(0);
  const [phaseTotalDuration, setPhaseTotalDuration] = useState<number>(settings.guessDuration);
  
  const [gameHistory, setGameHistory] = useState<any[]>([]); 
  const [victoryData, setVictoryData] = useState<any>(null);
  const [animeList, setAnimeList] = useState<any[]>([]);
  const [myWatchedIds, setMyWatchedIds] = useState<number[]>([]);

  const [volume, setVolume] = useState(20);
  const [isMuted, setIsMuted] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  
  const [isGamePaused, setIsGamePaused] = useState(false);
  const [pauseVotes, setPauseVotes] = useState(0);
  const [isPausePending, setIsPausePending] = useState(false);
  const [pauseRequired, setPauseRequired] = useState(1);
  const [resumeCountdown, setResumeCountdown] = useState<number | null>(null);

  const [skipVotes, setSkipVotes] = useState(0);
  const [skipRequired, setSkipRequired] = useState(1);
  const [hasVotedSkip, setHasVotedSkip] = useState(false);

  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [myProfile, setMyProfile] = useState({ username: profile?.username || 'Moi', avatar: profile?.avatar || 'player1' });
  
  // ✅ SIDEBAR FERMÉE PAR DÉFAUT EN MULTI
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  const [brPhaseLabel, setBrPhaseLabel] = useState("WARM-UP");
  const [isGulag, setIsGulag] = useState(false);
  const [survivorsCount, setSurvivorsCount] = useState(0);
  const [currentDifficulty, setCurrentDifficulty] = useState("easy");
  const [loadingCount, setLoadingCount] = useState(3);

  const amIHost = players.find(p => String(p.id) === String(socket.id))?.isHost;

  const playVideoSafe = (videoKey: string | null | undefined, startTime: number = 0) => {
    if (!videoRef.current || !videoKey) return;
    const fullUrl = `${getVideoUrl(videoKey)}#t=${startTime}`;
    videoRef.current.src = fullUrl;
    videoRef.current.load();
    videoRef.current.volume = isMutedRef.current ? 0 : volumeRef.current / 100;
    const playPromise = videoRef.current.play();
    if (playPromise !== undefined) {
        playPromise.then(() => setAutoplayBlocked(false)).catch(e => {
            if(e.name !== 'AbortError') setAutoplayBlocked(true);
        });
    }
  };

  useEffect(() => {
      if (profile?.anilistUsername) {
          socket.emit('get_my_watched', { username: profile.anilistUsername });
      }
      
      const onMyWatchedList = (ids: number[]) => {
          setMyWatchedIds(ids);
      };

      socket.on('my_watched_list', onMyWatchedList);
      return () => { socket.off('my_watched_list', onMyWatchedList); }
  }, [profile?.anilistUsername]);

  useEffect(() => {
    volumeRef.current = volume; isMutedRef.current = isMuted;
    if (videoRef.current) videoRef.current.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  useEffect(() => {
      if (phase === 'guessing' && currentSong) {
          playVideoSafe(currentSong.videoKey, currentSong.videoStartTime || 0);
      }
  }, [phase, currentSong]);

  useEffect(() => {
      if (roomId) {
          socket.emit('get_game_state', { roomId });
          socket.emit('get_anime_list');
      }
      socket.on('anime_list', (list) => { setAnimeList(list); });
      return () => { socket.off('anime_list'); };
  }, [roomId]);

  useEffect(() => {
    if (inputMode !== 'typing') { setSuggestions([]); return; }
    const results = getFuzzySuggestions(animeList, answer, settings.precision);
    setSuggestions(results);
  }, [answer, animeList, inputMode, settings.precision]);

  useEffect(() => {
    socket.off('round_start'); socket.off('round_reveal'); socket.off('game_over'); socket.off('vote_update'); socket.off('game_paused'); socket.off('game_resuming'); socket.off('update_players'); socket.off('player_left'); socket.off('error'); socket.off('update_game_state'); socket.off('phase_transition'); socket.off('game_state_sync');
    socket.off('game_cancelled'); socket.off('game:fallback_notification');

    socket.on('game_state_sync', (state: any) => {
        if (!state) return;
        setCurrentRound(state.currentRound);
        setTotalRounds(state.totalRounds);
        if (state.players) setPlayers(state.players.map((p: any) => ({ ...p, name: safePlayerName(p), score: p.score || 0 })));

        if (state.status === 'playing') {
            if (state.isIntro || state.currentRound === 0) {
                setPhase('loading');
                if (state.introData?.firstVideo) setNextVideoKey(state.introData.firstVideo);
                return;
            }

            if (state.roundData) {
                setCurrentSong({ videoKey: state.roundData.videoKey, videoStartTime: state.roundData.videoStartTime });
                setPhase('guessing');
                setNextVideoKey(null);
                const timeLeft = state.roundData.duration - state.roundData.elapsed;
                setPhaseEndTime(Date.now() + (timeLeft * 1000));
                setPhaseTotalDuration(state.roundData.duration);
                if (state.roundData.choices) {
                    setStoredQcmChoices(state.roundData.choices);
                    if (settings.responseType === 'qcm') { setInputMode('carre'); setChoices(state.roundData.choices); }
                }
                if (state.roundData.duo) setStoredDuoChoices(state.roundData.duo);
            } else if (state.revealData) {
                setPhase('revealed');
                setCurrentSong(state.revealData.song);
                setNextVideoKey(state.revealData.nextVideo);
                if (state.revealData.duration) {
                    setPhaseEndTime(Date.now() + (state.revealData.duration * 1000));
                    setPhaseTotalDuration(state.revealData.duration);
                }
            }
        }
    });

    socket.on('round_start', (data) => {
      setIsGamePaused(false);
      setPauseVotes(0);
      setIsPausePending(false);
      setHasVotedSkip(false);
      setSkipVotes(0); 
      
      setSubmittedAnswer(null); 
      setAnswer('');
      setProgress(100);
      setCurrentRound(data.round);
      setTotalRounds(data.totalRounds);
      
      if (data.choices) setStoredQcmChoices(data.choices);
      if (data.duo) setStoredDuoChoices(data.duo);

      if (settings.responseType === 'qcm') { setInputMode('carre'); setChoices(data.choices || []); }
      else setInputMode('typing');

      setPlayers(prev => prev.map(p => ({ ...p, currentAnswer: null, isCorrect: null })));
      setCurrentSong({ videoKey: data.videoKey, videoStartTime: data.videoStartTime || 0 });
      setPhaseEndTime(Date.now() + (data.duration * 1000));
      setPhaseTotalDuration(data.duration);
      setPhase('guessing');
    });

    socket.on('round_reveal', async (data: any) => {
      setPhase('revealed');
      setCurrentSong(data.song);
      setPhaseEndTime(Date.now() + (data.duration * 1000));
      setPhaseTotalDuration(data.duration);
      if (data.nextVideo) setNextVideoKey(data.nextVideo);
      
      setHasVotedSkip(false);
      
      const serverPlayers = data.players || [];
      let myPoints = 0;
      let myIsCorrect = false;

      setPlayers(prevPlayers => {
        return prevPlayers.map(localP => {
          const serverP = serverPlayers.find((sp: any) => String(sp.id) === String(localP.id));
          if (!serverP) return localP;
          
          if (String(localP.id) === String(socket.id)) {
              const diff = (serverP.score || 0) - (localP.score || 0);
              if (diff > 0) myPoints = diff;
              myIsCorrect = serverP.isCorrect || false;
          }
          return { ...localP, ...serverP, score: serverP.score, isCorrect: serverP.isCorrect };
        });
      });

      setGameHistory(prev => [...prev, { round: currentRound, song: data.song, isCorrect: myIsCorrect, points: myPoints }]);

      if (myPoints > 0) {
          setPointsEarned(myPoints);
          setShowPointsAnimation(true);
          setTimeout(() => setShowPointsAnimation(false), 3000);
      }
    });

    socket.on('update_players', (data: { players: any[] }) => { 
        setPlayers(prev => data.players.map((serverP: any) => {
                const localP = prev.find(p => String(p.id) === String(serverP.id));
                const name = safePlayerName(serverP);
                return { ...serverP, name, score: serverP.score };
        }));
    });

    socket.on('game_over', (data: any) => { setVictoryData(data.victoryData); setPhase('ended'); });
    socket.on('vote_update', (data: any) => { if(data.type==='pause') { setPauseVotes(data.count); setPauseRequired(data.required); setIsPausePending(data.isPending); } else { setSkipVotes(data.count); setSkipRequired(data.required); } });
    socket.on('game_paused', (data: any) => { setIsGamePaused(data.isPaused); if(data.isPaused) videoRef.current?.pause(); });
    socket.on('game_resuming', (data: any) => { if(data.duration) { setResumeCountdown(data.duration); let c = data.duration; const t = setInterval(()=>{ c--; if(c<=0) {clearInterval(t); setResumeCountdown(null);} setResumeCountdown(c); }, 1000); } });
    
    socket.on('game:fallback_notification', (data: { message: string }) => {
        toast.warning("Info Playlist", { 
            description: data.message,
            duration: 6000,
            icon: <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
        });
    });

    socket.on('game_cancelled', () => { toast.info("Partie annulée par l'hôte."); handleReturnToLobby(); });
    const onError = (err: { message: string }) => { toast.error(err.message || "Erreur"); };
    socket.on('error', onError);

    return () => { socket.off('round_start'); socket.off('round_reveal'); socket.off('game_over'); socket.off('vote_update'); socket.off('game_paused'); socket.off('game_resuming'); socket.off('update_players'); socket.off('player_left'); socket.off('error', onError); socket.off('game_state_sync'); socket.off('game_cancelled'); socket.off('game:fallback_notification'); };
  }, [roomId, settings, animeList, currentRound]); 

  useEffect(() => {
    if (phase === 'loading' || isGamePaused || phase === 'ended') return;
    const interval = setInterval(() => {
      const now = Date.now();
      const remainingMs = Math.max(0, phaseEndTime - now);
      setTimeLeft(Math.ceil(remainingMs / 1000));
      const totalMs = phaseTotalDuration * 1000;
      const pct = totalMs > 0 ? (remainingMs / totalMs) * 100 : 0;
      setProgress(pct);
    }, 100); 
    return () => clearInterval(interval);
  }, [phaseEndTime, phase, isGamePaused, phaseTotalDuration]);

  useEffect(() => {
    if (phase === 'loading') {
      const interval = setInterval(() => setLoadingCount(c => c > 0 ? c - 1 : 0), 1000);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const handleReturnToLobby = () => {
      isReturningToLobbyRef.current = true;
      navigate('/play', { replace: true, state: { returnToLobby: true, roomId: roomId } });
  };

  const handleReplay = () => {
      if (gameMode === 'solo') {
          setGameHistory([]);
          setPhase('loading');
          socket.emit('start_game', { roomId });
      } else {
          handleReturnToLobby();
      }
  };

  const handleAction = (val: string) => {
    if (phase === 'revealed') return;
    setSubmittedAnswer(val); setSuggestions([]);
    setPlayers(prev => prev.map(p => (String(p.id) === String(socket.id)) ? { ...p, currentAnswer: val } : p));
    socket.emit('game:answer', { roomId, answer: val, mode: inputMode });
    if (inputMode === 'typing') setAnswer('');
  };

  const commonProps = {
    phase, players, currentRound, totalRounds, timeLeft, progress,
    volume, isMuted, onVolumeChange: setVolume, onToggleMute: () => setIsMuted(!isMuted), videoRef, autoplayBlocked, onSafePlay: () => playVideoSafe(currentSong?.videoKey, 0),
    isGamePaused, isPausePending, pauseVotes, pauseRequired, resumeCountdown, onVotePause: () => socket.emit('vote_pause', { roomId }),
    skipVotes, skipRequired, onVoteSkip: () => socket.emit('vote_skip', { roomId }),
    currentSong, nextVideoKey, answer, setAnswer, submittedAnswer, suggestions, onAction: handleAction,
    myProfile, sidebarCollapsed, setSidebarCollapsed, onShowLeave: () => setShowLeaveDialog(true), onShowProfile: () => setShowProfileModal(true),
    currentUserId: socket.id || "", getVideoUrl, gameMode, roomId
  };

  if (phase === 'ended') return <GameOver players={players} currentUserId={socket.id||""} onLeave={handleReturnToLobby} onReplay={handleReplay} gameMode={gameMode} history={gameHistory} settings={settings} victoryData={victoryData} />;

  return (
    <>
      <Helmet><title>Partie en cours - AniQuizz</title></Helmet>
      
      {phase === 'loading' ? (
        <div className="absolute inset-0 z-40 bg-background flex flex-col items-center justify-center animate-fade-in gap-6">
            <div className="relative"><Loader2 className="h-20 w-20 text-primary animate-spin" /><div className="absolute inset-0 flex items-center justify-center"><span className="text-xs font-bold text-primary">{loadingCount > 0 ? loadingCount : "GO!"}</span></div></div>
            <div className="text-center space-y-2"><h2 className="text-3xl font-bold animate-pulse gradient-text">CHARGEMENT...</h2><p className="text-muted-foreground">Préparez vos écouteurs...</p></div>
            
            {amIHost ? (
               <Button variant="destructive" onClick={() => socket.emit('game:cancel', { roomId })} className="mt-8">Annuler la partie</Button>
            ) : (
               <Button variant="outline" onClick={handleReturnToLobby} className="mt-8 border-white/10 hover:bg-white/5">Quitter</Button>
            )}
        </div>
      ) : (
          isBattleRoyale ? (
            <BattleRoyaleGameLayout {...commonProps} videoRef={videoRef} isGulag={isGulag} survivorsCount={survivorsCount} brPhaseLabel={brPhaseLabel} currentDifficulty={currentDifficulty} myWatchedIds={myWatchedIds} />
          ) : (
            <StandardGameLayout {...commonProps} videoRef={videoRef} myWatchedIds={myWatchedIds} inputMode={inputMode} choices={choices} onSwitchCarre={() => { setInputMode('carre'); setChoices(storedQcmChoices); }} onSwitchDuo={() => { setInputMode('duo'); setChoices(storedDuoChoices); }} showPointsAnimation={showPointsAnimation} pointsEarned={pointsEarned} />
          )
      )}

      <GlobalSettingsModal open={showSettings} onOpenChange={setShowSettings} />
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}><DialogContent><DialogHeader><DialogTitle>Profil</DialogTitle><DialogDescription>Vos statistiques de jeu</DialogDescription></DialogHeader><div className="p-4">Stats...</div></DialogContent></Dialog>
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Quitter ?</AlertDialogTitle><AlertDialogDescription>La partie continue sans vous.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => { handleReturnToLobby(); setShowLeaveDialog(false); }} className="bg-destructive">Quitter</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}