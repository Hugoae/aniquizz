import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  AdminUserRowActions,
  type AdminUserRowPending,
} from '@/features/admin/components/AdminUserRowActions';
import { ADMIN_COPY } from '@/features/admin/copy/adminCopy';
import { adminApi, type AdminUser, type Presence, type Role } from '@/lib/adminApi';
import { cn } from '@/lib/utils';
import {
  formatRelativeFromNow,
  formatRemaining,
  isSanctionActive,
  useSanctionTicker,
} from '@/lib/suspension';

const ROLE_OPTIONS: Role[] = ['USER', 'MODERATOR', 'ADMIN'];

const roleBadgeClass: Record<Role, string> = {
  USER: 'bg-secondary text-foreground',
  MODERATOR: 'bg-info/20 text-info',
  ADMIN: 'bg-primary/20 text-primary',
};

const PRESENCE_META: Record<Presence, { label: string; dot: string; text: string }> = {
  online: { label: ADMIN_COPY.presence.online, dot: 'bg-success', text: 'text-success' },
  in_game: { label: ADMIN_COPY.presence.inGame, dot: 'bg-primary', text: 'text-primary' },
  offline: {
    label: ADMIN_COPY.presence.offline,
    dot: 'bg-muted-foreground/30',
    text: 'text-muted-foreground',
  },
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export type { AdminUserRowPending };

type AdminUserRowProps = {
  user: AdminUser;
  canManage: boolean;
  isSelf: boolean;
  onOpenDetail: (user: AdminUser) => void;
  onGoToRoom?: (roomId: string) => void;
  onSetPending: (pending: AdminUserRowPending) => void;
};

function adminUserRowEqual(prev: AdminUserRowProps, next: AdminUserRowProps): boolean {
  const a = prev.user;
  const b = next.user;
  return (
    prev.canManage === next.canManage &&
    prev.isSelf === next.isSelf &&
    a.id === b.id &&
    a.username === b.username &&
    a.email === b.email &&
    a.avatar === b.avatar &&
    a.role === b.role &&
    a.presence === b.presence &&
    a.gamesPlayed === b.gamesPlayed &&
    a.level === b.level &&
    a.bannedUntil === b.bannedUntil &&
    a.mutedUntil === b.mutedUntil &&
    a.lastSeenAt === b.lastSeenAt &&
    a.createdAt === b.createdAt &&
    a.currentRoom?.id === b.currentRoom?.id &&
    a.currentRoom?.name === b.currentRoom?.name &&
    prev.onOpenDetail === next.onOpenDetail &&
    prev.onGoToRoom === next.onGoToRoom &&
    prev.onSetPending === next.onSetPending
  );
}

export const AdminUserRow = memo(function AdminUserRow({
  user: u,
  canManage,
  isSelf,
  onOpenDetail,
  onGoToRoom,
  onSetPending,
}: AdminUserRowProps) {
  const banned = isSanctionActive(u.bannedUntil);
  const muted = isSanctionActive(u.mutedUntil);
  useSanctionTicker(banned || muted);

  const openProfile = () => {
    if (!isSelf) onOpenDetail(u);
  };

  return (
    <tr
      className={cn(
        'border-b border-border/50',
        isSelf ? 'cursor-default' : 'hover:bg-secondary/50 cursor-pointer',
      )}
      onClick={openProfile}
      onKeyDown={
        isSelf
          ? undefined
          : (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenDetail(u);
              }
            }
      }
      tabIndex={isSelf ? undefined : 0}
      aria-label={isSelf ? undefined : ADMIN_COPY.users.openProfile(u.username)}
    >
      <td className="px-3 py-2">
        <div className="flex items-start gap-2">
          <UserAvatar avatar={u.avatar} username={u.username} className="h-8 w-8 shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold flex items-center gap-2 transition-colors hover:text-primary">
              {u.username}
            </div>
            <div className="text-xs text-muted-foreground truncate">{u.email}</div>
            <div className="text-[11px] text-muted-foreground/70">
              {ADMIN_COPY.users.registeredOn(formatDate(u.createdAt))}
            </div>
          </div>
        </div>
      </td>

      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        {canManage && !isSelf ? (
          <select
            className="bg-background border border-border rounded px-2 py-1"
            value={u.role}
            aria-label={ADMIN_COPY.users.roleLabel(u.username)}
            onChange={(e) => {
              const nextRole = e.target.value as Role;
              if (nextRole === u.role) return;
              onSetPending({
                title: ADMIN_COPY.users.roleChangeTitle(u.username),
                description: ADMIN_COPY.users.roleChangeBody(u.username, u.role, nextRole),
                confirmLabel: ADMIN_COPY.users.confirm,
                action: () => adminApi.setRole(u.id, nextRole),
                successMsg: ADMIN_COPY.users.roleUpdated,
                targetUserId: u.id,
              });
            }}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <Badge className={roleBadgeClass[u.role]}>{u.role}</Badge>
        )}
      </td>

      <td className="px-3 py-2">{ADMIN_COPY.users.gamesLevel(u.gamesPlayed, u.level)}</td>

      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        {u.currentRoom ? (
          <button
            className="text-primary hover:underline"
            onClick={() => onGoToRoom?.(u.currentRoom!.id)}
          >
            {u.currentRoom.name}
          </button>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      <td className="px-3 py-2">
        {u.presence !== 'offline' ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {formatRelativeFromNow(u.lastSeenAt)}
          </span>
        )}
      </td>

      <td className="px-3 py-2">
        <div className="flex flex-col gap-1">
          <span
            className={cn(
              'flex items-center gap-2 text-xs font-medium',
              PRESENCE_META[u.presence].text,
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', PRESENCE_META[u.presence].dot)} />
            {PRESENCE_META[u.presence].label}
          </span>
          {banned && (
            <Badge className="w-fit bg-destructive/20 text-destructive">
              {ADMIN_COPY.users.bannedFor(formatRemaining(u.bannedUntil))}
            </Badge>
          )}
          {muted && (
            <Badge className="w-fit bg-warning/20 text-warning">
              {ADMIN_COPY.users.mutedFor(formatRemaining(u.mutedUntil))}
            </Badge>
          )}
        </div>
      </td>

      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <AdminUserRowActions
          user={u}
          canManage={canManage}
          isSelf={isSelf}
          muted={muted}
          banned={banned}
          onSetPending={onSetPending}
        />
      </td>
    </tr>
  );
}, adminUserRowEqual);
