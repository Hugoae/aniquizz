/** Play landing — mode cards, daily-quiz teaser, and navigation into solo/multi flows. */
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, User, Users, Swords } from 'lucide-react';
import type { GameMode } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { getPlayBannedMessage, isSanctionActive, useSanctionTicker } from '@/lib/suspension';
import { dailyApi } from '@/lib/dailyApi';
import { ModeCard, type ModeCardData } from './ModeCard';
import { DailyQuizCard } from './DailyQuizCard';
import { HUB_COPY, multiplayerTeaser } from '@/features/hub/copy/hubCopy';

/** Static game-mode roster. Gradients use design tokens only; teasers are added at render. */
const MODE_CARDS: ModeCardData[] = [
  {
    id: 'solo',
    title: HUB_COPY.modes.solo.title,
    description: HUB_COPY.modes.solo.description,
    icon: User,
    gradient: 'from-info to-accent',
  },
  {
    id: 'multiplayer',
    title: HUB_COPY.modes.multiplayer.title,
    description: HUB_COPY.modes.multiplayer.description,
    icon: Users,
    gradient: 'from-primary to-primary-glow',
  },
  {
    id: 'competitive',
    title: HUB_COPY.modes.competitive.title,
    description: HUB_COPY.modes.competitive.description,
    icon: Swords,
    gradient: 'from-destructive/90 to-destructive',
    iconClassName: 'text-destructive-foreground',
    disabled: true,
    badge: HUB_COPY.modes.competitive.badge,
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
export function ModeSelectView({
  onSelectMode,
  onBack,
  multiplayerCount,
  bannedUntil,
}: ModeSelectViewProps) {
  const playBanned = isSanctionActive(bannedUntil);
  useSanctionTicker(playBanned);

  useEffect(() => {
    void dailyApi.today().catch(() => undefined);
  }, []);

  const cards = useMemo<ModeCardData[]>(() => {
    return MODE_CARDS.map((card) => {
      if (card.id === 'multiplayer') {
        return {
          ...card,
          teaser: multiplayerTeaser(multiplayerCount),
        };
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
        {HUB_COPY.backHome}
      </Button>

      <h1 className="text-3xl md:text-4xl font-bold text-center mb-4 animate-fade-in">
        {HUB_COPY.modeTitleLead} <span className="gradient-text">{HUB_COPY.modeTitleAccent}</span>
      </h1>
      <p className="text-center text-muted-foreground mb-8 md:mb-12 animate-fade-in">
        {HUB_COPY.modeSubtitle}
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
