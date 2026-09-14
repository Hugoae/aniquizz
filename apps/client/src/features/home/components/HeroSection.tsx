import { startTransition } from 'react';
import { Lightbulb, Music, Play, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HOME_COPY } from '@/features/home/copy/homeCopy';
import { useNavigate } from 'react-router-dom';
import { dailyApi } from '@/lib/dailyApi';
import { prefetchGameHub, prefetchRoute } from '@/lib/routePrefetch';
import { isFirstLandingPaint } from '@/lib/initialPaint';
import { cn } from '@/lib/utils';

import { NewsSection } from './NewsSection';

export function HeroSection() {
  const navigate = useNavigate();
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
          
          {/* Eyebrow */}
          <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-border bg-secondary/60 px-4 py-2 backdrop-blur-sm">
            <span className="eq h-3 text-aqua" aria-hidden="true">
              <i></i><i></i><i></i><i></i>
            </span>
            <span className="text-sm font-medium text-muted-foreground">{HOME_COPY.eyebrow}</span>
          </div>

          {/* Main Heading */}
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-extrabold mb-4 leading-[1.05] text-balance">
            {HOME_COPY.titleLead}{' '}
            <span className="gradient-text">{HOME_COPY.titleAccent}</span>
          </h1>

          {/* Subheading */}
          <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto px-4">
            {HOME_COPY.sub}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center gap-4">
            {/* Main Play Button */}
            <Button
              variant="glow"
              size="xxl"
              onClick={() => startTransition(() => navigate('/play'))}
              onMouseEnter={() => {
                prefetchGameHub();
                void dailyApi.today();
              }}
              onFocus={() => {
                prefetchGameHub();
                void dailyApi.today();
              }}
              className="group font-display"
            >
              <Play className="h-6 w-6 group-hover:scale-110 transition-transform fill-current" />
              Jouer
            </Button>

            {/* Secondary Buttons */}
            <div className="flex flex-wrap justify-center gap-3 pt-1">
              <Button
                variant="glass"
                size="lg"
                onClick={() => navigate('/library')}
                onMouseEnter={() => prefetchRoute('library')}
                onFocus={() => prefetchRoute('library')}
                className="hover-lift gap-2"
              >
                <Music className="h-5 w-5" />
                Librairie
              </Button>
              <Button
                variant="glass"
                size="lg"
                onClick={() => navigate('/leaderboard')}
                onMouseEnter={() => prefetchRoute('leaderboard')}
                onFocus={() => prefetchRoute('leaderboard')}
                className="hover-lift gap-2"
              >
                <Trophy className="h-5 w-5" />
                Classement
              </Button>
              <Button
                variant="glass"
                size="lg"
                onClick={() => navigate('/suggestions')}
                onMouseEnter={() => prefetchRoute('suggestions')}
                onFocus={() => prefetchRoute('suggestions')}
                className="hover-lift gap-2"
              >
                <Lightbulb className="h-5 w-5" />
                Idées
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* News Section - Compact */}
      <NewsSection />
    </div>
  );
}