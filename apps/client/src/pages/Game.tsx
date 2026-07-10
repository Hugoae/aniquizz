/**
 * In-match page shell — UI only; all wire protocol lives in useGameSocket + gameReducer.
 *
 * Responsibilities: video playback, answer input, leave/pause dialogs, settings modal,
 * and delegating layout/game-over to StandardGameLayout / StandardGameOver.
 * Player identity is always user.id (JWT), never socket.id.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SeoHead } from '@/components/seo/SeoHead';
import { PAGE_TITLES } from '@/lib/site';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { StandardGameOver } from '@/features/game/components/modes/standard/StandardGameOver';
import { StandardGameLayout } from '@/features/game/components/modes/standard/StandardGameLayout';
import { GlobalSettingsModal } from '@/features/settings/components/GlobalSettingsModal';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { socket } from '@/lib/socket';
import { useAuth } from '@/features/auth/context/AuthContext';
import { GAME_CONFIG, type AnswerType, type GamePlayer, type RoomSettings, isBanSanctionReason, getPrecisionChipLabel, normalizePrecision, normalizeVideoMode } from '@aniquizz/shared';
import { useGameSocket } from '@/features/game/hooks/useGameSocket';
import { useAnimeSearch } from '@/features/game/hooks/useAnimeSearch';
import { useVideoPlayback } from '@/features/game/hooks/useVideoPlayback';
import { parseGameNavState } from '@/features/game/gameNavState';

type InputMode = 'typing' | 'carre' | 'duo';
type GameMode = 'solo' | 'multiplayer';

const INPUT_TO_ANSWER_TYPE: Record<InputMode, AnswerType> = {
  typing: 'typing',
  carre: 'qcm',
  duo: 'duo',
};

export default function Game() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const initialState = parseGameNavState(location.state);
  const roomId = initialState.roomId ?? '';
  const initialPlayers = initialState.players ?? [];
  const settings: Partial<RoomSettings> = initialState.settings ?? { gameType: 'standard' };
  const gameMode: GameMode = initialState.mode === 'solo' || settings.maxPlayers === 1 ? 'solo' : 'multiplayer';

  const currentUserId = profile?.id ?? '';

  const { state, myWatchedIds, actions } = useGameSocket({
    roomId,
    currentUserId,
    initialPlayers,
    initialTotalRounds: settings.soundCount ?? 20,
    initialFirstVideo: initialState.gameData?.firstVideo ?? null,
    initialVideoMode: normalizeVideoMode(settings.videoMode),
    anilistUsername: profile?.anilistUsername,
    onCancelled: () => navigate('/play', { state: { returnToLobby: true, roomId }, replace: true }),
    onClosed: (reason) => {
      if (isBanSanctionReason(reason)) {
        navigate('/', { replace: true });
        return;
      }
      navigate('/play', { replace: true });
    },
  });

  const { phase, players, currentSong } = state;

  // Video element lifecycle (load per round, volume, pause, autoplay recovery).
  const { videoRef, preloadRef, warmVideo, volume, setVolume, isMuted, toggleMute, autoplayBlocked, resumeCurrent } =
    useVideoPlayback({ currentSong, phase, isGamePaused: state.isGamePaused });

  // --- Local UI state ---
  const [answer, setAnswer] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>(
    settings.responseType === 'qcm' ? 'carre' : 'typing',
  );
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);

  const suggestions = useAnimeSearch({
    query: answer,
    precision: normalizePrecision(settings.precision),
    enabled: inputMode === 'typing' && phase === 'guessing',
  });

  const [timeLeft, setTimeLeft] = useState(0);
  const [progress, setProgress] = useState(100);

  const [showLeaveChoice, setShowLeaveChoice] = useState(false);
  /** Hard leave (`leave_room`): destination after the user confirms quitting the salon. */
  const [hardLeavePrompt, setHardLeavePrompt] = useState<'play' | 'profile' | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  // Roster panel is an overlay that slides over the info card, so it starts collapsed.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [loadingCount, setLoadingCount] = useState(3);

  const myProfile = { username: profile?.username || 'Moi', avatar: profile?.avatar || 'player1', xp: profile?.xp ?? 0 };
  const amIHost = players.find((p) => String(p.id) === currentUserId)?.isHost;
  /** The round-1 clip preload signal doubles as "server build finished". */
  const firstClipReady = state.preloadTarget !== null;

  /** Shown when the player hard-leaves the salon (`leave_room`), not on soft lobby return. */
  const leaveSalonConsequences =
    gameMode === 'solo'
      ? 'Le salon sera fermé et la partie annulée.'
      : 'La partie continuera pour les autres joueurs.';

  const choices = inputMode === 'carre' ? state.qcmChoices : inputMode === 'duo' ? state.duoChoices : [];

  // --- New round: reset the input area ---
  useEffect(() => {
    if (phase !== 'guessing') return;
    setSubmittedAnswer(null);
    setAnswer('');
    setInputMode(settings.responseType === 'qcm' ? 'carre' : 'typing');
  }, [state.currentRound, phase, settings.responseType]);

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
    if (phase === 'ready') {
      setTimeLeft(state.phaseDurationSeconds);
      setProgress(100);
      return;
    }
    const tick = () => {
      // During guessing, `phaseEndsAt` includes a tail (load buffer + end grace)
      // beyond the chosen duration. Strip it so the countdown lands on 0 exactly
      // when the player's time is up, then lingers on 0 during the grace before
      // the round cuts — softer than snapping straight to the reveal.
      const tailMs =
        phase === 'guessing'
          ? GAME_CONFIG.TIMERS.GUESS_START_BUFFER + GAME_CONFIG.TIMERS.GUESS_END_GRACE
          : 0;
      const remainingMs = Math.max(0, state.phaseEndsAt - Date.now());
      const playableMs = Math.max(0, remainingMs - tailMs);
      const totalMs = state.phaseDurationSeconds * 1000;
      const visibleMs = Math.min(playableMs, totalMs);
      setTimeLeft(Math.ceil(visibleMs / 1000));
      setProgress(totalMs > 0 ? (visibleMs / totalMs) * 100 : 0);
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [phase, state.isGamePaused, state.phaseEndsAt, state.phaseDurationSeconds]);

  // --- Preload the upcoming clip (round 1 during the intro, next during reveal) ---
  useEffect(() => {
    const target = state.preloadTarget;
    if (!target) return;
    warmVideo(target.videoKey, target.videoStartTime);
  }, [state.preloadTarget, warmVideo]);

  // --- Loading intro counter ---
  // Derived from the real intro length so the countdown stays accurate even
  // though the playlist is being built server-side during this window. Resets on
  // every entry into `loading` (including solo replay), so no stale nav state.
  useEffect(() => {
    if (phase !== 'loading') return;
    const introSeconds = Math.round(GAME_CONFIG.TIMERS.INTRO_DELAY / 1000);
    const startedAt = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - startedAt) / 1000;
      setLoadingCount(Math.max(0, Math.ceil(introSeconds - elapsed)));
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [phase]);

  // --- Navigation actions ---
  const handleReturnToLobby = () => {
    actions.returnToLobby();
    navigate('/play', { state: { returnToLobby: true, roomId }, replace: true });
  };

  /** Hard leave: removes the player from the salon (`leave_room`). Used by profile and "Quitter le salon". */
  const leaveSalon = (destination: '/play' | '/profile') => {
    socket.emit('leave_room', { roomId });
    navigate(destination, { replace: true });
  };

  const confirmHardLeave = () => {
    if (!hardLeavePrompt) return;
    leaveSalon(hardLeavePrompt === 'profile' ? '/profile' : '/play');
    setHardLeavePrompt(null);
  };
  const handleReplay = () => {
    if (!roomId || !state.victoryData) return;
    if (gameMode === 'solo') socket.emit('start_game', { roomId });
    else handleReturnToLobby();
  };

  const handleAction = (val: string) => {
    if (!val) return;
    setSubmittedAnswer(val);
    actions.answer(val, INPUT_TO_ANSWER_TYPE[inputMode]);
    if (inputMode === 'typing') setAnswer('');
  };

  const configBadges = useMemo(() => ({
    sourceLabel: settings.soundSelection === 'watched' ? 'Watched' : 'Aléatoire',
    difficultyLabel: Array.isArray(settings.difficulty) && settings.difficulty.length === 1
      ? settings.difficulty[0]
      : 'Varié',
    precisionLabel: getPrecisionChipLabel(settings.precision),
    modeLabel: 'Standard',
  }), [settings.soundSelection, settings.difficulty, settings.precision]);

  const gameOverSettings = state.matchSettings ?? settings;

  if (phase === 'ended') {
    if (!state.victoryData) {
      return (
        <div className="absolute inset-0 z-50 flex animate-fade-in flex-col items-center justify-center gap-4 bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" aria-hidden />
          <p className="text-muted-foreground">Chargement des résultats…</p>
        </div>
      );
    }

    return (
      <StandardGameOver
        players={players}
        currentUserId={currentUserId}
        onLeave={handleReturnToLobby}
        onReplay={handleReplay}
        victoryData={state.victoryData}
        history={state.roundHistory}
        settings={gameOverSettings}
        gameMode={gameMode}
      />
    );
  }

  const commonProps = {
    phase, players, currentRound: state.currentRound, totalRounds: state.totalRounds, timeLeft, progress,
    volume, isMuted, onVolumeChange: setVolume, onToggleMute: toggleMute,
    videoRef, autoplayBlocked,
    onSafePlay: resumeCurrent,
    isGamePaused: state.isGamePaused, isPausePending: state.isPausePending,
    pauseVotes: state.pauseVotes, pauseRequired: state.pauseRequired, resumeCountdown: state.resumeCountdown,
    onVotePause: actions.votePause,
    skipVotes: state.skipVotes, skipRequired: state.skipRequired, onVoteSkip: actions.voteSkip,
    currentSong, nextVideoKey: state.nextVideoKey, answer, setAnswer, submittedAnswer, suggestions,
    onAction: handleAction,
    myProfile, sidebarCollapsed, setSidebarCollapsed,
    onShowLeave: () => setShowLeaveChoice(true),
    onShowProfile: () => setHardLeavePrompt('profile'),
    currentUserId, gameMode, roomId, configBadges,
    videoMode: state.videoMode ?? normalizeVideoMode(settings.videoMode),
  };

  return (
    <>
      <SeoHead title={PAGE_TITLES.game} noindex path="/game" />

      {/* Hidden buffer-warmer: always mounted so it can prefetch the round-1 clip
          during the intro and each next clip during the reveal. Never played. */}
      <video
        ref={preloadRef}
        muted
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        className="pointer-events-none absolute h-px w-px opacity-0"
        style={{ left: -9999, top: -9999 }}
      />

      {phase === 'loading' ? (
        <div
          className="absolute inset-0 z-40 bg-background flex flex-col items-center justify-center animate-fade-in gap-6"
          role="status"
          aria-live="polite"
          aria-label="Chargement de la partie"
        >
          <div className="relative">
            <Loader2 className="h-20 w-20 text-primary animate-spin" aria-hidden />
            <div className="absolute inset-0 flex items-center justify-center">
              {/* "GO!" only once the first clip is actually ready (build done). If the
                  build overruns the countdown, keep the spinner instead of a
                  misleading "GO!" that would sit there until the round truly starts. */}
              <span className="text-xs font-bold text-primary">
                {loadingCount > 0 ? loadingCount : firstClipReady ? 'GO!' : ''}
              </span>
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold animate-pulse gradient-text">CHARGEMENT...</h2>
            <p className="text-muted-foreground">
              {loadingCount === 0 && !firstClipReady ? 'Préparation de la partie…' : 'Préparez vos écouteurs...'}
            </p>
          </div>
          {amIHost ? (
            <Button variant="destructive" onClick={actions.cancel} className="mt-8">Annuler la partie</Button>
          ) : (
            <Button variant="outline" onClick={() => setHardLeavePrompt('play')} className="mt-8">
              Quitter le salon
            </Button>
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

      {/* Soft vs hard leave — two distinct server paths, one clear dialog. */}
      <AlertDialog open={showLeaveChoice} onOpenChange={setShowLeaveChoice}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter le match ?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                <strong className="text-foreground">Retour au lobby</strong> — vous quittez l&apos;écran de jeu mais
                restez dans le salon.
              </span>
              <span className="block">
                <strong className="text-foreground">Quitter le salon</strong> — vous êtes retiré du salon.{' '}
                {leaveSalonConsequences}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleReturnToLobby();
                setShowLeaveChoice(false);
              }}
              className="bg-primary"
            >
              Retour au lobby
            </AlertDialogAction>
            <Button
              variant="ghost"
              onClick={() => {
                setShowLeaveChoice(false);
                leaveSalon('/play');
              }}
              className="text-destructive hover:bg-destructive/10"
            >
              Quitter le salon
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hard leave confirmation — shared by profile and "Quitter le salon" (`leave_room`). */}
      <AlertDialog open={hardLeavePrompt !== null} onOpenChange={(open) => !open && setHardLeavePrompt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter le salon ?</AlertDialogTitle>
            <AlertDialogDescription>
              {hardLeavePrompt === 'profile' && (
                <>
                  Vous quitterez le salon pour accéder à votre profil.
                  <br />
                </>
              )}
              {leaveSalonConsequences}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmHardLeave} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {hardLeavePrompt === 'profile' ? 'Quitter et voir mon profil' : 'Quitter le salon'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
