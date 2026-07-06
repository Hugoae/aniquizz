import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { GameOver } from '@/features/game/components/GameOver';
import { StandardGameLayout } from '@/features/game/components/modes/standard/StandardGameLayout';
import { GlobalSettingsModal } from '@/features/settings/components/GlobalSettingsModal';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { socket } from '@/lib/socket';
import { useAuth } from '@/features/auth/context/AuthContext';
import { getFuzzySuggestions, type AnswerType } from '@aniquizz/shared';
import { getVideoUrl } from '@/lib/video';
import { useGameSocket } from '@/features/game/hooks/useGameSocket';

type InputMode = 'typing' | 'carre' | 'duo';

const INPUT_TO_ANSWER_TYPE: Record<InputMode, AnswerType> = {
  typing: 'typing',
  carre: 'qcm',
  duo: 'duo',
};

export default function Game() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const initialState = location.state || {};
  const roomId: string = initialState.roomId;
  const initialPlayers = initialState.players || [];
  const settings = initialState.settings || { gameType: 'standard' };
  const gameMode = initialState.mode === 'solo' || settings.maxPlayers === 1 ? 'solo' : 'multiplayer';

  const currentUserId = profile?.id ?? '';

  const { state, animeList, myWatchedIds, actions } = useGameSocket({
    roomId,
    currentUserId,
    initialPlayers,
    initialTotalRounds: settings.soundCount ?? 20,
    initialFirstVideo: initialState.gameData?.firstVideo ?? null,
    anilistUsername: profile?.anilistUsername,
    onCancelled: () => navigate('/play', { state: { returnToLobby: true, roomId }, replace: true }),
    onClosed: () => navigate('/play', { replace: true }),
  });

  const { phase, players, currentSong } = state;

  // --- Local UI state ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const volumeRef = useRef(20);
  const isMutedRef = useRef(false);

  const [answer, setAnswer] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>(
    settings.responseType === 'qcm' ? 'carre' : 'typing',
  );
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(100);

  const [volume, setVolume] = useState(20);
  const [isMuted, setIsMuted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [loadingCount, setLoadingCount] = useState(3);

  const myProfile = { username: profile?.username || 'Moi', avatar: profile?.avatar || 'player1' };
  const amIHost = players.find((p) => String(p.id) === currentUserId)?.isHost;

  const choices = inputMode === 'carre' ? state.qcmChoices : inputMode === 'duo' ? state.duoChoices : [];

  // --- Video playback ---
  const playVideoSafe = (videoKey: string | null | undefined, startTime = 0) => {
    if (!videoRef.current || !videoKey) return;
    videoRef.current.src = `${getVideoUrl(videoKey)}#t=${startTime}`;
    videoRef.current.load();
    videoRef.current.volume = isMutedRef.current ? 0 : volumeRef.current / 100;
    const playPromise = videoRef.current.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setAutoplayBlocked(false))
        .catch((e) => { if (e.name !== 'AbortError') setAutoplayBlocked(true); });
    }
  };

  useEffect(() => {
    volumeRef.current = volume;
    isMutedRef.current = isMuted;
    if (videoRef.current) videoRef.current.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  // Load the video ONCE per round (guessing), then let it keep playing through
  // reveal for continuity — never restart it when the phase flips to revealed.
  const loadedVideoKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!currentSong || !('videoKey' in currentSong)) return;
    if (loadedVideoKeyRef.current === currentSong.videoKey) return;
    loadedVideoKeyRef.current = currentSong.videoKey;
    playVideoSafe(currentSong.videoKey, currentSong.videoStartTime || 0);
  }, [currentSong]);

  useEffect(() => {
    if (state.isGamePaused) videoRef.current?.pause();
  }, [state.isGamePaused]);

  // --- New round: reset the input area ---
  useEffect(() => {
    if (phase !== 'guessing') return;
    setSubmittedAnswer(null);
    setAnswer('');
    setInputMode(settings.responseType === 'qcm' ? 'carre' : 'typing');
  }, [state.currentRound, phase, settings.responseType]);

  // --- Typing suggestions ---
  useEffect(() => {
    if (inputMode !== 'typing') { setSuggestions([]); return; }
    setSuggestions(getFuzzySuggestions(animeList, answer, settings.precision));
  }, [answer, animeList, inputMode, settings.precision]);

  // --- Points animation on reveal (once per round) ---
  const pointsShownForRoundRef = useRef<number>(0);
  useEffect(() => {
    if (phase !== 'revealed') return;
    if (pointsShownForRoundRef.current === state.currentRound) return;
    pointsShownForRoundRef.current = state.currentRound;

    const me = players.find((p) => String(p.id) === currentUserId);
    const pts = me?.roundPoints || 0;
    if (pts > 0) {
      setPointsEarned(pts);
      setShowPointsAnimation(true);
      const t = setTimeout(() => setShowPointsAnimation(false), 2000);
      return () => clearTimeout(t);
    }
  }, [phase, players, currentUserId, state.currentRound]);

  // Hide the points badge as soon as a new guessing round starts.
  useEffect(() => {
    if (phase === 'guessing') setShowPointsAnimation(false);
  }, [phase, state.currentRound]);

  // --- Authoritative countdown ---
  useEffect(() => {
    if (phase === 'loading' || phase === 'ended' || state.isGamePaused) return;
    const tick = () => {
      const remainingMs = Math.max(0, state.phaseEndsAt - Date.now());
      const totalMs = state.phaseDurationSeconds * 1000;
      const visibleMs = Math.min(remainingMs, totalMs);
      setTimeLeft(Math.ceil(visibleMs / 1000));
      setProgress(totalMs > 0 ? (visibleMs / totalMs) * 100 : 0);
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [phase, state.isGamePaused, state.phaseEndsAt, state.phaseDurationSeconds]);

  // --- Loading intro counter ---
  useEffect(() => {
    if (phase !== 'loading') return;
    setLoadingCount(3);
    const interval = setInterval(() => setLoadingCount((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, [phase]);

  // --- Navigation actions ---
  const handleReturnToLobby = () => {
    actions.returnToLobby();
    navigate('/play', { state: { returnToLobby: true, roomId }, replace: true });
  };
  const handleLeaveDefinitively = () => {
    socket.emit('leave_room', { roomId });
    navigate('/play', { replace: true });
  };
  const handleGoToProfile = () => {
    socket.emit('leave_room', { roomId });
    navigate('/profile', { replace: true });
  };
  const handleReplay = () => {
    if (gameMode === 'solo') socket.emit('start_game', { roomId });
    else handleReturnToLobby();
  };

  const handleAction = (val: string) => {
    if (!val) return;
    setSubmittedAnswer(val);
    setSuggestions([]);
    actions.answer(val, INPUT_TO_ANSWER_TYPE[inputMode]);
    if (inputMode === 'typing') setAnswer('');
  };

  const configBadges = useMemo(() => ({
    sourceLabel: settings.soundSelection === 'watched' ? 'Watched' : settings.playlist ? 'Playlist' : 'Aléatoire',
    difficultyLabel: Array.isArray(settings.difficulty) && settings.difficulty.length === 1
      ? settings.difficulty[0]
      : 'Varié',
    precisionLabel: settings.precision === 'franchise' ? 'Franchise' : 'Exact',
    modeLabel: 'Standard',
  }), [settings.soundSelection, settings.playlist, settings.difficulty, settings.precision]);

  if (phase === 'ended') {
    return (
      <GameOver
        players={players}
        currentUserId={currentUserId}
        onLeave={handleReturnToLobby}
        onReplay={handleReplay}
        victoryData={state.victoryData}
        history={state.roundHistory}
        settings={settings}
        gameMode={gameMode}
      />
    );
  }

  const commonProps = {
    phase, players, currentRound: state.currentRound, totalRounds: state.totalRounds, timeLeft, progress,
    volume, isMuted, onVolumeChange: setVolume, onToggleMute: () => setIsMuted(!isMuted),
    videoRef, autoplayBlocked,
    onSafePlay: () => {
      // Autoplay was blocked: resume the current video without reloading it.
      const el = videoRef.current;
      if (!el) return;
      el.play().then(() => setAutoplayBlocked(false)).catch(() => {});
    },
    isGamePaused: state.isGamePaused, isPausePending: state.isPausePending,
    pauseVotes: state.pauseVotes, pauseRequired: state.pauseRequired, resumeCountdown: state.resumeCountdown,
    onVotePause: actions.votePause,
    skipVotes: state.skipVotes, skipRequired: state.skipRequired, onVoteSkip: actions.voteSkip,
    currentSong, nextVideoKey: state.nextVideoKey, answer, setAnswer, submittedAnswer, suggestions,
    onAction: handleAction,
    myProfile, sidebarCollapsed, setSidebarCollapsed,
    onShowLeave: () => setShowLeaveDialog(true), onShowProfile: () => setShowProfileModal(true),
    currentUserId, getVideoUrl, gameMode, roomId, configBadges,
  };

  return (
    <>
      <Helmet><title>Partie en cours - AniQuizz</title></Helmet>

      {phase === 'loading' ? (
        <div className="absolute inset-0 z-40 bg-background flex flex-col items-center justify-center animate-fade-in gap-6">
          <div className="relative">
            <Loader2 className="h-20 w-20 text-primary animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{loadingCount > 0 ? loadingCount : 'GO!'}</span>
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold animate-pulse gradient-text">CHARGEMENT...</h2>
            <p className="text-muted-foreground">Préparez vos écouteurs...</p>
          </div>
          {amIHost ? (
            <Button variant="destructive" onClick={actions.cancel} className="mt-8">Annuler la partie</Button>
          ) : (
            <Button variant="outline" onClick={handleLeaveDefinitively} className="mt-8 border-white/10 hover:bg-white/5">Quitter</Button>
          )}
        </div>
      ) : (
        <StandardGameLayout
          {...commonProps}
          videoRef={videoRef}
          myWatchedIds={myWatchedIds}
          inputMode={inputMode}
          choices={choices}
          onSwitchCarre={() => settings.responseType === 'mix' && setInputMode('carre')}
          onSwitchDuo={() => settings.responseType === 'mix' && setInputMode('duo')}
          responseType={settings.responseType}
          showPointsAnimation={showPointsAnimation}
          pointsEarned={pointsEarned}
        />
      )}

      <GlobalSettingsModal open={showSettings} onOpenChange={setShowSettings} />

      <AlertDialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accéder au profil ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir quitter la partie pour aller sur votre Profil ?
              <br />
              {gameMode === 'solo' ? 'La partie sera annulée et le salon fermé.' : 'La partie continuera pour les autres joueurs.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { handleGoToProfile(); setShowProfileModal(false); }}>
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
              {gameMode === 'solo' ? 'La partie sera annulée et le salon fermé.' : 'La partie continue sans vous.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => { handleReturnToLobby(); setShowLeaveDialog(false); }} className="bg-primary">
              Retour au Lobby
            </AlertDialogAction>
            <Button variant="ghost" onClick={() => { handleLeaveDefinitively(); setShowLeaveDialog(false); }} className="text-destructive hover:bg-destructive/10">
              Quitter définitivement
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
