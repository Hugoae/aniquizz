import { Trophy, Sparkles } from 'lucide-react';
import { ComingSoonPage } from '@/components/pages/ComingSoonPage';
import { PAGE_TITLES } from '@/lib/site';

export default function Leaderboard() {
  return (
    <ComingSoonPage
      helmetTitle={PAGE_TITLES.leaderboard}
      helmetDescription="Le classement global arrive bientôt sur AniQuizz."
      canonicalPath="/leaderboard"
      backLabel="Retour à l'accueil"
      backTo="/"
      icon={Trophy}
      iconClassName="text-warning"
      glowClassName="bg-warning/20"
      headingClassName="bg-gradient-to-r from-warning to-primary bg-clip-text text-transparent"
      secondaryIcon={Sparkles}
      secondaryIconClassName="text-warning"
      showHeader
      description={
        <>
          Classements globaux par niveau, victoires, précision et bien plus.
          Le <span className="font-bold text-foreground">Classement</span> arrive prochainement !
        </>
      }
    />
  );
}
