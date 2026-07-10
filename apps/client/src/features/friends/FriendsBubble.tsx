import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Check, X, LogIn, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { cn } from '@/lib/utils';
import { socket } from '@/lib/socket';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useFriendsOptional } from './FriendsContext';
import { presenceLabel, formatLastSeen, PRESENCE_DOT } from './presence';

/**
 * Home-page friends widget: a bottom-left bubble showing "online / total friends"
 * and the total players online. Expands upward into the full friends list.
 */
export function FriendsBubble() {
  const { user } = useAuth();
  const friendsCtx = useFriendsOptional();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [totalOnline, setTotalOnline] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const friends = friendsCtx?.friends ?? [];
  const incoming = friendsCtx?.incoming ?? [];
  const onlineCount = friendsCtx?.onlineCount ?? 0;
  const accept = friendsCtx?.accept;
  const reject = friendsCtx?.reject;
  const openProfile = friendsCtx?.openProfile;

  // Online first, then offline; alphabetical within each group.
  const ordered = useMemo(() => {
    const byName = (a: (typeof friends)[number], b: (typeof friends)[number]) =>
      a.username.localeCompare(b.username, 'fr', { sensitivity: 'base' });
    const online = friends.filter((f) => f.status !== 'offline').sort(byName);
    const offline = friends.filter((f) => f.status === 'offline').sort(byName);
    return [...online, ...offline];
  }, [friends]);

  // Live total-players-online count via home_stats (polled).
  useEffect(() => {
    if (!user) return;
    const onStats = (s: { online: number }) => setTotalOnline(s.online);
    const fetchStats = () => socket.connected && socket.emit('get_home_stats');

    socket.on('home_stats', onStats);
    socket.on('connect', fetchStats);
    fetchStats();
    const interval = setInterval(fetchStats, 10_000);

    return () => {
      socket.off('home_stats', onStats);
      socket.off('connect', fetchStats);
      clearInterval(interval);
    };
  }, [user]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user || !friendsCtx) return null;

  return (
    <div ref={rootRef} className="fixed bottom-4 left-4 z-50 hidden md:block">
      {/* Morphing container: the pill stays pinned as the bottom bar while the
          list grows fluidly upward out of it. */}
      <div
        className={cn(
          'w-[280px] overflow-hidden rounded-3xl border border-border/60 bg-popover/90 shadow-card backdrop-blur-xl',
          'transition-colors duration-300 ease-out',
          open ? 'border-primary/30' : 'hover:border-border',
        )}
      >
        {/* Reveal region (grid-rows trick for a smooth height animation) */}
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity] duration-300 ease-out',
            open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none',
          )}
          aria-hidden={!open}
        >
          <div className="overflow-hidden">
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <span className="text-sm font-bold">Amis</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                {onlineCount}/{friends.length} en ligne
              </span>
            </div>

            <div className="max-h-[184px] overflow-y-auto custom-scrollbar px-1">
              {incoming.length > 0 && (
                <div className="mb-1">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary/80">
                    Demandes ({incoming.length})
                  </div>
                  {incoming.map((r) => (
                    <div key={r.id} className="flex items-center gap-2 rounded-md bg-primary/5 px-2 py-1.5">
                      <UserAvatar avatar={r.user.avatar} username={r.user.username} className="h-8 w-8" />
                      <span className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{r.user.username}</span>
                        <RoleBadge role={r.user.role} size={14} />
                      </span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => accept?.(r.id)} aria-label="Accepter">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => reject?.(r.id)} aria-label="Refuser">
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
                  <div key={f.id} className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-secondary">
                    <button className="relative shrink-0" onClick={() => openProfile?.(f.id)} aria-label={`Profil de ${f.username}`}>
                      <UserAvatar avatar={f.avatar} username={f.username} className="h-8 w-8" />
                      <span className={cn('absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-popover', PRESENCE_DOT[f.status])} />
                    </button>
                    <button className="min-w-0 flex-1 text-left" onClick={() => openProfile?.(f.id)}>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="truncate text-sm font-medium">{f.username}</span>
                        <RoleBadge role={f.role} size={14} />
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {f.status === 'offline'
                          ? formatLastSeen(f.lastSeenAt)
                          : f.roomName
                            ? `${presenceLabel(f.status)} — ${f.roomName}`
                            : presenceLabel(f.status)}
                      </div>
                    </button>
                    {f.joinable && f.roomId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-primary"
                        title="Rejoindre"
                        aria-label={`Rejoindre ${f.username}`}
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
              className="w-full border-t border-border/60 px-3 py-2 text-center text-xs font-semibold text-primary hover:bg-secondary"
              onClick={() => navigate('/profile#amis')}
            >
              Gérer mes amis
            </button>
          </div>
        </div>

        {/* Pinned trigger pill / bar */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Fermer les amis' : 'Amis et joueurs en ligne'}
          className={cn(
            'flex w-full items-center gap-3 py-2 pl-3 pr-2.5 text-sm transition-colors',
            open && 'border-t border-border/60',
          )}
        >
          <span className="relative flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            {incoming.length > 0 && (
              <span className="absolute -left-1 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] font-bold leading-none text-primary-foreground">
                {incoming.length}
              </span>
            )}
          </span>

          <span className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', onlineCount > 0 ? 'bg-success' : 'bg-muted-foreground/40')} />
            <span className="font-mono font-semibold text-foreground">
              {onlineCount}/{friends.length}
            </span>
            <span className="text-muted-foreground">Amis</span>
          </span>

          <span className="h-4 w-px bg-border" />

          <span className="flex items-center gap-1.5">
            <span className="font-mono font-semibold text-foreground">
              {totalOnline ?? '—'}
            </span>
            <span className="text-muted-foreground">En ligne</span>
          </span>

          {open ? (
            <X className="ml-auto h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="ml-auto h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}
