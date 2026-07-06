import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { GameOver } from '@/features/game/components/GameOver';
import { StandardGameLayout } from '@/features/game/components/modes/standard/StandardGameLayout';

import { GlobalSettingsModal } from '@/features/settings/components/GlobalSettingsModal';
import { 
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, 
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle 
} from '@/components/ui/alert-dialog';

import { socket } from '@/lib/socket';
import { useAuth } from '@/features/auth/context/AuthContext';
import { getFuzzySuggestions } from '@aniquizz/shared';
import { getVideoUrl } from '@/lib/video';

export default function Game() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const initialState = location.state || {};
  const roomId = initialState.roomId;
  
  const initialPlayers = initialState.players || [];
  
  const settings = initialState.settings || { gameType: 'standard' };
  
  const gameMode = (initialState.mode === 'solo' || settings.maxPlayers === 1) ? 'solo' : 'multiplayer';
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const volumeRef = useRef(20);
  const isMutedRef = useRef(false);

  const [players, setPlayers] = useState<any[]>(initialPlayers);
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
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
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
      const onMyWatchedList = (ids: number[]) => { setMyWatchedIds(ids); };
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

  // ✅ CORRECTION MAJEURE ICI : Définition des handlers pour nettoyage ciblé
  useEffect(() => {
    
    // --- Définition des handlers ---

    const onGameStateSync = (state: any) => {
        if (!state) return;
        setCurrentRound(state.currentRound);
        setTotalRounds(state.totalRounds);
        if (state.players) setPlayers(state.players);
        
        // Sync Historique
        if (state.history) setGameHistory(state.history);

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
                
                const totalDurationWithBuffer = state.roundData.duration + (state.roundData.startBuffer ? state.roundData.startBuffer / 1000 : 0);
                const timeLeftReal = totalDurationWithBuffer - state.roundData.elapsed;
                
                setPhaseEndTime(Date.now() + (timeLeftReal * 1000));
                setPhaseTotalDuration(state.roundData.duration);
                
                if (state.roundData.choices) {
                    setStoredQcmChoices(state.roundData.choices);
                    if (settings.responseType === 'qcm') { setInputMode('carre'); setChoices(state.roundData.choices); }
                }
                if (state.roundData.duo) {
                    setStoredDuoChoices(state.roundData.duo);
                }
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
    };

    const onRoundStart = (data: any) => {
      setIsGamePaused(false);
      setPauseVotes(0);
      setIsPausePending(false);
      setHasVotedSkip(false);
      setSkipVotes(0); 
      setSubmittedAnswer(null); setAnswer('');
      setProgress(100); setCurrentRound(data.round); setTotalRounds(data.totalRounds);
      
      // Sync history
      if (data.history) {
          setGameHistory(data.history);
      }
      
      if (data.choices) setStoredQcmChoices(data.choices);
      if (data.duo) setStoredDuoChoices(data.duo);

      if (settings.responseType === 'qcm') { setInputMode('carre'); setChoices(data.choices); }
      else setInputMode('typing');

      setPlayers(prev => prev.map(p => ({ ...p, currentAnswer: null, isCorrect: null })));
      
      setCurrentSong({ videoKey: data.videoKey, videoStartTime: data.videoStartTime || 0 });
      
      const bufferMs = data.startBuffer || 0;
      setPhaseEndTime(Date.now() + (data.duration * 1000) + bufferMs);
      setPhaseTotalDuration(data.duration);
      
      setPhase('guessing');
    };

    const onRoundReveal = async (data: any) => {
      setPhase('revealed');
      setCurrentSong(data.song);
      setPhaseEndTime(Date.now() + (data.duration * 1000));
      setPhaseTotalDuration(data.duration);
      
      if (data.nextVideo) setNextVideoKey(data.nextVideo);
      setHasVotedSkip(false);
      
      const serverPlayers = data.players || [];
      setPlayers(serverPlayers);

      const myPlayer = serverPlayers.find((p: any) => String(p.id) === String(socket.id));
      const myPoints = myPlayer?.roundPoints || 0;
      const myIsCorrect = myPlayer?.isCorrect || false;

      setGameHistory(prev => [...prev, { round: currentRound, song: data.song, isCorrect: myIsCorrect, points: myPoints }]);
      
      if (myPoints > 0) { 
          setPointsEarned(myPoints); 
          setShowPointsAnimation(true); 
          setTimeout(() => setShowPointsAnimation(false), 3000); 
      }
    };

    const onUpdatePlayers = (data: { players: any[] }) => { 
        setPlayers(data.players);
    };

    const onGameOver = (data: any) => { setVictoryData(data.victoryData); setPhase('ended'); };
    
    const onVoteUpdate = (data: any) => { 
        if(data.type==='pause') { 
            setPauseVotes(data.count); setPauseRequired(data.required); setIsPausePending(data.isPending); 
        } else { 
            setSkipVotes(data.count); setSkipRequired(data.required); 
        } 
    };

    const onGamePaused = (data: any) => { 
        setIsGamePaused(data.isPaused); 
        if(data.isPaused) videoRef.current?.pause(); 
    };

    const onGameResuming = (data: any) => { 
        if(data.duration) { 
            setResumeCountdown(data.duration); 
            let c = data.duration; 
            const t = setInterval(()=>{ 
                c--; 
                if(c<=0) {clearInterval(t); setResumeCountdown(null);} 
                else setResumeCountdown(c); 
            }, 1000); 
        } 
    };
    
    const onFallbackNotification = (data: { message: string }) => {
        toast.warning("Info Playlist", { description: data.message, duration: 6000, icon: <Loader2 className="h-5 w-5 text-orange-500 animate-spin" /> });
    };

    const onGameCancelled = () => { 
        toast.info("Partie annulée par l'hôte."); 
        navigate('/play', { state: { returnToLobby: true, roomId }, replace: true });
    };
    
    const onError = (err: { message: string }) => { toast.error(err.message || "Erreur"); };
    
    const onPlayerLeft = (data: any) => { /* Gérer si besoin */ };

    // --- Enregistrement ---
    socket.on('game_state_sync', onGameStateSync);
    socket.on('round_start', onRoundStart);
    socket.on('round_reveal', onRoundReveal);
    socket.on('update_players', onUpdatePlayers);
    socket.on('game_over', onGameOver);
    socket.on('vote_update', onVoteUpdate);
    socket.on('game_paused', onGamePaused);
    socket.on('game_resuming', onGameResuming);
    socket.on('game:fallback_notification', onFallbackNotification);
    socket.on('game_cancelled', onGameCancelled);
    socket.on('error', onError);
    socket.on('player_left', onPlayerLeft);

    // --- Nettoyage CHIRURGICAL ---
    return () => { 
        socket.off('game_state_sync', onGameStateSync);
        socket.off('round_start', onRoundStart);
        socket.off('round_reveal', onRoundReveal);
        socket.off('update_players', onUpdatePlayers);
        socket.off('game_over', onGameOver);
        socket.off('vote_update', onVoteUpdate);
        socket.off('game_paused', onGamePaused);
        socket.off('game_resuming', onGameResuming);
        socket.off('game:fallback_notification', onFallbackNotification);
        socket.off('game_cancelled', onGameCancelled);
        socket.off('error', onError);
        socket.off('player_left', onPlayerLeft);
    };
  }, [roomId, settings, animeList, currentRound]);

  useEffect(() => {
    if (phase === 'loading' || isGamePaused || phase === 'ended') return;
    const interval = setInterval(() => {
      const now = Date.now();
      const remainingTotalMs = Math.max(0, phaseEndTime - now); 
      const guessTotalMs = phaseTotalDuration * 1000;
      const visualRemainingMs = Math.min(remainingTotalMs, guessTotalMs);
      setTimeLeft(Math.ceil(visualRemainingMs / 1000));
      const pct = guessTotalMs > 0 ? (visualRemainingMs / guessTotalMs) * 100 : 0;
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
      socket.emit('game:return_to_lobby', { roomId });
      navigate('/play', { state: { returnToLobby: true, roomId }, replace: true });
  };

  const handleLeaveDefinitively = () => {
      socket.emit('leave_room', { roomId });
      navigate('/play', { replace: true });
  }

  const handleGoToProfile = () => {
      socket.emit('leave_room', { roomId });
      navigate('/profile', { replace: true });
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
    setSubmittedAnswer(val); setSuggestions([]);
    setPlayers(prev => prev.map(p => (String(p.id) === String(socket.id)) ? { ...p, currentAnswer: val } : p));
    socket.emit('game:answer', { roomId, answer: val, mode: inputMode });
    if (inputMode === 'typing') setAnswer('');
  };

  const getConfigBadges = () => {
      return { 
          sourceLabel: "Playlist", 
          difficultyLabel: "Moyen", 
          precisionLabel: "Exact", 
          modeLabel: 'Standard' 
      };
  };

  const configBadges = getConfigBadges();

  const commonProps = {
    phase, players, currentRound, totalRounds, timeLeft, progress,
    volume, isMuted, onVolumeChange: setVolume, onToggleMute: () => setIsMuted(!isMuted), videoRef, autoplayBlocked, onSafePlay: () => playVideoSafe(currentSong?.videoKey, 0),
    isGamePaused, isPausePending, pauseVotes, pauseRequired, resumeCountdown, onVotePause: () => socket.emit('vote_pause', { roomId }),
    skipVotes, skipRequired, onVoteSkip: () => socket.emit('vote_skip', { roomId }),
    currentSong, nextVideoKey, answer, setAnswer, submittedAnswer, suggestions, onAction: handleAction,
    myProfile, sidebarCollapsed, setSidebarCollapsed, onShowLeave: () => setShowLeaveDialog(true), onShowProfile: () => setShowProfileModal(true),
    currentUserId: socket.id || "", getVideoUrl, gameMode, roomId,
    configBadges
  };

  if (phase === 'ended') {
      return <GameOver players={players} currentUserId={socket.id || ""} onLeave={handleReturnToLobby} onReplay={handleReplay} victoryData={victoryData} />;
  }

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
               <Button variant="outline" onClick={handleLeaveDefinitively} className="mt-8 border-white/10 hover:bg-white/5">Quitter</Button>
            )}
        </div>
      ) : (
            <StandardGameLayout {...commonProps} videoRef={videoRef} myWatchedIds={myWatchedIds} inputMode={inputMode} choices={choices} onSwitchCarre={() => { setInputMode('carre'); setChoices(storedQcmChoices); }} onSwitchDuo={() => { setInputMode('duo'); setChoices(storedDuoChoices); }} showPointsAnimation={showPointsAnimation} pointsEarned={pointsEarned} />
      )}
      
      <GlobalSettingsModal open={showSettings} onOpenChange={setShowSettings} />
      
      <AlertDialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accéder au profil ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir quitter la partie pour aller sur votre Profil ?
              <br/>
              {gameMode === 'solo' 
                ? "La partie sera annulée et le salon fermé." 
                : "La partie continuera pour les autres joueurs."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
                handleGoToProfile();
                setShowProfileModal(false);
            }}>
              Oui, voir mon profil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter la partie ?</AlertDialogTitle>
            <AlertDialogDescription>
                {gameMode === 'solo' ? "La partie sera annulée et le salon fermé." : "La partie continue sans vous."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { 
                handleReturnToLobby(); 
                setShowLeaveDialog(false); 
            }} className="bg-primary">
                Retour au Lobby
            </AlertDialogAction>
             <Button variant="ghost" onClick={() => {
                handleLeaveDefinitively();
                setShowLeaveDialog(false);
            }} className="text-destructive hover:bg-destructive/10">
                Quitter définitivement
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}