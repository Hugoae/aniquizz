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
      
      {/* CONTENEUR PRINCIPAL (Plein écran, non scrollable) */}
      <div className="h-screen bg-background relative overflow-hidden flex flex-col">
        
        <Header />
        
        {/* ZONE CENTRALE (Hero) */}
        {/* Le Main prend toute la place mais laisse les éléments fixed passer au-dessus */}
        <main className="flex-1 flex flex-col items-center justify-center relative w-full pt-16 pb-20">
          <div className="w-full flex justify-center px-4">
             <HeroSection />
          </div>
        </main>
        
        {/* STATS FLOTTANTES (Fixées en bas) */}
        <div className="fixed bottom-8 left-0 right-0 z-40 flex justify-center pointer-events-none">
             {/* pointer-events-auto pour permettre l'interaction si besoin */}
             <div className="pointer-events-auto">
                <HomeStats />
             </div>
        </div>
        
        <FloatingSettingsButton />

        {/* INDICATEUR DE VERSION DISCRET */}
        <div className="fixed bottom-4 left-6 text-[14px] font-mono font-bold text-muted-foreground/40 pointer-events-none z-50">
            v0.3 Alpha
        </div>
      </div>
    </>
  );
};

export default Home;