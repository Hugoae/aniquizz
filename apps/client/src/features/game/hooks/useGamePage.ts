import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '@/lib/socket';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  GAME_CONFIG,
  GAME_TYPE_LABELS,
  type AnswerType,
  type GamePlayer,
  type RoomSettings,
  isBanSanctionReason,
  isSpeedBonusEnabled,
  isTimeAttackGame,
  normalizeTimeBudgetSeconds,
  getPrecisionChipLabel,
  normalizePrecision,
  normalizeVideoMode,
  hasWatchedListLink,
  maxSpeedBonusPointsPerRound,
  medalMarkerScores,
  maxPointsPerRound,
  playlistSourceDisplayName,
  resolveEvolvingReplayLimit,
  EVOLVING_STEP_POINTS,
} from '@aniquizz/shared';
import { useGameSocket } from '@/features/game/hooks/useGameSocket';
import type { TimeAttackClock } from '@/features/game/hooks/useTimeAttackClock';
import { playAnswerSting } from '@/features/game/lib/playAnswerSting';
import { useVideoPlayback } from '@/features/game/hooks/useVideoPlayback';
import { usePlayerPrefs } from '@/features/settings/context/PlayerPrefsContext';
import { parseGameNavState, gamePath } from '@/features/game/gameNavState';
import { GAME_COPY } from '@/features/game/copy/gameCopy';
import { suppressFloatingSettings } from '@/features/settings/lib/openSettings';
import { usePublishedPlaylists } from '@/features/hub/hooks/usePublishedPlaylists';
import { getDifficultyBadge, sourceChipValue } from '@/features/hub/components/roomSettings';

export type InputMode = 'typing' | 'carre' | 'duo';
export type GameMode = 'solo' | 'multiplayer';

const INPUT_TO_ANSWER_TYPE: Record<InputMode, AnswerType> = {
  typing: 'typing',
  carre: 'qcm',
  duo: 'duo',
};

/** Owns in-match page state: socket, video, leave dialogs, and layout props. */
const NO_CHOICES: string[] = [];

export function useGamePage() {
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
  // "Retour Lobby" navigates to a lobby that re-joins this very room: freeing it on
  // unmount would turn that join into « Salon introuvable » toasts.
  const keepRoomRef = useRef(false);

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
    onCancelled: () => {
      keepRoomRef.current = true;
      navigate('/play', { state: { returnToLobby: true, roomId }, replace: true });
    },
    onClosed: (reason) => {
      if (isBanSanctionReason(reason)) {
        navigate('/', { replace: true });
        return;
      }
      navigate('/play', { replace: true });
    },
  });

  useEffect(() => {
    if (!roomId) return;
    const params = new URLSearchParams(location.search);
    if (params.get('roomId') === roomId) return;
    navigate(gamePath(roomId), { replace: true, state: location.state });
  }, [roomId, location.search, location.state, navigate]);

  const activeSettings = (state.matchSettings ?? settings) as Partial<RoomSettings>;
  const speedBonusOn = isSpeedBonusEnabled(activeSettings);
  const timeAttack = isTimeAttackGame(activeSettings);
  const { phase, players, currentSong } = state;
  const budgetTicking = phase === 'guessing' && !state.isGamePaused;
  const budgetMs = normalizeTimeBudgetSeconds(activeSettings.timeBudgetSeconds) * 1000;
  // Interpolation lives in the stage overlay so 250 ms ticks never re-render the page.
  const timeAttackClock = useMemo<TimeAttackClock | null>(
    () =>
      timeAttack && state.remainingMs != null
        ? {
            remainingMs: state.remainingMs,
            syncedAt: state.budgetSyncedAt,
            ticking: budgetTicking,
            budgetMs,
          }
        : null,
    [timeAttack, state.remainingMs, state.budgetSyncedAt, budgetTicking, budgetMs],
  );

  const {
    audioVolume,
    audioMuted,
    setAudioVolume,
    setAudioMuted,
    toggleMute,
    answerSounds,
    autofocusAnswer,
    submitOnEnter,
    showShortcutReminder,
  } = usePlayerPrefs();

  // Short sting so the answer is confirmed without looking away from the input.
  const lastStingSeq = useRef(state.stageFeedback?.seq ?? 0);
  useEffect(() => {
    const fb = state.stageFeedback;
    if (!fb || fb.seq === lastStingSeq.current) return;
    lastStingSeq.current = fb.seq;
    if (answerSounds && !audioMuted) playAnswerSting(fb.kind, audioVolume);
  }, [state.stageFeedback, answerSounds, audioMuted, audioVolume]);

  const medalRail = useMemo(() => {
    if (gameMode !== 'solo') return null;
    if (timeAttack) {
      if (!state.medalTargets) return null;
      return { unit: 'found' as const, current: state.foundCount, targets: state.medalTargets };
    }
    if (activeSettings.gameType !== 'standard' && activeSettings.gameType !== 'evolving') {
      return null;
    }
    const rounds = state.totalRounds;
    if (rounds <= 0) return null;
    const evolving = activeSettings.gameType === 'evolving';
    const perRound = evolving
      ? EVOLVING_STEP_POINTS[0]
      : maxPointsPerRound(activeSettings.responseType ?? 'typing');
    const difficulties =
      activeSettings.difficulty && activeSettings.difficulty.length > 0
        ? activeSettings.difficulty
        : ['medium'];
    const me = players.find((player) => String(player.id) === currentUserId);
    return {
      unit: 'points' as const,
      current: me?.score ?? 0,
      targets: medalMarkerScores(
        rounds * perRound,
        difficulties,
        normalizePrecision(activeSettings.precision),
        evolving,
      ),
    };
  }, [
    gameMode,
    timeAttack,
    activeSettings,
    state.medalTargets,
    state.foundCount,
    state.totalRounds,
    players,
    currentUserId,
  ]);
  const { videoRef, preloadRef, warmVideo, autoplayBlocked, resumeCurrent } = useVideoPlayback({
    currentSong,
    phase,
    isGamePaused: state.isGamePaused,
    volume: audioVolume,
    isMuted: audioMuted,
    resumeAfterPause: timeAttack,
    clipLimitSeconds: phase === 'guessing' && state.evolving ? state.evolving.clipSeconds : null,
    clipPlayEpoch: state.evolving?.stepIndex ?? 0,
  });

  const onVolumeChange = useCallback(
    (v: number) => {
      setAudioVolume(v);
      if (audioMuted && v > 0) setAudioMuted(false);
    },
    [audioMuted, setAudioMuted, setAudioVolume],
  );

  const [inputMode, setInputMode] = useState<InputMode>(() =>
    settings.responseType === 'qcm' ? 'carre' : 'typing',
  );
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);
  const [showLeaveChoice, setShowLeaveChoice] = useState(false);
  const [hardLeavePrompt, setHardLeavePrompt] = useState<'play' | 'profile' | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPointsAnimation, setShowPointsAnimation] = useState(false);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [loadingCount, setLoadingCount] = useState(3);

  const myProfile = useMemo(
    () => ({
      username: profile?.username || GAME_COPY.config.me,
      avatar: profile?.avatar || 'player1',
      xp: profile?.xp ?? 0,
    }),
    [profile?.username, profile?.avatar, profile?.xp],
  );
  const amIHost = players.find((p: GamePlayer) => String(p.id) === currentUserId)?.isHost;
  const firstClipReady = state.preloadTarget !== null;
  const leaveSalonConsequences =
    gameMode === 'solo' ? GAME_COPY.consequences.solo : GAME_COPY.consequences.multi;
  const choices =
    inputMode === 'carre' ? state.qcmChoices : inputMode === 'duo' ? state.duoChoices : NO_CHOICES;

  useEffect(() => {
    if (phase !== 'guessing') return;
    setSubmittedAnswer(null);
    setInputMode(activeSettings.responseType === 'qcm' ? 'carre' : 'typing');
  }, [state.currentRound, phase, activeSettings.responseType, state.evolving?.stepIndex]);

  useEffect(() => {
    if (phase !== 'guessing') return;
    if (state.duoChoices.length > 0 && activeSettings.responseType === 'mix') {
      setInputMode('duo');
    }
  }, [phase, state.duoChoices, activeSettings.responseType]);

  const onShowLeave = useCallback(() => setShowLeaveChoice(true), []);
  const onShowProfile = useCallback(() => setHardLeavePrompt('profile'), []);
  const onShowSettings = useCallback(() => setShowSettings(true), []);

  const pointsShownForRoundRef = useRef<number>(0);
  useEffect(() => {
    if (phase !== 'revealed') return;
    if (pointsShownForRoundRef.current === state.currentRound) return;

    const me = players.find((p) => String(p.id) === currentUserId);
    if (!me) return;
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
    if (timeAttack) return '+1';
    if (state.evolving && phase === 'guessing') return `${state.evolving.points} pts`;
    if (!speedBonusOn || phase !== 'guessing') return undefined;
    return `Jusqu'à +${maxSpeedBonusPointsPerRound()} pts`;
  }, [speedBonusOn, phase, timeAttack, state.evolving]);

  useEffect(() => {
    if (phase === 'guessing') setShowPointsAnimation(false);
  }, [phase, state.currentRound]);

  useEffect(() => {
    const target = state.preloadTarget;
    if (!target) return;
    warmVideo(target.videoKey, target.videoStartTime);
  }, [state.preloadTarget, warmVideo]);

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

  // A solo room has no reason to outlive its game-over screen: leaving the page
  // by any route (navbar, back button) must free the room instead of leaving a
  // connected ghost in `finished`. Multi rooms stay (players may regroup in the lobby).
  const soloFinishedRef = useRef(false);
  soloFinishedRef.current = gameMode === 'solo' && Boolean(state.victoryData);
  useEffect(() => {
    return () => {
      if (soloFinishedRef.current && !keepRoomRef.current && roomId) {
        socket.emit('leave_room', { roomId });
      }
    };
  }, [roomId]);

  const handleReturnToLobby = () => {
    keepRoomRef.current = true;
    actions.returnToLobby();
    navigate('/play', { state: { returnToLobby: true, roomId }, replace: true });
  };

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
      if (!timeAttack && !state.evolving) setSubmittedAnswer(val);
      actions.answer(
        val,
        INPUT_TO_ANSWER_TYPE[inputMode],
        gameMode === 'solo' &&
          !timeAttack &&
          !state.evolving &&
          activeSettings.soloInstantReveal === true,
      );
    },
    [actions, activeSettings.soloInstantReveal, gameMode, inputMode, timeAttack, state.evolving],
  );

  const handleSwitchCarre = useCallback(() => {
    if (activeSettings.responseType === 'mix') setInputMode('carre');
  }, [activeSettings.responseType]);

  const handleSwitchDuo = useCallback(() => {
    if (activeSettings.responseType === 'mix') actions.useDuo();
  }, [actions, activeSettings.responseType]);

  const { playlists } = usePublishedPlaylists(settings.soundSelection === 'playlist');
  const playlistName = playlistSourceDisplayName(playlists, settings);

  const configBadges = useMemo(() => {
    const difficulty = getDifficultyBadge(
      Array.isArray(settings.difficulty) ? settings.difficulty : [],
    );
    return {
      sourceLabel: sourceChipValue(settings.soundSelection, playlistName),
      difficultyLabel: difficulty.label,
      difficultyClassName: difficulty.className,
      soundTypes: settings.soundTypes,
      precisionLabel: getPrecisionChipLabel(settings.precision),
      modeLabel: GAME_TYPE_LABELS[activeSettings.gameType ?? 'standard'],
      gameType: activeSettings.gameType ?? 'standard',
      speedBonusEnabled: speedBonusOn,
    };
  }, [
    settings.soundSelection,
    settings.difficulty,
    settings.soundTypes,
    settings.precision,
    playlistName,
    activeSettings.gameType,
    speedBonusOn,
  ]);

  const gameOverSettings = {
    ...settings,
    ...(state.matchSettings ?? {}),
    playlistId: state.matchSettings?.playlistId ?? settings.playlistId,
    decadePlaylistId: state.matchSettings?.decadePlaylistId ?? settings.decadePlaylistId,
  };

  const layoutProps = {
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
    // Evolving has no guess clock, so a match pause does nothing.
    showPause: activeSettings.gameType !== 'evolving',
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
    onShowLeave,
    onShowProfile,
    onShowSettings,
    currentUserId,
    gameMode,
    roomId,
    configBadges,
    videoMode: state.videoMode ?? normalizeVideoMode(settings.videoMode),
    myWatchedIds,
    inputMode,
    choices,
    onSwitchCarre: handleSwitchCarre,
    onSwitchDuo: handleSwitchDuo,
    responseType: activeSettings.responseType,
    showPointsAnimation,
    pointsEarned,
    speedBonusEnabled: speedBonusOn,
    speedLeaderboard: state.speedLeaderboard,
    pointsBadge,
    autofocusAnswer,
    submitOnEnter,
    showShortcutReminder,
    timeAttackClock,
    foundCount: timeAttack ? state.foundCount : null,
    medalRail,
    nextSkipTaxMs: timeAttack ? state.nextSkipTaxMs : null,
    stageFeedback: state.stageFeedback,
    recentTitles: state.recentTitles,
    evolving: state.evolving,
    evolvingReplayLimit:
      activeSettings.gameType === 'evolving' ? resolveEvolvingReplayLimit(activeSettings) : null,
    testMatch: activeSettings.testMatch === true,
    race:
      timeAttack && gameMode !== 'solo'
        ? { board: state.raceBoard, laneDone: state.laneDone }
        : null,
  };

  return {
    roomId,
    phase,
    players,
    currentUserId,
    gameMode,
    state,
    actions,
    preloadRef,
    loadingCount,
    firstClipReady,
    amIHost,
    showSettings,
    setShowSettings,
    showLeaveChoice,
    setShowLeaveChoice,
    hardLeavePrompt,
    setHardLeavePrompt,
    leaveSalonConsequences,
    handleReturnToLobby,
    handleReplay,
    confirmHardLeave,
    leaveSalon,
    gameOverSettings,
    layoutProps,
  };
}
