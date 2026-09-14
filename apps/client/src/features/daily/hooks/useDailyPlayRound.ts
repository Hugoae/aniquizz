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
import type { CurrentSong } from '@/features/game/state/gameReducer';
import { useAuth } from '@/features/auth/context/AuthContext';
import { usePlayerPrefs } from '@/features/settings/context/PlayerPrefsContext';
import { dailyApi, DailyApiError } from '@/lib/dailyApi';
import { toast } from 'sonner';
import { DAILY_COPY } from '../copy/dailyCopy';
import { endsAtMs, tracksFromPrior } from '../lib/dailyPlayTracks';
import { useDailyPhaseClock } from './useDailyPhaseClock';
import { useDailyPlayLeave } from './useDailyPlayLeave';

export function useDailyPlayRound(input: {
  initial: DailySafeRoundDto;
  onFinished: (result: DailyResultDto) => void;
}) {
  const { initial, onFinished } = input;
  const { profile } = useAuth();
  const {
    audioVolume,
    audioMuted,
    setAudioVolume,
    setAudioMuted,
    toggleMute,
    soloAutoReveal,
  } = usePlayerPrefs();

  const [round, setRound] = useState(initial);
  const [reveal, setReveal] = useState<DailyRevealDto | null>(initial.reveal);
  const [submittedAnswer, setSubmittedAnswer] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [tracks, setTracks] = useState<DailyTrackState[]>(() => tracksFromPrior([], initial));
  const lockRef = useRef(false);
  const finishedRef = useRef(false);
  const submittedRef = useRef<string | null>(null);
  const attemptIdRef = useRef(initial.attemptId);
  const revealRef = useRef<DailyRevealDto | null>(initial.reveal);
  const lastErrorAtRef = useRef(0);
  revealRef.current = reveal;

  const phase = reveal ? 'revealed' : 'guessing';
  const currentUserId = profile?.id ?? '';
  const myProfile = {
    username: profile?.username || 'Moi',
    avatar: profile?.avatar || 'player1',
    xp: profile?.xp ?? 0,
  };

  const currentSong: CurrentSong = useMemo(
    () =>
      reveal
        ? reveal.song
        : { videoKey: round.videoKey, videoStartTime: round.videoStartTime },
    [reveal, round.videoKey, round.videoStartTime],
  );

  const { videoRef, preloadRef, autoplayBlocked, resumeCurrent, warmVideo } = useVideoPlayback({
    currentSong,
    phase,
    isGamePaused: false,
    volume: audioVolume,
    isMuted: audioMuted,
  });

  useEffect(() => {
    if (!reveal?.nextVideo) return;
    warmVideo(reveal.nextVideo, reveal.nextVideoStartTime ?? 0);
  }, [reveal?.nextVideo, reveal?.nextVideoStartTime, warmVideo]);

  const onVolumeChange = useCallback(
    (volume: number) => {
      setAudioVolume(volume);
      if (audioMuted && volume > 0) setAudioMuted(false);
    },
    [audioMuted, setAudioMuted, setAudioVolume],
  );

  const withLock = useCallback(async (fn: () => Promise<void>) => {
    if (lockRef.current) return;
    lockRef.current = true;
    try {
      await fn();
    } finally {
      lockRef.current = false;
    }
  }, []);

  const notifyError = useCallback((error: unknown) => {
    if (Date.now() - lastErrorAtRef.current < 4_000) return;
    lastErrorAtRef.current = Date.now();
    toast.error(error instanceof DailyApiError ? error.message : DAILY_COPY.unavailable);
  }, []);

  const applyPlayPayload = useCallback((next: DailySafeRoundDto) => {
    attemptIdRef.current = next.attemptId;
    setRound(next);
    setReveal(next.reveal);
    setSubmittedAnswer(null);
    submittedRef.current = null;
    setCommitting(false);
    setTracks((previous) => tracksFromPrior(previous, next));
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

  const applyAnswerPayload = useCallback(
    (payload: { result: DailyResultDto | null; reveal: DailyRevealDto | null }) => {
      if (payload.result) {
        finish(payload.result);
        return true;
      }
      if (payload.reveal) {
        setReveal(payload.reveal);
        if (payload.reveal.tracks.length) setTracks(payload.reveal.tracks);
        return true;
      }
      return false;
    },
    [finish],
  );

  const applyNextPayload = useCallback(
    (payload: { result: DailyResultDto | null; attempt: DailySafeRoundDto | null }) => {
      if (payload.result) {
        finish(payload.result);
        return true;
      }
      if (payload.attempt?.reveal) {
        setRound(payload.attempt);
        setReveal(payload.attempt.reveal);
        if (payload.attempt.reveal.tracks.length) setTracks(payload.attempt.reveal.tracks);
        return true;
      }
      if (payload.attempt) {
        applyPlayPayload(payload.attempt);
        return true;
      }
      return false;
    },
    [applyPlayPayload, finish],
  );

  const syncFromServer = useCallback(async (): Promise<boolean> => {
    const today = await dailyApi.today({ refresh: true });
    if (today.result) {
      finish(today.result);
      return true;
    }
    return false;
  }, [finish]);

  /** Commit the current draft (or null) and enter the reveal phase — same as solo end of guess. */
  const commitGuess = useCallback(
    (label: string | null) => {
      if (revealRef.current || finishedRef.current || lockRef.current) return;
      setCommitting(true);
      void withLock(async () => {
        try {
          const payload = await dailyApi.answer(attemptIdRef.current, label);
          if (applyAnswerPayload(payload)) return;
          await syncFromServer();
        } catch (error) {
          setCommitting(false);
          if (error instanceof DailyApiError && error.status === 409) {
            try {
              if (applyAnswerPayload(await dailyApi.answer(attemptIdRef.current, label))) return;
            } catch {
              /* fall through to today-result sync */
            }
          }
          if (error instanceof DailyApiError && (error.status === 409 || error.status === 429)) {
            try {
              if (await syncFromServer()) return;
            } catch {
              /* keep original error */
            }
          }
          notifyError(error);
        }
      });
    },
    [applyAnswerPayload, notifyError, syncFromServer, withLock],
  );

  const goNext = useCallback(() => {
    if (!revealRef.current || finishedRef.current || lockRef.current) return;
    void withLock(async () => {
      try {
        if (applyNextPayload(await dailyApi.next(attemptIdRef.current))) return;
      } catch (error) {
        if (error instanceof DailyApiError && error.status === 409) {
          try {
            if (applyNextPayload(await dailyApi.next(attemptIdRef.current))) return;
          } catch {
            /* fall through to today-result sync */
          }
        }
        if (error instanceof DailyApiError && (error.status === 409 || error.status === 429)) {
          try {
            if (await syncFromServer()) return;
          } catch {
            /* keep original error */
          }
        }
        notifyError(error);
      }
    });
  }, [applyNextPayload, notifyError, syncFromServer, withLock]);

  const pickChoice = useCallback(
    (label: string) => {
      if (reveal || committing || finishedRef.current) return;
      setSubmittedAnswer(label);
      submittedRef.current = label;
      if (soloAutoReveal) commitGuess(label);
    },
    [commitGuess, committing, reveal, soloAutoReveal],
  );

  const phaseEndsAt = endsAtMs(reveal?.revealEndsAt ?? round.roundEndsAt);
  useDailyPhaseClock({
    phase,
    phaseEndsAt,
    onGuessEnd: () => commitGuess(submittedRef.current),
    onRevealEnd: goNext,
  });

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
    [
      currentUserId,
      myProfile.avatar,
      myProfile.username,
      profile?.level,
      reveal,
      submittedAnswer,
    ],
  );

  const phaseDurationSeconds = Math.max(
    1,
    Math.round((reveal ? DAILY_REVEAL_MS : DAILY_GUESS_MS) / 1000),
  );

  return {
    round,
    reveal,
    submittedAnswer,
    committing,
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
    commitGuess,
    submittedRef,
    showSettings,
    setShowSettings,
    sidebarCollapsed,
    setSidebarCollapsed,
    leaveMode,
    setLeaveMode,
    confirmLeave,
  };
}
