import { ChevronRight } from 'lucide-react';
import { levelProgress } from '@aniquizz/shared';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ProfileButtonProps {
  username?: string;
  avatar?: string;
  xp?: number;
  onClick?: () => void;
  /** Warm the target route chunk on hover/focus so the click navigates instantly. */
  onPrefetch?: () => void;
  className?: string;
  /** Reserved shell while the Supabase profile row is still loading. */
  loading?: boolean;
}

/** Shared profile chip: XP ring, level badge, avatar, username. Used in the site header and in-game. */
export function ProfileButton({
  username = '',
  avatar = '',
  xp = 0,
  onClick,
  onPrefetch,
  className,
  loading = false,
}: ProfileButtonProps) {
  if (loading) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 rounded-full border border-border/60 bg-secondary/30 py-1 pl-1 pr-2.5',
          className,
        )}
        aria-busy="true"
        aria-label="Chargement du profil"
      >
        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
        <Skeleton className="hidden h-4 w-20 rounded md:block" />
      </div>
    );
  }

  const { level, percent } = levelProgress(xp);

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerEnter={onPrefetch}
      onFocus={onPrefetch}
      onPointerDown={onPrefetch}
      title="Mon profil"
      aria-label={`Profil de ${username}, niveau ${level}`}
      className={cn(
        'group flex cursor-pointer items-center gap-2 rounded-full border border-border/60 bg-secondary/30 py-1 pl-1 pr-2.5 transition-all',
        'hover:border-primary/40 hover:bg-secondary/55',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
    >
      <div className="relative shrink-0">
        <div
          className="rounded-full p-[2.5px]"
          style={{
            background: `conic-gradient(hsl(var(--primary)), hsl(var(--accent)) ${percent}%, hsl(var(--secondary)) ${percent}%)`,
          }}
        >
          <div className="rounded-full bg-background p-[1.5px]">
            <UserAvatar avatar={avatar} username={username} className="h-8 w-8" />
          </div>
        </div>
        <span className="absolute -bottom-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-background bg-accent px-1 font-mono text-[9px] font-bold leading-none text-accent-foreground">
          {level}
        </span>
      </div>
      <span className="hidden text-sm font-bold transition-colors group-hover:text-primary md:inline">
        {username}
      </span>
      <ChevronRight
        className="hidden h-4 w-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary md:inline"
        aria-hidden
      />
    </button>
  );
}
