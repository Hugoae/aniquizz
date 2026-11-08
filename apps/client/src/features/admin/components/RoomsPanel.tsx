import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RoomSpectatorDialog } from '@/features/admin/components/RoomSpectatorDialog';
import { cn } from '@/lib/utils';
import { ADMIN_COPY } from '@/features/admin/copy/adminCopy';
import { adminApi, type AdminRoom } from '@/lib/adminApi';
import { PlayerProfileDialog } from './PlayerProfileDialog';
import { RoomCard } from './RoomCard';
import {
  errorMessage,
  FILTERS,
  isPlaying,
  SORTS,
  STATUS_ORDER,
  type FilterKey,
  type PendingConfirm,
  type SortKey,
} from './roomsPanelModel';

const REFRESH_MS = 5000;

function RoomSkeleton() {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <Skeleton className="h-px w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-7 w-24" />
      </div>
    </div>
  );
}

export function RoomsPanel({ highlightRoomId }: { highlightRoomId?: string | null }) {
  const [rooms, setRooms] = useState<AdminRoom[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sortKey, setSortKey] = useState<SortKey>('created');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [detail, setDetail] = useState<{ userId: string; connected: boolean } | null>(null);
  const [spectateId, setSpectateId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const highlightRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const { rooms } = await adminApi.listRooms();
      setRooms(rooms);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const tick = () => {
      if (document.hidden) return;
      void load();
    };
    const id = setInterval(tick, REFRESH_MS);
    const onVis = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load]);

  // Coming from a "current room" link: make sure the room is visible, then scroll.
  useEffect(() => {
    if (highlightRoomId) {
      setFilter('all');
      setQuery('');
    }
  }, [highlightRoomId]);

  useEffect(() => {
    if (highlightRoomId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightRoomId, rooms]);

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  const confirmPending = async () => {
    if (!pending) return;
    const { action, successMsg } = pending;
    setPending(null);
    await run(action, successMsg);
  };

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const toggleReveal = (id: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(msg);
    } catch {
      toast.error('Copie impossible.');
    }
  };

  const counts = useMemo(() => {
    let playing = 0;
    let waiting = 0;
    let players = 0;
    for (const r of rooms) {
      if (isPlaying(r)) playing += 1;
      if (r.status === 'waiting') waiting += 1;
      players += r.humanCount;
    }
    return { total: rooms.length, playing, waiting, players };
  }, [rooms]);

  const visibleRooms = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rooms.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q)) return false;
      switch (filter) {
        case 'waiting':
          return r.status === 'waiting';
        case 'playing':
          return isPlaying(r);
        case 'public':
          return !r.isPrivate;
        case 'private':
          return r.isPrivate;
        default:
          return true;
      }
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      switch (sortKey) {
        case 'players':
          return (a.playerCount - b.playerCount) * dir;
        case 'status':
          return ((STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)) * dir;
        case 'created':
        default:
          return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      }
    });
    return list;
  }, [rooms, query, filter, sortKey, sortDir]);

  return (
    <div className="space-y-4">
      {/* Counters */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Users className="h-4 w-4 text-muted-foreground" /> {counts.total} salon(s)
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success" /> {counts.playing} en partie
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> {counts.waiting} en
          attente
        </span>
        <span className="flex items-center gap-2 text-muted-foreground">
          {counts.players} joueur(s) au total
        </span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => void load()}>
          Rafraîchir
        </Button>
      </div>

      <Input
        placeholder={ADMIN_COPY.rooms.search}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? 'default' : 'outline'}
            onClick={() => setFilter(f.key)}
            className={cn('rounded-full', filter !== f.key && 'border-border')}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{ADMIN_COPY.rooms.sortBy}</span>
        {SORTS.map((s) => {
          const active = sortKey === s.key;
          return (
            <Button
              key={s.key}
              size="sm"
              variant="ghost"
              onClick={() => toggleSort(s.key)}
              className={cn(
                'h-7 gap-1 px-2 text-xs',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {s.label}
              {active &&
                (sortDir === 'asc' ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                ))}
            </Button>
          );
        })}
      </div>

      {/* First load skeleton */}
      {!loaded && (
        <div className="space-y-4">
          <RoomSkeleton />
          <RoomSkeleton />
        </div>
      )}

      {loaded && !visibleRooms.length && (
        <div className="glass-card p-6 text-center text-muted-foreground">
          {rooms.length ? 'Aucun salon ne correspond aux filtres.' : 'Aucun salon en cours.'}
        </div>
      )}

      {visibleRooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          highlighted={room.id === highlightRoomId}
          highlightRef={highlightRef}
          passwordVisible={revealed.has(room.id)}
          onCopy={copy}
          onToggleReveal={toggleReveal}
          onSpectate={setSpectateId}
          onPending={setPending}
          onOpenProfile={setDetail}
        />
      ))}
      <PlayerProfileDialog player={detail} onClose={() => setDetail(null)} />
      <RoomSpectatorDialog roomId={spectateId} onClose={() => setSpectateId(null)} />

      <AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
            <AlertDialogDescription>{pending?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmPending()}
              className={pending?.destructive ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {pending?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
