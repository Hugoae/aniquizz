import { Helmet } from 'react-helmet-async';
import { Header } from '@/components/layout/Header';
import { HeroSection } from '@/components/home/HeroSection';
import { FloatingSettingsButton } from '@/components/settings/FloatingSettingsButton';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>AniQuizz - Le Blindtest Anime Nouvelle Génération</title>
        <meta name="description" content="Testez votre culture anime avec AniQuizz" />
      </Helmet>
      
      <div className="min-h-screen bg-background relative">
        <Header />
        
        <main className="pt-24">
          <HeroSection />
        </main>
        
        <FloatingSettingsButton />

        {/* INDICATEUR DE VERSION */}
        <div className="fixed bottom-4 left-6 text-[14px] font-mono font-bold text-muted-foreground/40 pointer-events-none z-50">
            v0.1 Alpha
        </div>
      </div>
    </>
  );
};

export default Index;