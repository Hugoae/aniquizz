import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DAILY_GUESS_MS,
  DAILY_REVEAL_MS,
  type DailyRevealDto,
  type DailyResultDto,
  type DailySafeRoundDto,
  type DailyTrackState,
  type GamePlayer,
} from '@aniquizz/shared';
import { useVideoPlayback } from '@/features/game/hooks/useVideoPlayback';
import { playAnswerSting } from '@/features/game/lib/playAnswerSting';
import type {
  CurrentSong,
  StageFeedback,
  StageFeedbackKind,
} from '@/features/game/state/gameReducer';
import { useAuth } from '@/features/auth/context/AuthContext';
import { usePlayerPrefs } from '@/features/settings/context/PlayerPrefsContext';
import { socket } from '@/lib/socket';
import { DailyApiError } from '@/lib/dailyApi';
import { dailySocket, subscribeDailyPlay } from '../lib/dailySocket';
import { toast } from 'sonner';
import { DAILY_COPY } from '../copy/dailyCopy';
import { endsAtMs, tracksFromPrior } from '../lib/dailyPlayTracks';
import { useDailyPlayLeave } from './useDailyPlayLeave';

/**
 * The server owns the clock and pushes one snapshot per phase, the same way a
 * match pushes round_start and round_reveal. A click only stores the choice.
 */
export function useDailyPlayRound(input: {
  initial: DailySafeRoundDto;
  onFinished: (result: DailyResultDto) => void;
}) {
  const { initial, onFinished } = input;
  const { profile } = useAuth();
  const { audioVolume, audioMuted, setAudioVolume, setAudioMuted, toggleMute, answerSounds } =
    usePlayerPrefs();

  const [round, setRound] = useState(initial);
  const [reveal, setReveal] = useState<DailyRevealDto | null>(initial.reveal);
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [tracks, setTracks] = useState<DailyTrackState[]>(() => tracksFromPrior([], initial));
  const [stageFeedback, setStageFeedback] = useState<StageFeedback | null>(null);
  const finishedRef = useRef(false);
  const attemptIdRef = useRef(initial.attemptId);
  const revealRef = useRef<DailyRevealDto | null>(initial.reveal);
  const lastErrorAtRef = useRef(0);
  const feedbackSeq = useRef(0);
  const lastStingSeq = useRef(0);
  /** URL already buffering in the hidden player. The next payload re-signs it. */
  const warmedClipRef = useRef<{ videoKey: string; videoStartTime: number } | null>(null);
  revealRef.current = reveal;
  warmedClipRef.current = round.nextVideo
    ? { videoKey: round.nextVideo, videoStartTime: round.nextVideoStartTime ?? 0 }
    : null;

  const phase: 'guessing' | 'revealed' = reveal ? 'revealed' : 'guessing';
  const currentUserId = profile?.id ?? '';
  const myProfile = {
    username: profile?.username || 'Moi',
    avatar: profile?.avatar || 'player1',
    xp: profile?.xp ?? 0,
  };

  const currentSong: CurrentSong = reveal
    ? reveal.song
    : { videoKey: round.videoKey, videoStartTime: round.videoStartTime };

  const { videoRef, preloadRef, warmVideo, autoplayBlocked, resumeCurrent } = useVideoPlayback({
    currentSong,
    phase,
    isGamePaused: false,
    volume: audioVolume,
    isMuted: audioMuted,
  });

  const onVolumeChange = useCallback(
    (volume: number) => {
      setAudioVolume(volume);
      if (audioMuted && volume > 0) setAudioMuted(false);
    },
    [audioMuted, setAudioMuted, setAudioVolume],
  );

  useEffect(() => {
    if (!round.nextVideo) return;
    warmVideo(round.nextVideo, round.nextVideoStartTime ?? 0);
  }, [round.nextVideo, round.nextVideoStartTime, warmVideo]);

  const notifyError = useCallback((error: unknown) => {
    if (Date.now() - lastErrorAtRef.current < 4_000) return;
    lastErrorAtRef.current = Date.now();
    toast.error(error instanceof DailyApiError ? error.message : DAILY_COPY.unavailable);
  }, []);

  const finish = useCallback(
    (result: DailyResultDto) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      onFinished(result);
    },
    [onFinished],
  );

  const { leaveMode, setLeaveMode, confirmLeave } = useDailyPlayLeave({
    attemptIdRef,
    finishedRef,
    onResult: finish,
  });

  const cueReveal = useCallback((graded: DailyRevealDto) => {
    const kind: StageFeedbackKind =
      graded.selectedLabel == null ? 'missed' : graded.isCorrect ? 'correct' : 'wrong';
    feedbackSeq.current += 1;
    setStageFeedback({ kind, seq: feedbackSeq.current });
  }, []);

  const applyGuessRound = useCallback((next: DailySafeRoundDto) => {
    const warmed = warmedClipRef.current;
    const pinned =
      warmed != null
        ? { ...next, videoKey: warmed.videoKey, videoStartTime: warmed.videoStartTime }
        : next;
    attemptIdRef.current = pinned.attemptId;
    setRound(pinned);
    setReveal(null);
    revealRef.current = null;
    setSubmittedAnswer(null);
    setStageFeedback(null);
    setTracks((previous) => tracksFromPrior(previous, pinned));
  }, []);

  const applyReveal = useCallback(
    (graded: DailyRevealDto, nextRound?: DailySafeRoundDto) => {
      if (nextRound) {
        attemptIdRef.current = nextRound.attemptId;
        setRound(nextRound);
        setTracks((previous) => tracksFromPrior(previous, nextRound));
      } else if (graded.tracks.length) {
        setTracks(graded.tracks);
      }
      revealRef.current = graded;
      setReveal(graded);
      cueReveal(graded);
    },
    [cueReveal],
  );

  useEffect(() => {
    return subscribeDailyPlay((state) => {
      if (finishedRef.current) return;
      if (state.kind === 'result') {
        finish(state.result);
        return;
      }
      if (state.attempt.reveal) {
        applyReveal(state.attempt.reveal, state.attempt);
        return;
      }
      applyGuessRound(state.attempt);
    });
  }, [applyGuessRound, applyReveal, finish]);

  useEffect(() => {
    const onFail = (payload: { message?: string }) => {
      notifyError(new DailyApiError(400, payload.message || DAILY_COPY.unavailable));
    };
    socket.on('daily:error', onFail);
    return () => {
      socket.off('daily:error', onFail);
    };
  }, [notifyError]);

  const lockGuess = useCallback(() => {
    if (revealRef.current || finishedRef.current) return;
    dailySocket.lock(attemptIdRef.current);
  }, []);

  const goNext = useCallback(() => {
    if (!revealRef.current || finishedRef.current) return;
    dailySocket.next(attemptIdRef.current);
  }, []);

  const pickChoice = useCallback(
    (label: string) => {
      if (reveal || finishedRef.current) return;
      setSubmittedAnswer(label);
      dailySocket.answer(attemptIdRef.current, label);
    },
    [reveal],
  );

  const phaseEndsAt = endsAtMs(reveal?.revealEndsAt ?? round.roundEndsAt);

  useEffect(() => {
    const feedback = stageFeedback;
    if (!feedback || feedback.seq === lastStingSeq.current) return;
    lastStingSeq.current = feedback.seq;
    if (answerSounds && !audioMuted) playAnswerSting(feedback.kind, audioVolume);
  }, [stageFeedback, answerSounds, audioMuted, audioVolume]);

  const players: GamePlayer[] = useMemo(
    () => [
      {
        id: currentUserId,
        username: myProfile.username,
        avatar: myProfile.avatar,
        score: 0,
        streak: 0,
        level: profile?.level,
        isConnected: true,
        isInGame: true,
        hasAnswered: Boolean(reveal) || Boolean(submittedAnswer),
        isCorrect: reveal?.isCorrect ?? null,
        currentAnswer: reveal?.selectedLabel ?? submittedAnswer,
        answerType: 'qcm',
      },
    ],
    [currentUserId, myProfile.avatar, myProfile.username, profile?.level, reveal, submittedAnswer],
  );

  const phaseDurationSeconds = Math.max(
    1,
    Math.round((reveal ? DAILY_REVEAL_MS : DAILY_GUESS_MS) / 1000),
  );

  return {
    round,
    reveal,
    stageFeedback,
    submittedAnswer,
    tracks,
    phase,
    phaseEndsAt,
    phaseDurationSeconds,
    currentSong,
    players,
    myProfile,
    currentUserId,
    videoRef,
    preloadRef,
    autoplayBlocked,
    resumeCurrent,
    audioVolume,
    audioMuted,
    onVolumeChange,
    toggleMute,
    pickChoice,
    goNext,
    lockGuess,
    showSettings,
    setShowSettings,
    sidebarCollapsed,
    setSidebarCollapsed,
    leaveMode,
    setLeaveMode,
    confirmLeave,
  };
}
