import { Helmet } from 'react-helmet-async';

// Layout
import { Header } from '@/components/layout/Header';
import { FloatingSettingsButton } from '@/features/settings/components/FloatingSettingsButton';

// Home feature sections
import { HeroSection } from '@/features/home/components/HeroSection';
import { FriendsBubble } from '@/features/friends/FriendsBubble';

const Home = () => {
  return (
    <>
      <Helmet>
        <title>AniQuizz - Le Blindtest Anime Nouvelle Génération</title>
        <meta name="description" content="Testez votre culture anime avec AniQuizz" />
      </Helmet>

      {/* Single-screen landing: fixed viewport height, no scroll. */}
      <div className="h-[100dvh] bg-background relative overflow-hidden flex flex-col font-sans">

        <Header />

        <main className="flex-1 min-h-0 flex flex-col items-center justify-center relative w-full px-4 pt-16">
          <HeroSection />
        </main>

        <FriendsBubble />

        <FloatingSettingsButton />

        {/* Version tag */}
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 text-[12px] font-mono font-bold text-muted-foreground/30 pointer-events-none z-40 select-none hidden md:block">
            v0.4 Alpha
        </div>
      </div>
    </>
  );
};

export default Home;