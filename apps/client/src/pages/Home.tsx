import { Helmet } from 'react-helmet-async';

// --- COMPOSANTS DE LAYOUT (Globaux) ---
import { Header } from '@/components/layout/Header';
import { FloatingSettingsButton } from '@/features/settings/components/FloatingSettingsButton';

// --- COMPOSANTS DE FEATURE (Spécifiques Home) ---
import { HeroSection } from '@/features/home/components/HeroSection';
import { HomeStats } from '@/features/home/components/HomeStats';

const Home = () => {
  return (
    <>
      <Helmet>
        <title>AniQuizz - Le Blindtest Anime Nouvelle Génération</title>
        <meta name="description" content="Testez votre culture anime avec AniQuizz" />
      </Helmet>
      
      {/* MODIF RESPONSIVE :
         - Remplacement de 'h-screen' par 'min-h-screen' : Permet au contenu de pousser la page si l'écran est trop petit (scroll).
         - Suppression de 'overflow-hidden' sur l'axe Y (garde overflow-x-hidden pour éviter le scroll horizontal).
      */}
      <div className="min-h-screen bg-background relative overflow-x-hidden flex flex-col font-sans">
        
        <Header />
        
        {/* ZONE CENTRALE (Hero) 
           - 'pb-32' : Ajout d'un padding bas important pour que le contenu ne soit jamais 
             caché derrière les stats fixes quand on scroll tout en bas.
        */}
        <main className="flex-1 flex flex-col items-center justify-center relative w-full pt-16 pb-32">
          <div className="w-full flex justify-center px-4">
             <HeroSection />
          </div>
        </main>
        
        {/* STATS FLOTTANTES (Fixées en bas) */}
        {/* Ajout d'un gradient backdrop pour la lisibilité si le contenu passe dessous */}
        <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center justify-end pb-8 pt-12 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none">
             <div className="pointer-events-auto">
                <HomeStats />
             </div>
        </div>
        
        <FloatingSettingsButton />

        {/* INDICATEUR DE VERSION */}
        <div className="fixed bottom-4 left-6 text-[12px] font-mono font-bold text-muted-foreground/30 pointer-events-none z-50 select-none hidden md:block">
            v0.4 Alpha
        </div>
      </div>
    </>
  );
};

export default Home;