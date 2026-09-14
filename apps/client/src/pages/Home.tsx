import { SeoHead } from '@/components/seo/SeoHead';
import { SkipLinkTarget } from '@/components/a11y/SkipLink';
import { PAGE_TITLES } from '@/lib/site';
import { homeJsonLd } from '@/lib/jsonLd';

// Layout
import { Header } from '@/components/layout/Header';
import { FloatingSettingsButton } from '@/features/settings/components/FloatingSettingsButton';

// Home feature sections
import { HeroSection } from '@/features/home/components/HeroSection';
import { FriendsBubble } from '@/features/friends/FriendsBubble';

const Home = () => {
  return (
    <>
      <SeoHead homeOnly title={PAGE_TITLES.home} path="/" jsonLd={homeJsonLd()} />

      {/* Single-screen landing: fixed viewport height, no scroll. */}
      <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background font-sans">
        <Header />

        <main
          id={SkipLinkTarget}
          className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center px-4 pt-16"
        >
          <HeroSection />
        </main>

        <FriendsBubble />

        <FloatingSettingsButton />

        {/* Version tag */}
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 text-[12px] font-mono font-bold text-muted-foreground/30 pointer-events-none z-40 select-none hidden md:block">
          v26.6
        </div>
      </div>
    </>
  );
};

export default Home;
