import { Play, Music, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

// 👇 Correction du chemin (ils sont dans le même dossier maintenant)
import { NewsSection } from './NewsSection';

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-[calc(100vh-64px)]">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[150px] animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[150px] animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/10 rounded-full blur-[200px]" />
        <div className="absolute bottom-0 left-1/3 w-[300px] h-[300px] bg-primary/8 rounded-full blur-[120px]" />
      </div>

      <section className="relative flex flex-col items-center justify-center px-4 pt-24 pb-8">
        <div className="relative z-10 text-center max-w-4xl mx-auto animate-fade-in">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-sm text-muted-foreground">Le blindtest anime nouvelle génération</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
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
              onClick={() => navigate('/play')}
              className="group animate-pulse-glow"
            >
              <Play className="h-6 w-6 group-hover:scale-110 transition-transform" />
              JOUER
            </Button>

            {/* Secondary Buttons */}
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="glass"
                size="lg"
                onClick={() => navigate('/library')}
                className="hover-lift"
              >
                <Music className="h-5 w-5" />
                Librairie
              </Button>
              <Button
                variant="glass"
                size="lg"
                onClick={() => navigate('/daily')}
                className="hover-lift"
              >
                <Calendar className="h-5 w-5" />
                Quiz du Jour
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