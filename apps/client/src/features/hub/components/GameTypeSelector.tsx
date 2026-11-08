import { Trophy, Timer } from 'lucide-react';
import type { GameType } from '@aniquizz/shared';
import { GAME_TYPE_LABELS } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from '@/features/hub/components/config/ConfigPrimitives';

const GAME_TYPES: { id: GameType; icon: typeof Trophy; description: string }[] = [
  {
    id: 'standard',
    icon: Trophy,
    description: 'Devinez le plus de sons et remportez des points',
  },
  {
    id: 'timeAttack',
    icon: Timer,
    description: 'Trouvez le plus de titres avant la fin du temps',
  },
];

interface GameTypeSelectorProps {
  value: GameType;
  onChange: (gameType: GameType) => void;
  className?: string;
  /** Multiplayer room: Chrono is a parallel race, so the blurb says so. */
  versus?: boolean;
}

/** Standard or Chrono. In a multiplayer room, Chrono runs as a versus race (2 to 8 players). */
export function GameTypeSelector({
  value,
  onChange,
  className,
  versus = false,
}: GameTypeSelectorProps) {
  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-stretch', className)}>
      {GAME_TYPES.map(({ id, icon: Icon, description }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(id)}
            className={cn(
              'flex flex-1 flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-colors',
              active
                ? 'border-primary/50 bg-primary/10 shadow-sm'
                : 'border-border/60 bg-card/40 hover:border-border hover:bg-card/70',
              FOCUS_RING,
            )}
          >
            <span className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Icon
                className={cn(
                  'h-4 w-4',
                  active
                    ? id === 'timeAttack'
                      ? 'text-aqua'
                      : 'text-primary'
                    : 'text-muted-foreground',
                  id === 'standard' && active && 'fill-current',
                )}
                aria-hidden="true"
              />
              {GAME_TYPE_LABELS[id]}
            </span>
            <span className="text-xs leading-snug text-muted-foreground">
              {versus && id === 'timeAttack'
                ? 'Course en parallèle : chacun sa voie, le plus de titres gagne'
                : description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
