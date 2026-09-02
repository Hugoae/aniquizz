import { SeoHead } from '@/components/seo/SeoHead';
import { PAGE_TITLES } from '@/lib/site';
import { LeaderboardPageContent } from '@/features/leaderboard/components/LeaderboardPageContent';

export default function Leaderboard() {
  return (
    <>
      <SeoHead
        title={PAGE_TITLES.leaderboard}
        description="Classement AniQuizz : XP, victoires, parties jouées, Pokédex musical et précision."
        path="/leaderboard"
      />
      <LeaderboardPageContent />
    </>
  );
}
