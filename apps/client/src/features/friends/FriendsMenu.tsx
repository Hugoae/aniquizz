import { Users, Check, X, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PresenceStatus } from '@aniquizz/shared';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { cn } from '@/lib/utils';
import { useFriends } from './FriendsContext';
import { presenceLabel, formatLastSeen } from './presence';

const DOT_COLOR: Record<PresenceStatus, string> = {
  in_game: 'bg-amber-400',
  in_lobby: 'bg-sky-400',
  online: 'bg-green-500',
  offline: 'bg-muted-foreground/40',
};

/** Compact friends quick-access in the header: online count + pending badge. */
export function FriendsMenu() {
  const { friends, incoming, onlineCount, accept, reject, openProfile } = useFriends();
  const navigate = useNavigate();

  const online = friends.filter((f) => f.status !== 'offline');
  const offline = friends.filter((f) => f.status === 'offline');
  const ordered = [...online, ...offline];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-lg hover:bg-white/5"
          title="Amis"
        >
          <Users className="h-5 w-5" />
          {onlineCount > 0 && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-green-500 px-1 text-[9px] font-black leading-none text-white border border-background">
              {onlineCount}
            </span>
          )}
          {incoming.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black leading-none text-primary-foreground border border-background">
              {incoming.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0">
        <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
          <span className="text-sm font-bold">Amis</span>
          <span className="text-[11px] text-muted-foreground">{onlineCount} en ligne</span>
        </div>

        <div className="max-h-80 overflow-y-auto custom-scrollbar p-1">
          {incoming.length > 0 && (
            <div className="mb-1">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary/80">
                Demandes ({incoming.length})
              </div>
              {incoming.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-primary/5">
                  <UserAvatar avatar={r.user.avatar} username={r.user.username} className="h-8 w-8" />
                  <span className="flex-1 min-w-0 truncate text-sm font-medium">{r.user.username}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-green-400" onClick={() => accept(r.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-400" onClick={() => reject(r.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {ordered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              Aucun ami pour l'instant.
            </div>
          ) : (
            ordered.map((f) => (
              <div key={f.id} className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/5">
                <button className="relative shrink-0" onClick={() => openProfile(f.id)}>
                  <UserAvatar avatar={f.avatar} username={f.username} className="h-8 w-8" />
                  <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-popover', DOT_COLOR[f.status])} />
                </button>
                <button className="flex-1 min-w-0 text-left" onClick={() => openProfile(f.id)}>
                  <div className="truncate text-sm font-medium">{f.username}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {f.status === 'offline'
                      ? formatLastSeen(f.lastSeenAt)
                      : f.roomName
                        ? `${presenceLabel(f.status)} · ${f.roomName}`
                        : presenceLabel(f.status)}
                  </div>
                </button>
                {f.joinable && f.roomId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-primary"
                    title="Rejoindre"
                    onClick={() => navigate('/play', { state: { fromInvite: true, roomId: f.roomId } })}
                  >
                    <LogIn className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <button
          className="w-full border-t border-white/5 px-3 py-2 text-center text-xs font-semibold text-primary hover:bg-white/5"
          onClick={() => navigate('/profile')}
        >
          Gérer mes amis
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
