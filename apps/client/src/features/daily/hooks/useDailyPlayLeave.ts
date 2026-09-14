import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DailyResultDto } from '@aniquizz/shared';
import { dailyApi, DailyApiError } from '@/lib/dailyApi';
import { toast } from 'sonner';
import { DAILY_COPY } from '../copy/dailyCopy';

/** Bumps on each DailyPlay mount so Strict Mode remounts do not forfeit. */
let dailyPlayGeneration = 0;

export function useDailyPlayLeave(input: {
  attemptIdRef: MutableRefObject<string>;
  finishedRef: MutableRefObject<boolean>;
  onResult: (result: DailyResultDto) => void;
}) {
  const { attemptIdRef, finishedRef, onResult } = input;
  const navigate = useNavigate();
  const [leaveMode, setLeaveMode] = useState<'result' | 'profile' | null>(null);
  const leaveModeRef = useRef(leaveMode);
  const forfeitingRef = useRef(false);
  leaveModeRef.current = leaveMode;

  const forfeitNow = useCallback(
    async (destination: 'result' | 'profile') => {
      if (forfeitingRef.current) return;
      forfeitingRef.current = true;
      setLeaveMode(null);
      try {
        const payload = await dailyApi.forfeit(attemptIdRef.current);
        if (destination === 'profile') {
          finishedRef.current = true;
          navigate('/profile', { replace: true });
          return;
        }
        // `onResult` owns finishedRef — setting it earlier made Abandonner a no-op.
        onResult(payload.result);
      } catch (error) {
        toast.error(error instanceof DailyApiError ? error.message : DAILY_COPY.unavailable);
      } finally {
        forfeitingRef.current = false;
      }
    },
    [attemptIdRef, finishedRef, navigate, onResult],
  );

  // Tab close / SPA leave: best-effort server forfeit. Do not flip `finishedRef`
  // here — that blocked Quit → Abandonner after a spurious pagehide/beforeunload.
  useEffect(() => {
    const gen = ++dailyPlayGeneration;
    const abandon = () => {
      if (finishedRef.current || forfeitingRef.current) return;
      if (dailyPlayGeneration !== gen) return;
      void dailyApi.forfeitKeepalive(attemptIdRef.current);
    };
    window.addEventListener('pagehide', abandon);
    return () => {
      window.removeEventListener('pagehide', abandon);
      queueMicrotask(abandon);
    };
    // Refs are stable; remount (Strict Mode) bumps `dailyPlayGeneration`.
  }, [attemptIdRef, finishedRef]);

  const confirmLeave = useCallback(() => {
    const mode = leaveModeRef.current;
    if (!mode) return;
    void forfeitNow(mode);
  }, [forfeitNow]);

  return { leaveMode, setLeaveMode, confirmLeave };
}
