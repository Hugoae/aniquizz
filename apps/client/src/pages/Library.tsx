import { Music } from 'lucide-react';
import { ComingSoonPage } from '@/components/pages/ComingSoonPage';

export default function Library() {
  return (
    <ComingSoonPage
      helmetTitle="Librairie - AniQuizz"
      helmetDescription="La librairie musicale arrive bientôt sur AniQuizz."
      backLabel="Retour à l'accueil"
      backTo="/"
      icon={Music}
      iconClassName="text-primary"
      glowClassName="bg-primary/20"
      headingClassName="gradient-text"
      showHeader
      description={
        <>
          La plus grande librairie musicale d&apos;anime est en cours de construction.
          Préparez vos playlists, ça arrive très vite !
        </>
      }
    />
  );
}
