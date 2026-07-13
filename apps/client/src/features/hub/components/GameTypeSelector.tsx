import { Trophy, Zap } from 'lucide-react';
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
    id: 'sprint',
    icon: Zap,
    description: 'Comme Standard mais gagnez plus de points en répondant plus vite que vos adversaires',
  },
];

interface GameTypeSelectorProps {
  value: GameType;
  onChange: (gameType: GameType) => void;
  /** Solo only exposes Standard for now. */
  soloOnly?: boolean;
  className?: string;
}

export function GameTypeSelector({ value, onChange, soloOnly = false, className }: GameTypeSelectorProps) {
  const options = soloOnly ? GAME_TYPES.filter((t) => t.id === 'standard') : GAME_TYPES;

  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-stretch', className)}>
      {options.map(({ id, icon: Icon, description }) => {
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
                className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground', id === 'standard' && active && 'fill-current')}
                aria-hidden="true"
              />
              {GAME_TYPE_LABELS[id]}
            </span>
            <span className="text-xs leading-snug text-muted-foreground">{description}</span>
          </button>
        );
      })}
    </div>
  );
}
