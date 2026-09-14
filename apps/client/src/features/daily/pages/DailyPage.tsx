import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import type { DailyResultDto, DailySafeRoundDto, DailyTodayResponse } from '@aniquizz/shared';
import { SeoHead } from '@/components/seo/SeoHead';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { PAGE_TITLES } from '@/lib/site';
import { dailyApi, DailyApiError, invalidateDailyToday } from '@/lib/dailyApi';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useAuthModal } from '@/features/auth/context/AuthModalContext';
import { toast } from 'sonner';
import { DailyLanding } from '../components/DailyLanding';
import { DailyPlay } from '../components/DailyPlay';
import { DailyResult } from '../components/DailyResult';
import { DAILY_COPY } from '../copy/dailyCopy';

type View = 'landing' | 'play' | 'result';

export default function DailyPage() {
  const { setShowAuthModal } = useAuthModal();
  const { profile } = useAuth();
  const peeked = dailyApi.peekToday();
  const [today, setToday] = useState<DailyTodayResponse | null>(() =>
    peeked?.status === 'in_progress' ? null : peeked,
  );
  const [view, setView] = useState<View>('landing');
  const [round, setRound] = useState<DailySafeRoundDto | null>(null);
  const [result, setResult] = useState<DailyResultDto | null>(peeked?.result ?? null);
  const playingRef = useRef(false);

  const load = useCallback(async () => {
    try {
      let payload = await dailyApi.today({ refresh: true });
      // A slow landing fetch must not forfeit a run that just started.
      if (playingRef.current) return;
      // Refresh / reopen after leaving mid-run: settle as forfeit, never offer resume.
      if (payload.status === 'in_progress' && payload.openAttemptId) {
        try {
          const forfeited = await dailyApi.forfeit(payload.openAttemptId);
          if (playingRef.current) return;
          payload = await dailyApi.today({ refresh: true });
          const nextResult = forfeited.result ?? payload.result;
          setToday(payload);
          setResult(nextResult);
          setRound(null);
          if (nextResult) setView('result');
          return;
        } catch (error) {
          toast.error(error instanceof DailyApiError ? error.message : DAILY_COPY.unavailable);
        }
      }
      setToday(payload);
      if (payload.result) {
        setResult(payload.result);
      }
      setRound(null);
    } catch (error) {
      toast.error(error instanceof DailyApiError ? error.message : DAILY_COPY.unavailable);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const start = async () => {
    playingRef.current = true;
    try {
      const payload = await dailyApi.start();
      if (payload.result) {
        playingRef.current = false;
        setResult(payload.result);
        setToday((prev) =>
          prev ? { ...prev, status: 'completed', result: payload.result } : prev,
        );
        setView('result');
        invalidateDailyToday();
        return;
      }
      if (payload.attempt) {
        setRound(payload.attempt);
        setView('play');
        return;
      }
      playingRef.current = false;
    } catch (error) {
      playingRef.current = false;
      if (error instanceof DailyApiError && error.status === 401) {
        setShowAuthModal(true);
        return;
      }
      toast.error(error instanceof DailyApiError ? error.message : DAILY_COPY.unavailable);
    }
  };

  if (view === 'play' && round) {
    return (
      <DailyPlay
        initial={round}
        onFinished={(next) => {
          playingRef.current = false;
          invalidateDailyToday();
          setResult(next);
          setToday((prev) => (prev ? { ...prev, status: 'completed', result: next } : prev));
          setView('result');
        }}
      />
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <SeoHead title={PAGE_TITLES.daily} path="/daily" />
      <Header />
      {view === 'result' && result ? (
        <main
          id="main-content"
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden pt-16"
        >
          <DailyResult
            result={result}
            username={profile?.username ?? 'Joueur'}
            avatar={profile?.avatar ?? ''}
            onBack={() => setView('landing')}
          />
        </main>
      ) : (
        <main
          id="main-content"
          className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-4 pt-20 md:px-6"
        >
          <div className="relative mx-auto flex min-h-0 w-full max-w-[90rem] flex-1 flex-col gap-3">
            <Button
              asChild
              variant="ghost"
              className="w-fit shrink-0 gap-2 pl-0 text-muted-foreground hover:text-foreground"
            >
              <Link to="/play">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Retour
              </Link>
            </Button>

            {today ? (
              <DailyLanding
                today={today}
                onStart={() => void start()}
                onViewResult={() => {
                  if (result) setView('result');
                }}
                onLogin={() => setShowAuthModal(true)}
                viewerId={profile?.id}
              />
            ) : (
              <p className="flex flex-1 items-center justify-center text-muted-foreground">
                {DAILY_COPY.title}…
              </p>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
