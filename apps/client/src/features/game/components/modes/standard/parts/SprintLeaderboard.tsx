import { Timer, X } from 'lucide-react';
import type { SprintLeaderboardPayload } from '@aniquizz/shared';
import { formatSprintTimeSeconds } from '@aniquizz/shared';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { cn } from '@/lib/utils';

interface SprintLeaderboardProps {
  data: SprintLeaderboardPayload;
  currentUserId: string;
  myAvatar: string;
  compact?: boolean;
}

function SprintRow({
  rank,
  username,
  avatar,
  timeMs,
  wrong,
  highlight,
}: {
  rank?: number;
  username: string;
  avatar: string;
  timeMs: number | null;
  wrong?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-2.5 py-2',
        highlight ? 'border-primary/40 bg-primary/10' : 'border-border/60 bg-card/80',
      )}
    >
      {rank != null && (
        <span className="w-5 shrink-0 text-center text-[11px] font-black text-muted-foreground">#{rank}</span>
      )}
      <UserAvatar avatar={avatar} username={username} className="h-7 w-7 shrink-0" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{username}</span>
      {timeMs != null && (
        <span className="flex shrink-0 items-center gap-1 font-mono text-xs font-bold tabular-nums text-accent">
          <Timer className="h-3 w-3" aria-hidden="true" />
          {formatSprintTimeSeconds(timeMs)} s
        </span>
      )}
      {wrong && (
        <span className="flex shrink-0 items-center" aria-label="Réponse incorrecte">
          <X className="h-4 w-4 stroke-[3] text-destructive" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

/** Reveal-only Sprint speed board — top 3 correct answerers plus a "Vous" row. */
export function SprintLeaderboard({ data, currentUserId, myAvatar, compact }: SprintLeaderboardProps) {
  const { top, you } = data;
  const yourTimeMs = you.isCorrect === true ? you.timeMs : null;

  return (
    <div
      className={cn(
        'glass-card flex w-full flex-col gap-2 border-border/60 p-3 animate-fade-in',
        compact ? 'max-w-[850px]' : 'max-w-[640px]',
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Classement vitesse</p>

      <div className="flex flex-col gap-1.5">
        {top.length === 0 ? (
          <p className="py-1 text-center text-xs text-muted-foreground">Personne n&apos;a trouvé à temps.</p>
        ) : (
          top.map((entry, index) => (
            <SprintRow
              key={entry.userId}
              rank={index + 1}
              username={entry.username}
              avatar={entry.avatar}
              timeMs={entry.timeMs}
              highlight={entry.userId === currentUserId}
            />
          ))
        )}
      </div>

      <div className="my-2 border-t border-border/50" aria-hidden="true" />

      <SprintRow username="Vous" avatar={myAvatar} timeMs={yourTimeMs} wrong={you.isCorrect === false} highlight />
    </div>
  );
}
