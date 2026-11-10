import { Trophy, Timer, AudioLines } from 'lucide-react';
import type { GameType } from '@aniquizz/shared';
import { GAME_TYPE_LABELS } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from '@/features/hub/components/config/ConfigPrimitives';
import { modeChrome } from '@/features/hub/components/modeChrome';

const GAME_TYPES: { id: GameType; icon: typeof Trophy; description: string; soloOnly?: boolean }[] =
  [
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
    {
      id: 'evolving',
      icon: AudioLines,
      description:
        "L'extrait s'allonge tant que tu ne trouves pas : 0,25 s, 0,5 s, 1 s, puis jusqu'à 15 s",
      soloOnly: true,
    },
  ];

interface GameTypeSelectorProps {
  value: GameType;
  onChange: (gameType: GameType) => void;
  className?: string;
  /** Multiplayer room: Chrono is a parallel race, so the blurb says so. */
  versus?: boolean;
}

/** Standard, Chrono, or Évolutif. Évolutif is solo only. Chrono in a room is a versus race. */
export function GameTypeSelector({
  value,
  onChange,
  className,
  versus = false,
}: GameTypeSelectorProps) {
  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-stretch', className)}>
      {GAME_TYPES.filter((type) => !versus || !type.soloOnly).map(
        ({ id, icon: Icon, description }) => {
          const active = value === id;
          const chrome = modeChrome(id);
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(id)}
              className={cn(
                'flex flex-1 flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition-colors',
                active
                  ? cn(chrome.selected, 'shadow-sm')
                  : 'border-border/60 bg-card/40 hover:border-border hover:bg-card/70',
                FOCUS_RING,
              )}
            >
              <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Icon
                  className={cn(
                    'h-4 w-4',
                    active ? chrome.icon : 'text-muted-foreground',
                    active && chrome.fillIcon && 'fill-current',
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
        },
      )}
    </div>
  );
}
