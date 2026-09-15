import { SeoHead } from '@/components/seo/SeoHead';
import { SkipLinkTarget } from '@/components/a11y/SkipLink';
import { PAGE_TITLES, SITE_VERSION } from '@/lib/site';
import { homeJsonLd } from '@/lib/jsonLd';

// Layout
import { Header } from '@/components/layout/Header';

// Home feature sections
import { HeroSection } from '@/features/home/components/HeroSection';
import { FriendsBubble } from '@/features/friends/FriendsBubble';

const Home = () => {
  return (
    <>
      <SeoHead homeOnly title={PAGE_TITLES.home} path="/" jsonLd={homeJsonLd()} />

      {/* Lock the page to the viewport; scroll lives on <main> so short / landscape
          screens can reach CTAs and news. Header is `fixed` (pt-16). */}
      <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-background font-sans">
        <Header />

        <main
          id={SkipLinkTarget}
          className="relative flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto overscroll-y-contain px-4 pt-16 pb-16 custom-scrollbar"
        >
          {/* my-auto centers when content fits; unlike justify-center it does not
              clip overflow at both ends — extra height scrolls from the top. */}
          <div className="my-auto w-full">
            <HeroSection />
          </div>
        </main>

        <FriendsBubble />

        {/* Version tag */}
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 text-[12px] font-mono font-bold text-muted-foreground/30 pointer-events-none z-40 select-none hidden md:block">
          v{SITE_VERSION}
        </div>
      </div>
    </>
  );
};

export default Home;
