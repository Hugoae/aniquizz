import { useMemo } from 'react';
import { Users } from 'lucide-react';
import type { FriendSummary } from '@aniquizz/shared';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { cn } from '@/lib/utils';
import { presenceLabel, formatLastSeen, PRESENCE_DOT } from './presence';

/** Read-only friends list for a public profile. Clicking a friend opens theirs. */
export function PublicFriendsList({
  friends,
  onOpen,
}: {
  friends: FriendSummary[];
  onOpen: (userId: string) => void;
}) {
  // Online first, then offline; alphabetical within each group.
  const sorted = useMemo(
    () =>
      [...friends].sort((a, b) => {
        const rank = (f: FriendSummary) => (f.status === 'offline' ? 1 : 0);
        const byStatus = rank(a) - rank(b);
        if (byStatus !== 0) return byStatus;
        return a.username.localeCompare(b.username, 'fr', { sensitivity: 'base' });
      }),
    [friends],
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Amis ({friends.length})</h2>
      </div>

      <div className="glass-card bg-card/40 rounded-xl overflow-hidden">
        <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-2 space-y-1">
          {sorted.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center gap-2 text-center text-muted-foreground/60 text-sm px-4">
              <Users className="h-8 w-8 opacity-40" />
              Aucun ami pour l'instant.
            </div>
          ) : (
            sorted.map((f) => (
              <button
                key={f.id}
                onClick={() => onOpen(f.id)}
                className="group flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-secondary"
              >
                <span className="relative shrink-0">
                  <UserAvatar avatar={f.avatar} username={f.username} className="h-9 w-9" />
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card',
                      PRESENCE_DOT[f.status],
                    )}
                    title={presenceLabel(f.status)}
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="block truncate text-sm font-semibold">{f.username}</span>
                    <RoleBadge role={f.role} size={14} />
                  </span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {f.status === 'offline'
                      ? formatLastSeen(f.lastSeenAt)
                      : f.roomName
                        ? `${presenceLabel(f.status)} · ${f.roomName}`
                        : presenceLabel(f.status)}
                    {' · '}Niv. {f.level}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
