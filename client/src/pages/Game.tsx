import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';

// Icônes & UI
import { Send, Volume2, VolumeX, LogOut, Pause, Play, SkipForward, Grid2X2, Columns2, AlertCircle, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Composants Jeu
import { PlayerCard } from '@/components/game/PlayerCard';
import { SongInfoCard } from '@/components/game/SongInfoCard';
import { PointsBadge } from '@/components/game/PointsBadge';
import { GameSidebar } from '@/components/game/GameSidebar';
import { GameOver } from '@/components/game/GameOver'; 
import { GlobalSettingsModal } from '@/components/settings/GlobalSettingsModal';

// Services & Contextes
import { socket } from '@/services/socket';
import { useAuth } from '@/context/AuthContext';

// ------------------------------------------------------------------
// TYPES & INTERFACES
// ------------------------------------------------------------------

interface AnimeDataItem {
    name: string;
    franchise: string | null;
    altNames: string[];
}

interface ServerSong { 
  id: number; 
  anime: any; 
  displayAnswer?: string;
  title: string; 
  artist: string; 
  type: string; 
  videoKey: string;
  cover?: string;
  franchise?: string;
  siteUrl?: string;
  sourceUrl?: string;
  difficulty?: string;
  year?: number;
}

interface Player { 
    id: string | number; 
    name: string; 
    avatar: string; 
    score: number; 
    streak?: number; 
    foundTime?: number; 
    isCorrect?: boolean | null; 
    rank: number; 
    isHost?: boolean; 
    currentAnswer?: string | null; 
    isEliminated?: boolean; 
    isInGame?: boolean; 
}

interface GameSettings { 
    gameType: string; 
    responseType: 'typing' | 'qcm' | 'mix'; 
    soundCount: number; 
    guessDuration: number; 
    difficulty: string; 
    precision?: 'exact' | 'franchise'; 
}

interface RevealData {
  song: ServerSong;
  duration: number;
  startTime: number;
  players: Player[];
  nextVideo?: string | null;
  correctAnswer?: string;
}

interface RoundHistory {
    round: number;
    song: ServerSong;
    userAnswer: string | null;
    isCorrect: boolean;
    points: number;
}

// ------------------------------------------------------------------
// UTILITAIRES
// ------------------------------------------------------------------

// Normalise le nom des joueurs pour éviter les vides
const safePlayerName = (p: any) => {
    if (p.name && p.name.trim() !== "") return p.name;
    if (p.username && p.username.trim() !== "") return p.username;
    return `Joueur ${String(p.id).substring(0, 4)}`;
};

const SUPABASE_PROJECT_URL = "https://qjnfdhmvvledhtwwfrzb.supabase.co"; 
const BUCKET_NAME = "videos";

// Génère l'URL de la vidéo depuis Supabase Storage
const getVideoUrl = (key: string | undefined | null) => {
  if (!key) return "";
  if (key.startsWith('http')) return key;
  return `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${BUCKET_NAME}/${key}`;
};

// ------------------------------------------------------------------
// COMPOSANT PRINCIPAL
// ------------------------------------------------------------------

export default function Game() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setTheme, resolvedTheme } = useTheme();
  const { user, profile } = useAuth();

  // --- INITIALISATION DE L'ÉTAT ---
  const initialState = location.state || {};
  const roomId = initialState.roomId;
  const initialPlayers = initialState.players || [];
  
  const settings: GameSettings = initialState.settings || { 
      gameType: 'Standard', 
      responseType: 'mix', 
      soundCount: 10, 
      guessDuration: 15, 
      difficulty: 'medium',
      precision: 'franchise'
  };

  // Détection Mode Solo vs Multi
  const gameMode = (initialPlayers.length === 1 && initialState.mode !== 'multiplayer') ? 'solo' : 'multiplayer';
  
  // Données initiales (si envoyées par le lobby)
  const firstVideoKey = initialState.firstVideo || initialState.gameData?.firstVideo || "";
  const firstChoices = initialState.gameData?.firstChoices || []; 
  const firstDuoChoices = initialState.gameData?.firstDuoChoices || [];

  // --- REFS & STATES TECHNIQUES ---
  const [targetGameStart] = useState(() => initialState.gameStartTime || (Date.now() + 8000));
  const isReturningToLobbyRef = useRef(false); // Flag pour éviter le leave_room involontaire
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const volumeRef = useRef(50);
  const isMutedRef = useRef(false);

  // --- STATES JEU ---
  const [players, setPlayers] = useState<Player[]>(initialPlayers.map((p: any) => ({ ...p, name: safePlayerName(p), score: p.score || 0, isInGame: p.isInGame !== false })));
  const [phase, setPhase] = useState<'loading' | 'guessing' | 'revealed' | 'ended'>('loading');
  const [phaseStartTime, setPhaseStartTime] = useState<number>(0);
  const [phaseDuration, setPhaseDuration] = useState<number>(settings.guessDuration);
  const [progress, setProgress] = useState(100);

  const [myProfile, setMyProfile] = useState({ username: profile?.username || 'Moi', avatar: profile?.avatar || 'player1' });

  // Timers & Rounds
  const [loadingCount, setLoadingCount] = useState(() => {
    const remaining = Math.ceil((targetGameStart - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  });
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(settings.soundCount);
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Données Round Actuel
  const [currentSong, setCurrentSong] = useState<ServerSong | null>(null);
  const [nextVideoKey, setNextVideoKey] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  
  // Modes de réponse
  const [inputMode, setInputMode] = useState<'typing' | 'carre' | 'duo'>('typing');
  const [choices, setChoices] = useState<string[]>(firstChoices); 
  const [storedQcmChoices, setStoredQcmChoices] = useState<string[]>(firstChoices);
  const [storedDuoChoices, setStoredDuoChoices] = useState<string[]>(firstDuoChoices);
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);
  
  // Historique & Données Globales
  const [gameHistory, setGameHistory] = useState<RoundHistory[]>([]);
  const [animeList, setAnimeList] = useState<AnimeDataItem[]>([]);

  // États Pause & Skip
  const [isGamePaused, setIsGamePaused] = useState(false);
  const [isPausePending, setIsPausePending] = useState(false); 
  const [resumeCountdown, setResumeCountdown] = useState<number | null>(null);
  const [pauseVotes, setPauseVotes] = useState(0);
  const [pauseRequired, setPauseRequired] = useState(1);
  const [skipVotes, setSkipVotes] = useState(0);
  const [skipRequired, setSkipRequired] = useState(1);
  const [hasVotedPause, setHasVotedPause] = useState(false);
  const [hasVotedSkip, setHasVotedSkip] = useState(false);
  
  // UI States
  const [isLiked, setIsLiked] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isMuted, setIsMuted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // ------------------------------------------------------------------
  // GESTION VIDEO & AUDIO
  // ------------------------------------------------------------------
  
  const safePlayVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.volume = isMutedRef.current ? 0 : volumeRef.current / 100;
    const playPromise = videoRef.current.play();
    if (playPromise !== undefined) { 
        playPromise.then(() => setAutoplayBlocked(false))
        .catch((e) => { console.error("Autoplay bloqué:", e); setAutoplayBlocked(true); }); 
    }
  };

  useEffect(() => {
    volumeRef.current = volume; isMutedRef.current = isMuted;
    if (videoRef.current) videoRef.current.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  useEffect(() => {
    // Préchargement de la première vidéo
    if (videoRef.current && firstVideoKey && phase === 'loading') { 
        videoRef.current.src = getVideoUrl(firstVideoKey); 
        videoRef.current.load(); 
    }
  }, []);

  // ------------------------------------------------------------------
  // EFFETS SOCKET & JEU
  // ------------------------------------------------------------------

  // 1. Initialisation Profil & Liste Animes
  useEffect(() => {
    if (profile) setMyProfile({ username: profile.username, avatar: profile.avatar });
    else {
        if(socket.connected) socket.emit('get_profile');
        socket.on('user_profile', (data) => { if (data) setMyProfile(data); });
    }
    
    socket.emit('get_anime_list');
    socket.on('anime_list', (list: AnimeDataItem[]) => { setAnimeList(list); });
    
    return () => { socket.off('anime_list'); socket.off('user_profile'); }
  }, [profile]);

  // 2. Gestion de la déconnexion
  useEffect(() => {
      return () => {
        // En multi, si on ne retourne pas explicitement au lobby, on quitte la room
        if (roomId && !isReturningToLobbyRef.current) {
            socket.emit('leave_room', { roomId });
        }
        // Nettoyage des écouteurs
        socket.off('round_start'); socket.off('round_reveal'); socket.off('game_over'); socket.off('vote_update'); socket.off('game_paused'); socket.off('game_resuming'); socket.off('update_players'); socket.off('player_left');
      };
  }, []);

  // 3. Écouteurs Socket Principaux
  useEffect(() => {
    // Nettoyage préventif
    socket.off('round_start'); socket.off('round_reveal'); socket.off('game_over'); socket.off('vote_update'); socket.off('game_paused'); socket.off('game_resuming'); socket.off('update_players'); socket.off('player_left');

    const handlePlayerUpdate = (data: { players: any[] }) => { 
        setPlayers(data.players.map((p: any) => ({ ...p, name: safePlayerName(p), score: p.score || 0 }))); 
    };
    socket.on('update_players', handlePlayerUpdate);
    socket.on('player_left', handlePlayerUpdate);

    // --- DÉBUT DU ROUND ---
    socket.on('round_start', (data) => {
      setPhase('guessing'); setPhaseStartTime(data.startTime); setPhaseDuration(data.duration); setProgress(100);
      setCurrentRound(data.round); setTotalRounds(data.totalRounds); 
      setIsGamePaused(false); setIsPausePending(false); setResumeCountdown(null);
      setAnswer(''); setSuggestions([]); setSubmittedAnswer(null); setPointsEarned(null); setShowPointsAnimation(false); setHasVotedSkip(false); setIsLiked(false); setNextVideoKey(null);
      setSkipVotes(0);

      // Gestion des choix QCM/Duo stockés
      if (data.choices && Array.isArray(data.choices)) setStoredQcmChoices(data.choices);
      if (data.duo && Array.isArray(data.duo)) setStoredDuoChoices(data.duo);

      // Mode d'input
      if (settings.responseType === 'qcm') { setInputMode('carre'); setChoices(data.choices || []); }
      else if (settings.responseType === 'typing') { setInputMode('typing'); setChoices([]); }
      else { setInputMode('typing'); if (data.choices) setStoredQcmChoices(data.choices); }

      // Reset visuel joueurs
      setPlayers(prev => prev.map(p => ({ ...p, currentAnswer: null, isCorrect: null })));
      
      // Lancement Vidéo avec StartTime aléatoire
      const newVideoKey = data.song?.videoKey || data.videoKey || data.video; 
      if (videoRef.current && newVideoKey) {
        videoRef.current.pause(); 
        const startTime = data.videoStartTime || 0;
        const fullUrl = `${getVideoUrl(newVideoKey)}#t=${startTime}`;
        videoRef.current.src = fullUrl;
        videoRef.current.currentTime = startTime; // Force seek
        videoRef.current.load();
        safePlayVideo();
      }
    });

    // --- RÉVÉLATION (REVEAL) ---
    socket.on('round_reveal', async (data: RevealData) => {
      setPhase('revealed'); setPhaseStartTime(data.startTime); setPhaseDuration(data.duration); setProgress(100);
      setCurrentSong(data.song); setSuggestions([]);
      setSkipVotes(0); setHasVotedSkip(false);

      if (data.nextVideo) setNextVideoKey(data.nextVideo);
      if (videoRef.current && videoRef.current.paused) safePlayVideo();

      // Mise à jour historique & scores
      const serverPlayers = data.players || [];
      const myPlayer = serverPlayers.find((p: any) => String(p.id) === String(socket.id));
      
      setGameHistory(prevHistory => {
          const nextRoundNumber = prevHistory.length + 1;
          if (prevHistory.some(h => h.round === nextRoundNumber)) return prevHistory;
          if (myPlayer) {
            const points = (myPlayer as any).roundPoints || 0;
            return [...prevHistory, { round: nextRoundNumber, song: data.song, userAnswer: myPlayer.currentAnswer || "Pas de réponse", isCorrect: !!myPlayer.isCorrect, points: points }];
          }
          return prevHistory;
      });

      setPlayers(prevPlayers => {
        return prevPlayers.map(localP => {
          const serverP = serverPlayers.find((sp: any) => String(sp.id) === String(localP.id));
          if (!serverP) return localP;
          const updatedName = safePlayerName(serverP);
          if (String(localP.id) === String(socket.id)) {
            const pointsDiff = (serverP.score || 0) - (localP.score || 0);
            if (pointsDiff > 0) { setPointsEarned(pointsDiff); setShowPointsAnimation(true); }
          }
          return { ...localP, ...serverP, name: updatedName };
        });
      });
    });

    // --- AUTRES EVENTS ---
    socket.on('vote_update', (data: any) => {
      if (data.type === 'pause') { 
          setPauseVotes(data.count); setPauseRequired(data.required); 
          if (data.isPending !== undefined) setIsPausePending(data.isPending); 
      } else { 
          setSkipVotes(data.count); setSkipRequired(data.required); 
      }
    });

    socket.on('game_paused', (data: any) => {
      setIsGamePaused(data.isPaused);
      if (data.isPaused) { setHasVotedPause(false); setIsPausePending(false); videoRef.current?.pause(); }
      else { if (phase === 'guessing' || phase === 'revealed') safePlayVideo(); }
    });

    socket.on('game_resuming', (data: any) => {
      let count = data.duration; setResumeCountdown(count);
      const timer = setInterval(() => { count--; if (count <= 0) { clearInterval(timer); setResumeCountdown(null); return; } setResumeCountdown(count); }, 1000);
    });

    socket.on('game_over', (data: any) => { setPhase('ended'); });

    return () => { socket.off('round_start'); socket.off('round_reveal'); socket.off('game_over'); socket.off('vote_update'); socket.off('game_paused'); socket.off('game_resuming'); socket.off('update_players'); socket.off('player_left'); };
  }, []);

  // ------------------------------------------------------------------
  // GESTION UI & INTERACTION
  // ------------------------------------------------------------------

  // Autocomplete
  useEffect(() => {
    if (answer.length >= 2) {
      const searchLower = answer.toLowerCase();
      const precisionMode = settings.precision || 'franchise';
      
      const matchedObjects = animeList.filter(item => {
        if (item.name.toLowerCase().includes(searchLower)) return true;
        if (item.altNames.some(alt => alt.toLowerCase().includes(searchLower))) return true;
        if (item.franchise && item.franchise.toLowerCase().includes(searchLower)) return true;
        return false;
      });

      const mappedNames = matchedObjects.map(item => {
          if (precisionMode === 'franchise') return item.franchise || item.name; 
          return item.name;
      });

      const uniqueSuggestions = Array.from(new Set(mappedNames)).slice(0, 5);
      setSuggestions(uniqueSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [answer, animeList, settings.precision]);

  // Timer Progress Bar
  useEffect(() => {
    if (phase === 'loading' || isGamePaused || resumeCountdown !== null || phase === 'ended') return;
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = (now - phaseStartTime) / 1000;
      const totalDuration = phaseDuration || 1;
      const remaining = Math.max(0, Math.ceil(totalDuration - elapsedSeconds));
      setTimeLeft(remaining);
      const pct = Math.max(0, Math.min(100, ((totalDuration - elapsedSeconds) / totalDuration) * 100));
      setProgress(pct);
    }, 100); 
    return () => clearInterval(interval);
  }, [phaseStartTime, phase, isGamePaused, resumeCountdown, phaseDuration]);

  // Loading Timer (Intro)
  useEffect(() => {
    if (phase === 'loading') {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.ceil((targetGameStart - now) / 1000);
        if (remaining <= 0) { setLoadingCount(0); clearInterval(interval); } else { setLoadingCount(remaining); }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [phase, targetGameStart]);

  // --- ACTIONS JOUEUR ---

  const handleAction = (val: string) => {
    if (phase === 'revealed') return;
    
    // Mise à jour locale optimiste
    setSubmittedAnswer(val);
    setSuggestions([]);
    setPlayers(prev => prev.map(p => (String(p.id) === String(socket.id)) ? { ...p, currentAnswer: val } : p));
    
    socket.emit('submit_answer', { roomId, answer: val, mode: inputMode });
    
    if (inputMode === 'typing') setAnswer('');
  };

  const handleSuggestionClick = (suggestion: string) => { setAnswer(suggestion); handleAction(suggestion); };
  const handleSwitchToCarre = () => { setInputMode('carre'); setChoices(storedQcmChoices); };
  const handleSwitchToDuo = () => { setInputMode('duo'); setChoices(storedDuoChoices); };
  const handleVotePause = () => { setHasVotedPause(v => !v); socket.emit('vote_pause', { roomId }); };
  
  const handleVoteSkip = () => { 
      if(phase === 'revealed') {
          setHasVotedSkip(v => !v); 
          socket.emit('vote_skip', { roomId }); 
      }
  };

  const handleReturnToLobby = () => {
      isReturningToLobbyRef.current = true;
      if (gameMode === 'solo') { 
          socket.emit('leave_room', { roomId });
          navigate('/play', { replace: true, state: {} }); 
      } else { 
          navigate('/play', { replace: true, state: { returnToLobby: true, roomId: roomId } }); 
      }
  };

  const handleReplay = () => {
      // Rejouer en solo = recréer une room
      isReturningToLobbyRef.current = true;
      const soloRoomPayload = {
        roomName: "Solo-" + Date.now(), username: profile?.username || "Joueur Solo", avatar: profile?.avatar || "player1", userId: user?.id,
        settings: { ...settings, isPrivate: true, maxPlayers: 1, password: "" }
      };
      socket.emit('create_room', soloRoomPayload); navigate('/play'); 
  };

  // --- RENDER INPUT AREA ---
  const renderInputArea = () => {
    if (phase !== 'guessing') {
      return (
        <div className="glass-card p-4 flex items-center justify-between w-full animate-scale-in border border-white/10">
          <div className="text-left">
            <h3 className="text-xl font-bold mb-1 text-primary">{currentSong?.displayAnswer || currentSong?.anime}</h3>
            <p className="text-sm text-muted-foreground">{currentSong?.title} - {currentSong?.artist}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center w-full gap-4 relative">
        {submittedAnswer && ( <div className="animate-fade-in mb-2 px-4 py-1.5 bg-primary/20 border border-primary/30 rounded-full flex items-center gap-2 backdrop-blur-sm shadow-lg"><span className="text-xs text-primary-foreground/70 uppercase font-bold">Votre réponse :</span><span className="text-sm font-bold text-white">{submittedAnswer}</span></div> )}
        {settings.responseType === 'mix' && inputMode === 'typing' && !submittedAnswer && ( <div className="flex gap-4 mb-2 animate-fade-in"><Button variant="secondary" size="sm" onClick={handleSwitchToCarre} className="gap-2 hover:bg-primary/20 hover:text-primary transition-all"><Grid2X2 className="h-4 w-4" /> Carré (2 pts)</Button><Button variant="secondary" size="sm" onClick={handleSwitchToDuo} className="gap-2 hover:bg-primary/20 hover:text-primary transition-all"><Columns2 className="h-4 w-4" /> Duo (1 pt)</Button></div> )}
        {inputMode === 'typing' && (
          <div className="flex gap-3 items-center w-full animate-slide-up relative z-50">
            {suggestions.length > 0 && ( <div className="absolute bottom-full mb-2 left-0 w-full bg-card border border-primary/20 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-60 overflow-y-auto">{suggestions.map((suggestion, idx) => ( <button key={idx} className="text-left px-4 py-3 hover:bg-primary/20 hover:text-primary transition-colors text-sm font-medium border-b border-white/5 last:border-0" onClick={() => handleSuggestionClick(suggestion)}>{suggestion}</button> ))}</div> )}
            <div className="relative flex-1"><Input ref={inputRef} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={submittedAnswer ? "Changer votre réponse..." : (settings.precision === 'franchise' ? "Nom de la franchise..." : "Nom de l'anime exact...")} className={cn("h-14 text-lg bg-card/50 backdrop-blur-sm pl-4 border-primary/20 focus-visible:ring-primary/50", submittedAnswer && "border-primary/50 bg-primary/5")} onKeyDown={(e) => e.key === 'Enter' && handleAction(answer)} autoFocus /></div>
            <div className="flex items-center gap-2"><span className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded">+5 pts</span><Button variant="glow" size="lg" onClick={() => handleAction(answer)} disabled={!answer} className="h-14 w-14 p-0 rounded-xl"><Send className="h-5 w-5" /></Button></div>
          </div>
        )}
        {inputMode !== 'typing' && ( <div className={cn("grid gap-4 w-full animate-slide-up", inputMode === 'carre' ? "grid-cols-2" : "grid-cols-2")}>{choices.map((choice, idx) => ( <Button key={idx} variant="outline" className={cn("h-20 text-lg font-semibold border-2 transition-all whitespace-normal", submittedAnswer === choice ? "bg-primary text-white border-primary shadow-lg hover:bg-primary hover:text-white" : "hover:bg-primary/10 hover:border-primary/50")} onClick={() => handleAction(choice)}>{choice}</Button> ))}</div> )}
      </div>
    );
  };

  // --- RENDER FIN DE PARTIE ---
  if (phase === 'ended') { return ( <GameOver players={players} currentUserId={socket.id || ""} onLeave={handleReturnToLobby} onReplay={handleReplay} gameMode={gameMode} history={gameHistory} settings={settings} /> ); }

  // --- RENDER PRINCIPAL ---
  return (
    <>
      <Helmet><title>Partie en cours - AniQuizz</title></Helmet>
      {nextVideoKey && ( <div style={{ display: 'none' }}> <video src={getVideoUrl(nextVideoKey)} preload="auto" /> </div> )}
      
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* HEADER */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 shrink-0 justify-between relative z-50">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowLeaveDialog(true)} className="gap-2 text-muted-foreground hover:text-destructive"><LogOut className="h-4 w-4" /><span className="hidden md:inline">Quitter</span></Button>
            
            <Button 
                variant={(isGamePaused || isPausePending) ? "secondary" : "outline"} 
                size="sm" 
                onClick={handleVotePause}
                className={cn(
                    "gap-2 ml-2 transition-all duration-300",
                    isGamePaused && "bg-yellow-500 hover:bg-yellow-600 text-black border-none",
                    isPausePending && !isGamePaused && "bg-orange-500/90 hover:bg-orange-600 animate-pulse border-none text-white"
                )}
            >
                {isGamePaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />} 
                {isGamePaused ? "Reprendre" : (isPausePending ? "Pause (Fin round)" : "Pause")} 
                {players.length > 1 && ( <span className="text-xs opacity-70 ml-1">({pauseVotes}/{pauseRequired})</span> )}
            </Button>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-1"><span className="font-bold gradient-text text-lg">AniQuizz</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary uppercase font-bold tracking-wider">{settings.gameType}</span></div>
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground w-64">{phase === 'loading' ? ( <span className="animate-pulse">Synchronisation...</span> ) : ( <> <span className="whitespace-nowrap">Round {currentRound}/{totalRounds}</span> <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden"> <div className="h-full bg-gradient-primary transition-all duration-1000" style={{ width: `${(currentRound / totalRounds) * 100}%` }} /> </div> </> )}</div>
          </div>
          <div className="flex items-center gap-2"><Button variant="ghost" className="flex items-center gap-3 pl-2 pr-4 py-1 h-auto rounded-full hover:bg-white/5 border border-transparent hover:border-white/10 transition-all" onClick={() => navigate('/profile')}><Avatar className="h-8 w-8 border border-primary/20"><AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${myProfile.avatar}`} /><AvatarFallback>{myProfile.username[0]}</AvatarFallback></Avatar><span className="font-semibold text-sm hidden sm:block">{myProfile.username}</span></Button></div>
        </header>

        {/* MAIN GAME AREA */}
        <main className="flex-1 flex overflow-hidden min-h-0">
          <div className="flex-1 flex flex-col items-center p-4 overflow-y-auto scrollbar-hide">
            {phase === 'loading' && ( <div className="absolute inset-0 z-40 bg-background flex flex-col items-center justify-center animate-fade-in gap-6"><div className="relative"><Loader2 className="h-20 w-20 text-primary animate-spin" /><div className="absolute inset-0 flex items-center justify-center"><span className="text-xs font-bold text-primary">{loadingCount > 0 ? `${loadingCount}s` : "GO!"}</span></div></div><div className="text-center space-y-2"><h2 className="text-3xl font-bold tracking-widest animate-pulse gradient-text">{loadingCount > 0 ? "LA PARTIE VA COMMENCER" : "LANCEMENT..."}</h2><p className="text-muted-foreground">Préparez vos écouteurs...</p></div></div> )}
            
            <div className="w-full max-w-[750px] flex flex-col items-center relative animate-fade-in">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-border shadow-2xl group shrink-0 mt-2 mb-6">
                {autoplayBlocked && phase === 'guessing' && ( <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"><Button onClick={safePlayVideo} variant="glow" size="lg" className="gap-2 animate-bounce"><AlertCircle className="h-5 w-5" /> Cliquer pour activer le son</Button></div> )}
                {isGamePaused && ( <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"><Pause className="h-16 w-16 text-white mb-4" /><h3 className="text-2xl font-bold text-white mb-2">PARTIE EN PAUSE</h3><p className="text-white/70">En attente des joueurs ({pauseVotes}/{pauseRequired})...</p></div> )}
                {resumeCountdown !== null && resumeCountdown > 0 && ( <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"><span className="text-9xl font-bold text-white animate-pulse">{resumeCountdown}</span></div> )}
                
                <div className="absolute top-4 right-4 z-50 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"><div className="flex items-center bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/10"><Button variant="ghost" size="icon" onClick={() => setIsMuted(!isMuted)} className="h-8 w-8 rounded-full hover:bg-white/10 text-white">{isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</Button><Slider value={[isMuted ? 0 : volume]} onValueChange={([v]) => { setVolume(v); setIsMuted(v === 0); }} max={100} className="w-20 mr-3" /></div></div>
                
                {phase === 'revealed' && ( <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10"><div className="w-2 h-2 rounded-full bg-primary animate-pulse" /><span className="font-mono font-bold text-white">{timeLeft}s</span></div> )}
                
                <div className={cn("absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-card/95 to-background/95 z-10 transition-opacity duration-500", phase === 'revealed' ? "opacity-0 pointer-events-none" : "opacity-100")}><div className="relative"><svg className="w-28 h-28 -rotate-90"><circle cx="50%" cy="50%" r="45%" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" /><circle cx="50%" cy="50%" r="45%" fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={(100 - progress) * -1} className="transition-[stroke-dashoffset] duration-200 ease-linear" /></svg><div className="absolute inset-0 flex items-center justify-center flex-col"><span className={cn("text-4xl font-bold tabular-nums", timeLeft <= 5 ? "text-destructive" : "text-foreground")}>{timeLeft}</span></div></div><p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse">Écoutez bien...</p></div>
                
                <video ref={videoRef} playsInline preload="auto" className={cn("w-full h-full object-cover transition-opacity duration-500", phase === 'revealed' ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")} />
                
                {phase === 'revealed' && ( 
                    <div className="absolute bottom-4 right-4 z-30">
                        <Button variant="default" onClick={handleVoteSkip} className="gap-2 shadow-lg shadow-purple-500/20">
                            <SkipForward className="h-4 w-4" /> 
                            Suivant {players.length > 1 && ` (${skipVotes}/${skipRequired})`}
                        </Button>
                    </div> 
                )}
              </div>
              
              <div className="hidden xl:block absolute left-[calc(100%+20px)] top-0 mt-2">
                  <SongInfoCard 
                      animeName={currentSong?.displayAnswer || currentSong?.anime} 
                      songTitle={currentSong?.title} 
                      artist={currentSong?.artist} 
                      type={currentSong?.type} 
                      difficulty={currentSong?.difficulty} 
                      franchise={currentSong?.franchise} 
                      year={currentSong?.year} 
                      coverImage={currentSong?.cover} 
                      siteUrl={currentSong?.siteUrl} 
                      sourceUrl={currentSong?.sourceUrl} 
                      isRevealed={phase === 'revealed'} 
                  />
              </div>

              {isPausePending && !isGamePaused && ( <div className="w-full max-w-[750px] mb-4 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 flex items-center justify-center gap-3 animate-pulse"><Clock className="h-5 w-5 text-orange-500" /><span className="text-orange-500 font-bold">Le jeu se mettra en pause à la fin de ce round !</span></div> )}
              
              {phase !== 'loading' && ( <div className={cn("w-full flex justify-center shrink-0 min-h-[80px] z-50", phase === 'revealed' ? "mb-32" : "mb-6")}>{renderInputArea()}</div> )}
              
              <div className="w-full"><div className="grid grid-cols-2 md:grid-cols-4 gap-3 justify-items-center">{players.map(p => ( <div key={p.id} className="relative w-full max-w-[220px]">{phase === 'revealed' && ( <div className="absolute -top-12 left-0 right-0 flex justify-center z-10"><div className={cn("px-3 py-1.5 rounded-xl text-xs font-bold shadow-xl animate-bounce whitespace-nowrap border-2 bg-background", p.isCorrect ? "bg-success text-success-foreground border-success-foreground/20" : "bg-destructive text-destructive-foreground border-destructive-foreground/20")}>{p.currentAnswer || "..."}</div></div> )} <PlayerCard player={p} isCurrentUser={String(p.id) === String(socket.id)} showResult={phase === 'revealed'} gameMode={'standard'} compact /> {(String(p.id) === String(socket.id)) && showPointsAnimation && pointsEarned && ( <div className="absolute -top-4 -right-2 animate-fade-in z-20"><PointsBadge points={pointsEarned} /></div> )} </div> ))}</div></div>
            </div>
          </div>
          
          {gameMode !== 'solo' && ( <GameSidebar players={players as any} isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} roomId={roomId} /> )}
        </main>
      </div>
      
      <GlobalSettingsModal open={showSettings} onOpenChange={setShowSettings} />
      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}><DialogContent><DialogHeader><DialogTitle>Profil</DialogTitle><DialogDescription>Vos statistiques de jeu</DialogDescription></DialogHeader><div className="p-4">Stats...</div></DialogContent></Dialog>
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Quitter ?</AlertDialogTitle><AlertDialogDescription>Progression perdue.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => { handleReturnToLobby(); setShowLeaveDialog(false); }} className="bg-destructive">Quitter</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
}