/**
 * In-match page shell — UI only; all wire protocol lives in useGameSocket + gameReducer.
 *
 * Responsibilities: video playback, answer input, leave/pause dialogs, settings modal,
 * and delegating layout/game-over to StandardGameLayout / StandardGameOver.
 * Player identity is always user.id (JWT), never socket.id.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SeoHead } from '@/components/seo/SeoHead';
import { PAGE_TITLES } from '@/lib/site';
import { Loader2 } from 'lucide-react';

import { StandardGameOver } from '@/features/game/components/modes/standard/StandardGameOver';
import { StandardGameLayout } from '@/features/game/components/modes/standard/StandardGameLayout';
import { GlobalSettingsModal } from '@/features/settings/components/GlobalSettingsModal';

import { socket } from '@/lib/socket';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  GAME_CONFIG,
  type AnswerType,
  type GamePlayer,
  type RoomSettings,
  isBanSanctionReason,
  getPrecisionChipLabel,
  normalizePrecision,
  normalizeVideoMode,
  hasWatchedListLink,
  maxSprintPointsPerRound,
  playlistSourceDisplayName,
} from '@aniquizz/shared';
import { useGameSocket } from '@/features/game/hooks/useGameSocket';
import { useVideoPlayback } from '@/features/game/hooks/useVideoPlayback';
import { usePlayerPrefs } from '@/features/settings/context/PlayerPrefsContext';
import { parseGameNavState, gamePath } from '@/features/game/gameNavState';
import { MissingGameRoom } from '@/features/game/components/MissingGameRoom';
import { MatchLoadingOverlay } from '@/features/game/components/MatchLoadingOverlay';
import { GameLeaveDialogs } from '@/features/game/components/GameLeaveDialogs';
import { GAME_COPY } from '@/features/game/copy/gameCopy';
import { suppressFloatingSettings } from '@/features/settings/lib/openSettings';
import { DevRenderProfiler } from '@/components/dev/DevRenderProfiler';
import { usePublishedPlaylists } from '@/features/hub/hooks/usePublishedPlaylists';
import { sourceChipValue } from '@/features/hub/components/roomSettings';

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

  const initialState = parseGameNavState(location.state, location.search);
  const roomId = initialState.roomId ?? '';
  const initialPlayers = initialState.players ?? [];
  const settings: Partial<RoomSettings> = initialState.settings ?? { gameType: 'standard' };
  const gameMode: GameMode =
    initialState.mode === 'solo' || settings.maxPlayers === 1 ? 'solo' : 'multiplayer';

  const currentUserId = profile?.id ?? '';

  useEffect(() => suppressFloatingSettings(), []);

  const { state, myWatchedIds, actions } = useGameSocket({
    roomId,
    currentUserId,
    initialPlayers,
    initialTotalRounds: settings.soundCount ?? 20,
    initialFirstVideo: initialState.gameData?.firstVideo ?? null,
    initialVideoMode: normalizeVideoMode(settings.videoMode),
    watchedListLinked: hasWatchedListLink(profile ?? {}),
    isSolo: gameMode === 'solo',
    onCancelled: () => navigate('/play', { state: { returnToLobby: true, roomId }, replace: true }),
    onClosed: (reason) => {
      if (isBanSanctionReason(reason)) {
        navigate('/', { replace: true });
        return;
      }
      navigate('/play', { replace: true });
    },
  });

  // Keep room identity in the URL so F5 can emit get_game_state.
  useEffect(() => {
    if (!roomId) return;
    const params = new URLSearchParams(location.search);
    if (params.get('roomId') === roomId) return;
    navigate(gamePath(roomId), { replace: true, state: location.state });
  }, [roomId, location.search, location.state, navigate]);

  const activeSettings = (state.matchSettings ?? settings) as Partial<RoomSettings>;
  const isSprint = activeSettings.gameType === 'sprint';

  const { phase, players, currentSong } = state;

  // Video element lifecycle (load per round, pause, autoplay recovery).
  const {
    audioVolume,
    audioMuted,
    setAudioVolume,
    setAudioMuted,
    toggleMute,
    soloAutoReveal,
    autofocusAnswer,
    submitOnEnter,
    showShortcutReminder,
  } = usePlayerPrefs();
  const { videoRef, preloadRef, warmVideo, autoplayBlocked, resumeCurrent } = useVideoPlayback({
    currentSong,
    phase,
    isGamePaused: state.isGamePaused,
    volume: audioVolume,
    isMuted: audioMuted,
  });

  const onVolumeChange = useCallback(
    (v: number) => {
      setAudioVolume(v);
      if (audioMuted && v > 0) setAudioMuted(false);
    },
    [audioMuted, setAudioMuted, setAudioVolume],
  );

  // --- Local UI state ---
  const [inputMode, setInputMode] = useState<InputMode>(() =>
    settings.gameType === 'sprint'
      ? 'typing'
      : settings.responseType === 'qcm'
        ? 'carre'
        : 'typing',
  );
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);

  const [showLeaveChoice, setShowLeaveChoice] = useState(false);
  /** Hard leave (`leave_room`): destination after the user confirms quitting the salon. */
  const [hardLeavePrompt, setHardLeavePrompt] = useState<'play' | 'profile' | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  // Roster panel is an overlay that slides over the info card, so it starts collapsed.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [loadingCount, setLoadingCount] = useState(3);

  const myProfile = {
    username: profile?.username || GAME_COPY.config.me,
    avatar: profile?.avatar || 'player1',
    xp: profile?.xp ?? 0,
  };
  const amIHost = players.find((p) => String(p.id) === currentUserId)?.isHost;
  /** The round-1 clip preload signal doubles as "server build finished". */
  const firstClipReady = state.preloadTarget !== null;

  /** Shown when the player hard-leaves the salon (`leave_room`), not on soft lobby return. */
  const leaveSalonConsequences =
    gameMode === 'solo' ? GAME_COPY.consequences.solo : GAME_COPY.consequences.multi;

  const choices =
    inputMode === 'carre' ? state.qcmChoices : inputMode === 'duo' ? state.duoChoices : [];

  // --- New round: reset the input area ---
  useEffect(() => {
    if (phase !== 'guessing') return;
    setSubmittedAnswer(null);
    setInputMode(isSprint ? 'typing' : activeSettings.responseType === 'qcm' ? 'carre' : 'typing');
  }, [state.currentRound, phase, isSprint, activeSettings.responseType]);

  // --- Points animation on reveal (once per round) ---
  const pointsShownForRoundRef = useRef<number>(0);
  useEffect(() => {
    if (phase !== 'revealed') return;
    if (pointsShownForRoundRef.current === state.currentRound) return;

    const me = players.find((p) => String(p.id) === currentUserId);
    if (!me) return;

    // Wait for the reveal payload before showing points (avoids a stale +0 flash).
    if (me.hasAnswered && me.isCorrect == null) return;

    pointsShownForRoundRef.current = state.currentRound;

    const pts = me.roundPoints ?? 0;
    if (pts > 0) {
      setPointsEarned(pts);
      setShowPointsAnimation(true);
      const t = setTimeout(() => setShowPointsAnimation(false), 2000);
      return () => clearTimeout(t);
    }
    setPointsEarned(null);
    setShowPointsAnimation(false);
  }, [phase, players, currentUserId, state.currentRound]);

  const pointsBadge = useMemo(() => {
    if (!isSprint || phase !== 'guessing') return undefined;
    return `Jusqu'à +${maxSprintPointsPerRound()} pts`;
  }, [isSprint, phase]);

  // Hide the points badge as soon as a new guessing round starts.
  useEffect(() => {
    if (phase === 'guessing') setShowPointsAnimation(false);
  }, [phase, state.currentRound]);

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

  const handleAction = useCallback(
    (val: string) => {
      if (!val) return;
      setSubmittedAnswer(val);
      actions.answer(val, INPUT_TO_ANSWER_TYPE[inputMode], gameMode === 'solo' && soloAutoReveal);
    },
    [actions, gameMode, inputMode, soloAutoReveal],
  );

  const handleSwitchCarre = useCallback(() => {
    if (!isSprint && activeSettings.responseType === 'mix') setInputMode('carre');
  }, [isSprint, activeSettings.responseType]);

  const handleSwitchDuo = useCallback(() => {
    if (!isSprint && activeSettings.responseType === 'mix') setInputMode('duo');
  }, [isSprint, activeSettings.responseType]);

  const { playlists } = usePublishedPlaylists(settings.soundSelection === 'playlist');
  const playlistName = playlistSourceDisplayName(playlists, settings);

  const configBadges = useMemo(
    () => ({
      sourceLabel: sourceChipValue(settings.soundSelection, playlistName),
      difficultyLabel:
        Array.isArray(settings.difficulty) && settings.difficulty.length === 1
          ? settings.difficulty[0]
          : GAME_COPY.config.varied,
      precisionLabel: getPrecisionChipLabel(settings.precision),
      modeLabel: GAME_COPY.config.standard,
    }),
    [settings.soundSelection, settings.difficulty, settings.precision, playlistName],
  );

  const gameOverSettings = {
    ...settings,
    ...(state.matchSettings ?? {}),
    playlistId: state.matchSettings?.playlistId ?? settings.playlistId,
    decadePlaylistId: state.matchSettings?.decadePlaylistId ?? settings.decadePlaylistId,
  };

  if (!roomId) {
    return (
      <>
        <SeoHead title={PAGE_TITLES.game} noindex path="/game" />
        <MissingGameRoom />
      </>
    );
  }

  if (phase === 'ended') {
    if (!state.victoryData) {
      return (
        <div className="absolute inset-0 z-50 flex animate-fade-in flex-col items-center justify-center gap-4 bg-background">
          <Loader2 className="h-12 w-12 animate-spin text-primary" aria-hidden />
          <p className="text-muted-foreground">{GAME_COPY.results.loading}</p>
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
    phase,
    players,
    currentRound: state.currentRound,
    totalRounds: state.totalRounds,
    phaseEndsAt: state.phaseEndsAt,
    phaseDurationSeconds: state.phaseDurationSeconds,
    volume: audioVolume,
    isMuted: audioMuted,
    onVolumeChange,
    onToggleMute: toggleMute,
    videoRef,
    autoplayBlocked,
    onSafePlay: resumeCurrent,
    isGamePaused: state.isGamePaused,
    isPausePending: state.isPausePending,
    pauseVotes: state.pauseVotes,
    pauseRequired: state.pauseRequired,
    resumeCountdown: state.resumeCountdown,
    onVotePause: actions.votePause,
    skipVotes: state.skipVotes,
    skipRequired: state.skipRequired,
    onVoteSkip: actions.voteSkip,
    currentSong,
    nextVideoKey: state.nextVideoKey,
    submittedAnswer,
    onAction: handleAction,
    precision: normalizePrecision(activeSettings.precision),
    myProfile,
    sidebarCollapsed,
    setSidebarCollapsed,
    onShowLeave: () => setShowLeaveChoice(true),
    onShowProfile: () => setHardLeavePrompt('profile'),
    onShowSettings: () => setShowSettings(true),
    currentUserId,
    gameMode,
    roomId,
    configBadges,
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
        <MatchLoadingOverlay
          loadingCount={loadingCount}
          firstClipReady={firstClipReady}
          amIHost={amIHost}
          onCancel={actions.cancel}
          onLeaveSalon={() => setHardLeavePrompt('play')}
        />
      ) : (
        <DevRenderProfiler id="StandardGameLayout">
          <StandardGameLayout
            {...commonProps}
            videoRef={videoRef}
            myWatchedIds={myWatchedIds}
            inputMode={inputMode}
            choices={choices}
            onSwitchCarre={handleSwitchCarre}
            onSwitchDuo={handleSwitchDuo}
            responseType={isSprint ? 'typing' : activeSettings.responseType}
            showPointsAnimation={showPointsAnimation}
            pointsEarned={pointsEarned}
            isSprint={isSprint}
            sprintLeaderboard={state.sprintLeaderboard}
            pointsBadge={pointsBadge}
            autofocusAnswer={autofocusAnswer}
            submitOnEnter={submitOnEnter}
            showShortcutReminder={showShortcutReminder}
          />
        </DevRenderProfiler>
      )}

      <GlobalSettingsModal open={showSettings} onOpenChange={setShowSettings} />

      <GameLeaveDialogs
        showLeaveChoice={showLeaveChoice}
        onShowLeaveChoiceChange={setShowLeaveChoice}
        hardLeavePrompt={hardLeavePrompt}
        onHardLeavePromptChange={setHardLeavePrompt}
        leaveSalonConsequences={leaveSalonConsequences}
        onReturnToLobby={handleReturnToLobby}
        onLeaveSalonPlay={() => leaveSalon('/play')}
        onConfirmHardLeave={confirmHardLeave}
      />
    </>
  );
}
