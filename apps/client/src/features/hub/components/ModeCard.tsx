import type { LucideIcon } from 'lucide-react';
import type { GameMode } from '@aniquizz/shared';
import { cn } from '@/lib/utils';

export interface ModeCardData {
  id: GameMode;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind gradient classes, palette-token based (no raw colors). */
  gradient: string;
  /** Optional icon color override (defaults to foreground). */
  iconClassName?: string;
  disabled?: boolean;
  /** Small pill shown top-right (e.g. "Bientôt"). */
  badge?: string;
  /** Dynamic hint shown under the description (e.g. "12 joueurs en ligne"). */
  teaser?: string;
}

interface ModeCardProps {
  mode: ModeCardData;
  /** Index for the staggered fade-in animation. */
  index: number;
  onSelect: (id: GameMode) => void;
  /** When true, click shows a toast instead of selecting (e.g. active ban). */
  blocked?: boolean;
  onBlocked?: () => void;
}

function ModeCardContent({ mode, interactive }: { mode: ModeCardData; interactive: boolean }) {
  const Icon = mode.icon;

  return (
    <>
      {mode.badge && (
        <span className="absolute right-4 top-4 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {mode.badge}
        </span>
      )}

      <div className="mb-6 flex h-[4.5rem] shrink-0 items-center">
        <div
          className={cn(
            'inline-flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-lg bg-gradient-to-br',
            mode.gradient,
          )}
        >
          <Icon className={cn('h-8 w-8', mode.iconClassName ?? 'text-foreground')} aria-hidden />
        </div>
      </div>

      <h2
        className={cn(
          'mb-3 min-h-[2.25rem] shrink-0 text-3xl font-bold leading-tight',
          interactive && 'transition-colors group-hover:text-primary',
        )}
      >
        {mode.title}
      </h2>

      <p className="min-h-[4.75rem] shrink-0 text-base leading-relaxed text-muted-foreground">
        {mode.description}
      </p>

      <div className="mt-4 min-h-[1.5rem] shrink-0">
        {mode.teaser ? (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground/80">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
            {mode.teaser}
          </span>
        ) : null}
      </div>
    </>
  );
}

const cardShellClass = 'glass-card relative flex h-full min-h-[300px] animate-fade-in flex-col overflow-hidden p-10 text-left';

export function ModeCard({ mode, index, onSelect, blocked = false, onBlocked }: ModeCardProps) {
  const animationStyle = { animationDelay: `${index * 0.1}s` };

  if (mode.disabled) {
    return (
      <div
        aria-disabled="true"
        aria-label={`${mode.title} — ${mode.description}`}
        style={animationStyle}
        className={cn(cardShellClass, 'cursor-not-allowed opacity-60 grayscale-[0.3]')}
      >
        <ModeCardContent mode={mode} interactive={false} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (blocked) {
          onBlocked?.();
          return;
        }
        onSelect(mode.id);
      }}
      aria-label={`${mode.title} — ${mode.description}`}
      style={animationStyle}
      className={cn(
        cardShellClass,
        blocked
          ? 'cursor-not-allowed opacity-60 grayscale-[0.35]'
          : 'group cursor-pointer transition-all hover-lift hover-glow',
        !blocked &&
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      <ModeCardContent mode={mode} interactive={!blocked} />
    </button>
  );
}
