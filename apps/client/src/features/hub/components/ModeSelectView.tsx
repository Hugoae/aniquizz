/** Play landing — mode cards, daily-quiz teaser, and navigation into solo/multi flows. */
import { useMemo } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, User, Users, Swords } from 'lucide-react';
import type { GameMode } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { getPlayBannedMessage, isSanctionActive, useSanctionTicker } from '@/lib/suspension';
import { ModeCard, type ModeCardData } from './ModeCard';
import { DailyQuizCard } from './DailyQuizCard';

/** Static game-mode roster. Gradients use design tokens only; teasers are added at render. */
const MODE_CARDS: ModeCardData[] = [
  {
    id: 'solo',
    title: 'Solo',
    description: 'Entraînez-vous seul et améliorez vos scores',
    icon: User,
    gradient: 'from-info to-accent',
  },
  {
    id: 'multiplayer',
    title: 'Multijoueur',
    description: 'Affrontez vos amis ou des joueurs du monde entier',
    icon: Users,
    gradient: 'from-primary to-primary-glow',
  },
  {
    id: 'competitive',
    title: 'Compétitif',
    description: 'Mode classé avec rangs et saisons.',
    icon: Swords,
    gradient: 'from-destructive/90 to-destructive',
    iconClassName: 'text-destructive-foreground',
    disabled: true,
    badge: 'Bientôt',
  },
];

interface ModeSelectViewProps {
  onSelectMode: (mode: GameMode) => void;
  onBack: () => void;
  /** Live count of players currently in multiplayer rooms, for the Multiplayer teaser. */
  multiplayerCount: number;
  /** Active moderation ban — blocks Solo and Multiplayer. */
  bannedUntil?: string | null;
}

/** The Play landing screen: pick a game mode. */
export function ModeSelectView({ onSelectMode, onBack, multiplayerCount, bannedUntil }: ModeSelectViewProps) {
  const playBanned = isSanctionActive(bannedUntil);
  useSanctionTicker(playBanned);

  const cards = useMemo<ModeCardData[]>(() => {
    return MODE_CARDS.map((card) => {
      if (card.id === 'multiplayer') {
        return { ...card, teaser: `${multiplayerCount} joueur${multiplayerCount > 1 ? 's' : ''} en multijoueur` };
      }
      return card;
    });
  }, [multiplayerCount]);

  const showPlayBannedToast = () => {
    toast.error(getPlayBannedMessage(bannedUntil));
  };

  const handleSelect = (mode: GameMode) => {
    if (playBanned && (mode === 'solo' || mode === 'multiplayer')) {
      showPlayBannedToast();
      return;
    }
    onSelectMode(mode);
  };

  return (
    <div>
      <Button
        variant="ghost"
        onClick={onBack}
        className="gap-2 mb-6 text-muted-foreground hover:text-foreground pl-0"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à l'accueil
      </Button>

      <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 animate-fade-in">
        Choisissez votre <span className="gradient-text">mode de jeu</span>
      </h1>
      <p className="text-center text-muted-foreground mb-8 md:mb-12 animate-fade-in">
        Sélectionnez un mode pour configurer votre partie
      </p>

      <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-8">
        {cards.map((mode, index) => (
          <ModeCard
            key={mode.id}
            mode={mode}
            index={index}
            onSelect={handleSelect}
            blocked={playBanned && (mode.id === 'solo' || mode.id === 'multiplayer')}
            onBlocked={showPlayBannedToast}
          />
        ))}
      </div>

      <DailyQuizCard />
    </div>
  );
}
