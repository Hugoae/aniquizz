import { Trophy, Timer, AudioLines } from 'lucide-react';
import type { GameType } from '@aniquizz/shared';
import { gameTypeLabel } from '@/features/hub/copy/hubCopy';
import { pick, tx } from '@/lib/i18n/text';
import { cn } from '@/lib/utils';
import { FOCUS_RING } from '@/features/hub/components/config/ConfigPrimitives';
import { modeChrome } from '@/features/hub/components/modeChrome';

const GAME_TYPES: { id: GameType; icon: typeof Trophy; description: string; soloOnly?: boolean }[] =
  [
    {
      id: 'standard',
      icon: Trophy,
      get description() {
        return pick(
          'Devinez le plus de sons et remportez des points',
          'Guess the most songs and score points',
        );
      },
    },
    {
      id: 'timeAttack',
      icon: Timer,
      get description() {
        return pick(
          'Trouvez le plus de titres avant la fin du temps',
          'Find the most songs before time runs out',
        );
      },
    },
    {
      id: 'evolving',
      icon: AudioLines,
      get description() {
        return pick(
          "L'extrait s'allonge tant que tu ne trouves pas : 0,25 s, 0,5 s, 1 s, puis jusqu'à 15 s",
          'The clip grows until you find it: 0.25 s, 0.5 s, 1 s, then up to 15 s',
        );
      },
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
    <div
      className={cn(
        'flex flex-col gap-3 overflow-visible pt-2 sm:flex-row sm:items-stretch',
        className,
      )}
    >
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
                'relative flex flex-1 flex-col items-start gap-1 overflow-visible rounded-xl border px-4 py-3 text-left transition-colors',
                active
                  ? cn(chrome.selected, 'shadow-sm')
                  : 'border-border/60 bg-card/40 hover:border-border hover:bg-card/70',
                FOCUS_RING,
              )}
            >
              {id === 'evolving' ? (
                <span
                  aria-hidden="true"
                  className="animate-new-pill pointer-events-none absolute left-1/2 top-0 z-10 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-black uppercase leading-none tracking-wide text-primary-foreground"
                >
                  New
                </span>
              ) : null}
              <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Icon
                  className={cn(
                    'h-4 w-4',
                    active ? chrome.icon : 'text-muted-foreground',
                    active && chrome.fillIcon && 'fill-current',
                  )}
                  aria-hidden="true"
                />
                {gameTypeLabel(id)}
              </span>
              <span className="text-xs leading-snug text-muted-foreground">
                {versus && id === 'timeAttack' ? tx('hub', 'config.raceHint') : description}
              </span>
            </button>
          );
        },
      )}
    </div>
  );
}
