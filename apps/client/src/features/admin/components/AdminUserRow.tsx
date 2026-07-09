import { memo } from 'react';
import { MicOff, Ban, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/UserAvatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { AdminUser, Presence, Role } from '@/lib/adminApi';
import { adminApi } from '@/lib/adminApi';
import { cn } from '@/lib/utils';
import {
  DURATION_OPTIONS,
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
  online: { label: 'En ligne', dot: 'bg-success', text: 'text-success' },
  in_game: { label: 'In game', dot: 'bg-primary', text: 'text-primary' },
  offline: { label: 'Hors ligne', dot: 'bg-muted-foreground/30', text: 'text-muted-foreground' },
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

export type AdminUserRowPending = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  action: () => Promise<unknown>;
  successMsg: string;
  targetUserId?: string;
};

type AdminUserRowProps = {
  user: AdminUser;
  canManage: boolean;
  isSelf: boolean;
  onOpenDetail: (user: AdminUser) => void;
  onGoToRoom?: (roomId: string) => void;
  onSetPending: (pending: AdminUserRowPending) => void;
  onRoleChange: (userId: string, role: Role) => void;
};

function SanctionMenu({
  kind,
  active,
  onApply,
  onLift,
  disabled,
}: {
  kind: 'mute' | 'ban';
  active: boolean;
  onApply: (minutes: number, label: string) => void;
  onLift: () => void;
  disabled?: boolean;
}) {
  const isMute = kind === 'mute';
  const Icon = isMute ? MicOff : Ban;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={disabled}
          className={active ? (isMute ? 'border-warning/40 text-warning' : 'border-destructive/40 text-destructive') : ''}
        >
          <Icon className="h-3.5 w-3.5 mr-1" />
          {isMute ? 'Mute' : 'Ban'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{isMute ? 'Réduire au silence' : 'Bannir'} pour…</DropdownMenuLabel>
        {DURATION_OPTIONS.map((opt) => (
          <DropdownMenuItem key={opt.minutes} onClick={() => onApply(opt.minutes, opt.label)}>
            {opt.label}
          </DropdownMenuItem>
        ))}
        {active && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLift} className="text-success focus:text-success">
              {isMute ? 'Lever le mute' : 'Lever le ban'}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function adminUserRowEqual(prev: AdminUserRowProps, next: AdminUserRowProps): boolean {
  const a = prev.user;
  const b = next.user;
  return (
    prev.canManage === next.canManage
    && prev.isSelf === next.isSelf
    && a.id === b.id
    && a.username === b.username
    && a.email === b.email
    && a.avatar === b.avatar
    && a.role === b.role
    && a.presence === b.presence
    && a.gamesPlayed === b.gamesPlayed
    && a.level === b.level
    && a.bannedUntil === b.bannedUntil
    && a.mutedUntil === b.mutedUntil
    && a.lastSeenAt === b.lastSeenAt
    && a.createdAt === b.createdAt
    && a.currentRoom?.id === b.currentRoom?.id
    && a.currentRoom?.name === b.currentRoom?.name
    && prev.onOpenDetail === next.onOpenDetail
    && prev.onGoToRoom === next.onGoToRoom
    && prev.onSetPending === next.onSetPending
    && prev.onRoleChange === next.onRoleChange
  );
}

export const AdminUserRow = memo(function AdminUserRow({
  user: u,
  canManage,
  isSelf,
  onOpenDetail,
  onGoToRoom,
  onSetPending,
  onRoleChange,
}: AdminUserRowProps) {
  const banned = isSanctionActive(u.bannedUntil);
  const muted = isSanctionActive(u.mutedUntil);
  useSanctionTicker(banned || muted);

  return (
    <tr
      className="border-b border-border/50 hover:bg-secondary/50 cursor-pointer"
      onClick={() => onOpenDetail(u)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenDetail(u);
        }
      }}
      tabIndex={0}
      aria-label={`Voir le profil de ${u.username}`}
    >
      <td className="p-3">
        <div className="flex items-start gap-3">
          <UserAvatar avatar={u.avatar} username={u.username} className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold flex items-center gap-2 transition-colors hover:text-primary">
              {u.username}
            </div>
            <div className="text-xs text-muted-foreground truncate">{u.email}</div>
            <div className="text-[11px] text-muted-foreground/70">
              Inscrit le {formatDate(u.createdAt)}
            </div>
          </div>
        </div>
      </td>

      <td className="p-3" onClick={(e) => e.stopPropagation()}>
        {canManage && !isSelf ? (
          <select
            className="bg-background border border-border rounded px-2 py-1"
            value={u.role}
            onChange={(e) => onRoleChange(u.id, e.target.value as Role)}
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

      <td className="p-3">
        {u.gamesPlayed} parties · Niv {u.level}
      </td>

      <td className="p-3" onClick={(e) => e.stopPropagation()}>
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

      <td className="p-3">
        {u.presence !== 'offline' ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <span className="text-xs text-muted-foreground">
            {formatRelativeFromNow(u.lastSeenAt)}
          </span>
        )}
      </td>

      <td className="p-3">
        <div className="flex flex-col gap-1.5">
          <span className={cn('flex items-center gap-2 text-xs font-medium', PRESENCE_META[u.presence].text)}>
            <span className={cn('h-2 w-2 rounded-full', PRESENCE_META[u.presence].dot)} />
            {PRESENCE_META[u.presence].label}
          </span>
          {banned && (
            <Badge className="bg-destructive/20 text-destructive w-fit">
              Banni · {formatRemaining(u.bannedUntil)}
            </Badge>
          )}
          {muted && (
            <Badge className="bg-warning/20 text-warning w-fit">
              Muet · {formatRemaining(u.mutedUntil)}
            </Badge>
          )}
        </div>
      </td>

      <td className="p-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap justify-end gap-1">
          <SanctionMenu
            kind="mute"
            active={muted}
            disabled={isSelf}
            onApply={(minutes, label) =>
              onSetPending({
                title: `Réduire ${u.username} au silence ?`,
                description: `Le joueur ne pourra plus écrire dans le chat pendant : ${label}.`,
                confirmLabel: 'Mute',
                action: () => adminApi.mute(u.id, minutes),
                successMsg: `Joueur réduit au silence (${label}).`,
                targetUserId: u.id,
              })
            }
            onLift={() =>
              onSetPending({
                title: `Lever le mute de ${u.username} ?`,
                description: 'Le joueur pourra de nouveau écrire dans le chat.',
                confirmLabel: 'Lever le mute',
                action: () => adminApi.mute(u.id, null),
                successMsg: 'Mute levé.',
                targetUserId: u.id,
              })
            }
          />
          <SanctionMenu
            kind="ban"
            active={banned}
            disabled={isSelf}
            onApply={(minutes, label) =>
              onSetPending({
                title: `Bannir ${u.username} ?`,
                description: `Le joueur sera déconnecté et ne pourra plus se connecter pendant : ${label}.`,
                confirmLabel: 'Bannir',
                destructive: true,
                action: () => adminApi.ban(u.id, minutes),
                successMsg: `Joueur banni (${label}).`,
                targetUserId: u.id,
              })
            }
            onLift={() =>
              onSetPending({
                title: `Lever le ban de ${u.username} ?`,
                description: 'Le joueur pourra de nouveau se connecter.',
                confirmLabel: 'Lever le ban',
                action: () => adminApi.ban(u.id, null),
                successMsg: 'Ban levé.',
                targetUserId: u.id,
              })
            }
          />
          {canManage && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={u.presence === 'offline'}
                title="Déconnecter le compte (sans bannir)"
                onClick={() =>
                  onSetPending({
                    title: `Déconnecter ${u.username} ?`,
                    description:
                      "Le joueur sera déconnecté de son compte et devra se reconnecter. Aucune sanction n'est appliquée.",
                    confirmLabel: 'Déconnecter',
                    action: () => adminApi.disconnectUser(u.id),
                    successMsg: 'Joueur déconnecté.',
                    targetUserId: u.id,
                  })
                }
              >
                <Power className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  onSetPending({
                    title: `Réinitialiser les statistiques de ${u.username} ?`,
                    description:
                      'Parties, victoires, XP et niveau seront remis à zéro. Cette action est irréversible.',
                    confirmLabel: 'Réinitialiser',
                    destructive: true,
                    action: () => adminApi.resetStats(u.id),
                    successMsg: 'Statistiques réinitialisées.',
                  })
                }
              >
                Reset statistiques
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}, adminUserRowEqual);

export { SanctionMenu, PRESENCE_META, formatDate };
