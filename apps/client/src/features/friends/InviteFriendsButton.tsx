import { UserPlus, Send } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { useFriends } from './FriendsContext';
import { presenceLabel } from './presence';

/**
 * Lobby-side control to invite friends into the current room. Lists online
 * friends; the server validates the caller is in a room + injects the invite.
 */
interface InviteFriendsButtonProps {
  /** Ids of players already in the room, hidden from the invite list. */
  excludeIds?: Array<string | number>;
}

export function InviteFriendsButton({ excludeIds = [] }: InviteFriendsButtonProps) {
  const { friends, invite } = useFriends();
  const excluded = new Set(excludeIds.map(String));
  const online = friends.filter((f) => f.status !== 'offline' && !excluded.has(String(f.id)));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className="gap-2 bg-secondary/50 hover:bg-secondary border border-border rounded-lg"
        >
          <UserPlus className="h-4 w-4" />
          Inviter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-1">
        <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Amis en ligne ({online.length})
        </div>
        {online.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            Aucun ami en ligne à inviter.
          </div>
        ) : (
          online.map((f) => (
            <div key={f.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5">
              <UserAvatar avatar={f.avatar} username={f.username} className="h-8 w-8" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="truncate text-sm font-medium">{f.username}</span>
                  <RoleBadge role={f.role} size={14} />
                </div>
                <div className="truncate text-[11px] text-muted-foreground">{presenceLabel(f.status)}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-primary"
                title="Inviter"
                onClick={() => invite(f.id)}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
