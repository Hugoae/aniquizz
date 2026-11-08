import { Ban, MicOff, Power, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ADMIN_COPY } from '@/features/admin/copy/adminCopy';
import { adminApi, type AdminUser } from '@/lib/adminApi';
import { invalidateDailyToday } from '@/lib/dailyApi';
import { DURATION_OPTIONS } from '@/lib/suspension';

export type AdminUserRowPending = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  action: () => Promise<unknown>;
  successMsg: string;
  targetUserId?: string;
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
          className={
            active
              ? isMute
                ? 'h-7 border-warning/40 px-2 text-warning'
                : 'h-7 border-destructive/40 px-2 text-destructive'
              : 'h-7 px-2'
          }
        >
          <Icon className="mr-1 h-3.5 w-3.5" />
          {isMute ? ADMIN_COPY.mute : ADMIN_COPY.ban}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          {isMute ? ADMIN_COPY.users.muteFor : ADMIN_COPY.users.banFor}
        </DropdownMenuLabel>
        {DURATION_OPTIONS.map((opt) => (
          <DropdownMenuItem key={opt.minutes} onClick={() => onApply(opt.minutes, opt.label)}>
            {opt.label}
          </DropdownMenuItem>
        ))}
        {active && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLift} className="text-success focus:text-success">
              {isMute ? ADMIN_COPY.liftMute : ADMIN_COPY.liftBan}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminUserRowActions({
  user: u,
  canManage,
  isSelf,
  muted,
  banned,
  onSetPending,
}: {
  user: AdminUser;
  canManage: boolean;
  isSelf: boolean;
  muted: boolean;
  banned: boolean;
  onSetPending: (pending: AdminUserRowPending) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1">
      <SanctionMenu
        kind="mute"
        active={muted}
        disabled={isSelf}
        onApply={(minutes, label) =>
          onSetPending({
            title: ADMIN_COPY.users.muteTitle(u.username),
            description: ADMIN_COPY.users.muteBody(label),
            confirmLabel: ADMIN_COPY.mute,
            action: () => adminApi.mute(u.id, minutes),
            successMsg: ADMIN_COPY.users.mutedToast(label),
            targetUserId: u.id,
          })
        }
        onLift={() =>
          onSetPending({
            title: ADMIN_COPY.users.liftMuteTitle(u.username),
            description: ADMIN_COPY.users.liftMuteBody,
            confirmLabel: ADMIN_COPY.liftMute,
            action: () => adminApi.mute(u.id, null),
            successMsg: ADMIN_COPY.users.muteLifted,
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
            title: ADMIN_COPY.users.banTitle(u.username),
            description: ADMIN_COPY.users.banBody(label),
            confirmLabel: ADMIN_COPY.ban,
            destructive: true,
            action: () => adminApi.ban(u.id, minutes),
            successMsg: ADMIN_COPY.users.bannedToast(label),
            targetUserId: u.id,
          })
        }
        onLift={() =>
          onSetPending({
            title: ADMIN_COPY.users.liftBanTitle(u.username),
            description: ADMIN_COPY.users.liftBanBody,
            confirmLabel: ADMIN_COPY.liftBan,
            action: () => adminApi.ban(u.id, null),
            successMsg: ADMIN_COPY.users.banLifted,
            targetUserId: u.id,
          })
        }
      />
      {canManage && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            disabled={isSelf || u.presence === 'offline'}
            title={ADMIN_COPY.users.disconnectTitle}
            aria-label={ADMIN_COPY.users.disconnect}
            onClick={() =>
              onSetPending({
                title: ADMIN_COPY.users.disconnectAsk(u.username),
                description: ADMIN_COPY.users.disconnectBody,
                confirmLabel: ADMIN_COPY.users.disconnect,
                action: () => adminApi.disconnectUser(u.id),
                successMsg: ADMIN_COPY.users.disconnected,
                targetUserId: u.id,
              })
            }
          >
            <Power className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() =>
              onSetPending({
                title: ADMIN_COPY.users.resetDailyAsk(u.username),
                description: ADMIN_COPY.users.resetDailyBody,
                confirmLabel: ADMIN_COPY.users.reset,
                destructive: true,
                action: async () => {
                  const result = await adminApi.resetDaily(u.id);
                  if (isSelf) invalidateDailyToday();
                  return result;
                },
                successMsg: ADMIN_COPY.users.dailyReset,
                targetUserId: u.id,
              })
            }
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            {ADMIN_COPY.users.resetDaily}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2"
            onClick={() =>
              onSetPending({
                title: ADMIN_COPY.users.resetStatsAsk(u.username),
                description: ADMIN_COPY.users.resetStatsBody,
                confirmLabel: ADMIN_COPY.users.reset,
                destructive: true,
                action: () => adminApi.resetStats(u.id),
                successMsg: ADMIN_COPY.users.statsReset,
              })
            }
          >
            {ADMIN_COPY.users.resetStats}
          </Button>
        </>
      )}
    </div>
  );
}
