import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { HeroSection } from '@/components/home/HeroSection';
import { HomeStats } from '@/components/home/HomeStats';
import { FloatingSettingsButton } from '@/components/settings/FloatingSettingsButton';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>AniQuizz - Le Blindtest Anime Nouvelle Génération</title>
        <meta name="description" content="Testez votre culture anime avec AniQuizz" />
      </Helmet>
      
      <div className="h-screen bg-background relative overflow-hidden flex flex-col">
        <Header />
        
        {/* Le Main prend toute la place mais laisse les éléments fixed passer au-dessus */}
        <main className="flex-1 flex flex-col items-center justify-center relative w-full pt-16 pb-20">
          <div className="w-full flex justify-center px-4">
             <HeroSection />
          </div>
        </main>
        
        {/* MODIFICATION : Position FIXED pour forcer l'affichage en bas */}
        <div className="fixed bottom-8 left-0 right-0 z-40 flex justify-center pointer-events-none">
             {/* pointer-events-auto sur l'enfant pour pouvoir sélectionner le texte si besoin */}
             <div className="pointer-events-auto">
                <HomeStats />
             </div>
        </div>
        
        <FloatingSettingsButton />

        {/* INDICATEUR DE VERSION */}
        <div className="fixed bottom-4 left-6 text-[14px] font-mono font-bold text-muted-foreground/40 pointer-events-none z-50">
            v0.3 Alpha
        </div>
      </div>
    </>
  );
};

export default Index;