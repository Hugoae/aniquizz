import { Lightbulb, Music, Play, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HOME_COPY } from '@/features/home/copy/homeCopy';
import { dailyApi } from '@/lib/dailyApi';
import { prefetchGameHub, prefetchRoute, routeIntentHandlers } from '@/lib/routePrefetch';
import { isFirstLandingPaint } from '@/lib/initialPaint';
import { cn } from '@/lib/utils';

import { NewsSection } from './NewsSection';

export function HeroSection() {
  const skipEntryAnimation = isFirstLandingPaint();

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Ambient stage light — two soft neon washes, static (motion lives in the CTA) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[820px] h-[520px] bg-primary/12 rounded-full blur-[180px]" />
        <div className="absolute bottom-0 right-1/4 w-[420px] h-[420px] bg-aqua/8 rounded-full blur-[160px]" />
      </div>

      <section className="relative flex flex-col items-center justify-center px-4 pt-4 pb-2">
        <div
          className={cn(
            'relative z-10 mx-auto max-w-4xl text-center',
            !skipEntryAnimation && 'animate-fade-in',
          )}
        >
          <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-border bg-secondary/60 px-4 py-2 backdrop-blur-sm">
            <span className="eq h-3 text-aqua" aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
              <i></i>
            </span>
            <span className="text-sm font-medium text-muted-foreground">{HOME_COPY.eyebrow}</span>
          </div>

          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-extrabold mb-4 leading-[1.05] text-balance">
            {HOME_COPY.titleLead} <span className="gradient-text">{HOME_COPY.titleAccent}</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto px-4">
            {HOME_COPY.sub}
          </p>

          <div className="flex flex-col items-center gap-4">
            <Button asChild variant="glow" size="xxl" className="group font-display">
              <Link
                to="/play"
                {...routeIntentHandlers(() => {
                  prefetchGameHub();
                  void dailyApi.today();
                })}
              >
                <Play className="h-6 w-6 group-hover:scale-110 transition-transform fill-current" />
                {HOME_COPY.play}
              </Link>
            </Button>

            <div className="flex flex-wrap justify-center gap-3 pt-1">
              <Button asChild variant="glass" size="lg" className="hover-lift gap-2">
                <Link to="/library" {...routeIntentHandlers(() => prefetchRoute('library'))}>
                  <Music className="h-5 w-5" />
                  {HOME_COPY.library}
                </Link>
              </Button>
              <Button asChild variant="glass" size="lg" className="hover-lift gap-2">
                <Link
                  to="/leaderboard"
                  {...routeIntentHandlers(() => prefetchRoute('leaderboard'))}
                >
                  <Trophy className="h-5 w-5" />
                  {HOME_COPY.leaderboard}
                </Link>
              </Button>
              <Button asChild variant="glass" size="lg" className="hover-lift gap-2">
                <Link
                  to="/suggestions"
                  {...routeIntentHandlers(() => prefetchRoute('suggestions'))}
                >
                  <Lightbulb className="h-5 w-5" />
                  {HOME_COPY.ideas}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <NewsSection />
    </div>
  );
}
