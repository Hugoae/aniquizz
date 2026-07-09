import { startTransition } from 'react';
import { Play, Music, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { prefetchGameHub } from '@/lib/routePrefetch';

import { NewsSection } from './NewsSection';

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Ambient stage light — two soft neon washes, static (motion lives in the CTA) */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 left-1/2 -translate-x-1/2 w-[820px] h-[520px] bg-primary/12 rounded-full blur-[180px]" />
        <div className="absolute bottom-0 right-1/4 w-[420px] h-[420px] bg-aqua/8 rounded-full blur-[160px]" />
      </div>

      <section className="relative flex flex-col items-center justify-center px-4 pt-4 pb-2">
        <div className="relative z-10 text-center max-w-4xl mx-auto animate-fade-in">
          
          {/* Eyebrow — the audio signature made literal */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-secondary/60 border border-border mb-5 backdrop-blur-sm">
            <span className="eq h-3 text-aqua" aria-hidden="true">
              <i></i><i></i><i></i><i></i>
            </span>
            <span className="text-sm font-medium text-muted-foreground">Devine l'anime rien qu'à sa musique</span>
          </div>

          {/* Main Heading */}
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-extrabold mb-4 leading-[1.05] text-balance">
            Testez votre{' '}
            <span className="gradient-text">culture anime</span>
          </h1>

          {/* Subheading */}
          <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto px-4">
            Devinez l'anime à partir de la musique. Défiez vos amis et prouvez que vous êtes le meilleur.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center gap-4">
            {/* Main Play Button */}
            <Button
              variant="glow"
              size="xxl"
              onClick={() => startTransition(() => navigate('/play'))}
              onMouseEnter={prefetchGameHub}
              onFocus={prefetchGameHub}
              className="group font-display"
            >
              <Play className="h-6 w-6 group-hover:scale-110 transition-transform fill-current" />
              Jouer
            </Button>

            {/* Secondary Buttons */}
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="glass"
                size="lg"
                onClick={() => navigate('/library')}
                className="hover-lift gap-2"
              >
                <Music className="h-5 w-5" />
                Librairie
              </Button>
              <Button
                variant="glass"
                size="lg"
                onClick={() => navigate('/leaderboard')}
                className="hover-lift gap-2"
              >
                <Trophy className="h-5 w-5" />
                Classement
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