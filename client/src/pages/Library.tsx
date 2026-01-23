import { ArrowLeft, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function Library() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Librairie - AniQuizz</title>
        <meta name="description" content="La librairie musicale arrive bientôt sur AniQuizz." />
      </Helmet>
      
      <div className="min-h-screen bg-background flex flex-col relative p-6 overflow-hidden">
        
        {/* Bouton Retour en haut à gauche */}
        <div className="absolute top-6 left-6 z-10">
            <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
            <ArrowLeft className="h-5 w-5" />
            Retour à l'accueil
            </Button>
        </div>

        {/* Contenu Centré */}
        <div className="flex-1 flex flex-col items-center justify-center animate-fade-in space-y-8">
          
          {/* Icône Animée */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
            <div className="relative p-8 rounded-full bg-secondary/30 border border-white/5 animate-bounce">
                <Music className="h-16 w-16 text-primary" />
            </div>
          </div>

          <div className="text-center space-y-4 max-w-lg px-4">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight">
              <span className="gradient-text">COMING SOON</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              La plus grande librairie musicale d'anime est en cours de construction. 
              Préparez vos playlists, ça arrive très vite !
            </p>
          </div>

        </div>
      </div>
    </>
  );
}