import React from 'react';
import { WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';

export interface PlayerCardBaseProps {
  player: {
    id: string | number;
    name?: string;
    username?: string;
    avatar: string;
    score: number;
    isEliminated?: boolean;
    isCorrect?: boolean | null;
    isConnected?: boolean;
  };
  isCurrentUser?: boolean;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
  topRightContent?: React.ReactNode;
  topLeftContent?: React.ReactNode;
  bubbleContent?: React.ReactNode;
}

export function PlayerCardBase({
  player,
  isCurrentUser,
  onClick,
  className,
  children,
  topRightContent,
  topLeftContent,
  bubbleContent,
}: PlayerCardBaseProps) {
  const displayName = player.name || player.username || 'Joueur';
  const hasChildren = React.Children.count(children) > 0;
  const isDisconnected = player.isConnected === false;

  return (
    <div
      className={cn(
        'group relative flex w-full min-w-[150px] items-center gap-2.5 overflow-visible rounded-xl border p-2.5 shadow-lg backdrop-blur-md transition-all duration-300',
        player.isEliminated
          ? 'border-destructive/30 bg-destructive/10 opacity-60 grayscale'
          : isDisconnected
            ? 'border-border/40 bg-card/40 opacity-50 grayscale'
            : isCurrentUser
              ? 'border-primary/40 bg-primary/10 shadow-primary/10'
              : 'border-border/60 bg-card/60 hover:bg-card/80',
        className,
      )}
      onClick={onClick}
    >
      {topLeftContent}
      {topRightContent}
      {bubbleContent}

      <div className="relative shrink-0">
        <UserAvatar
          avatar={player.avatar}
          username={displayName}
          className={cn('h-10 w-10 border-2 shadow-sm transition-all', isCurrentUser ? 'border-primary' : 'border-border')}
        />
        {isDisconnected && (
          <span
            className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-muted"
            title="Déconnecté"
            aria-label="Déconnecté"
          >
            <WifiOff className="h-2.5 w-2.5 text-muted-foreground" />
          </span>
        )}
      </div>

      <div className="flex h-full min-w-0 flex-1 flex-col justify-center">
        <div className={cn('flex w-full items-center justify-between gap-3', !hasChildren && 'h-full')}>
          <span className={cn('min-w-0 flex-1 truncate text-sm font-bold', isCurrentUser ? 'text-primary' : 'text-foreground')} title={displayName}>
            {displayName}
          </span>
          <div className="flex shrink-0 items-baseline gap-1 whitespace-nowrap font-mono text-xl font-black leading-none tracking-tight">
            {player.score}
            <span className="text-[10px] font-normal text-muted-foreground">pts</span>
          </div>
        </div>

        {hasChildren && <div className="mt-1 flex h-4 w-full animate-in items-center justify-between fade-in">{children}</div>}
      </div>
    </div>
  );
}
