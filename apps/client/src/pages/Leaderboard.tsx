import { Trophy, Sparkles } from 'lucide-react';
import { ComingSoonPage } from '@/components/pages/ComingSoonPage';

export default function Leaderboard() {
  return (
    <ComingSoonPage
      helmetTitle="Classement - AniQuizz"
      helmetDescription="Le classement global arrive bientôt sur AniQuizz."
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
