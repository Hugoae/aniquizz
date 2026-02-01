import { ArrowLeft, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function Daily() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Quiz du Jour - AniQuizz</title>
        <meta name="description" content="Le Quiz du Jour arrive bientôt sur AniQuizz." />
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
            <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative p-8 rounded-full bg-secondary/30 border border-white/5 animate-bounce">
                <Calendar className="h-16 w-16 text-orange-500" />
                <Sparkles className="h-6 w-6 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
            </div>
          </div>

          <div className="text-center space-y-4 max-w-lg px-4">
            <h1 className="text-4xl md:text-6xl font-black tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-600">
               BIENTÔT
              </span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Une nouvelle épreuve chaque jour pour tester votre culture anime.
              Le mode <span className="font-bold text-foreground">Quiz du Jour</span> sera bientôt disponible !
            </p>
          </div>

        </div>
      </div>
    </>
  );
}