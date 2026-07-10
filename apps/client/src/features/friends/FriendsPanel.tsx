import { useMemo, useState, type FormEvent } from 'react';
import {
  Users,
  UserPlus,
  Check,
  X,
  Clock,
  Loader2,
  UserMinus,
  LogIn,
  Ban,
  History,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { FriendSummary, FriendRequest, PresenceStatus, RecentPlayer } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { RoleBadge } from '@/components/ui/RoleBadge';
import { cn } from '@/lib/utils';
import { useFriends } from './FriendsContext';
import { presenceLabel, formatLastSeen, PRESENCE_DOT } from './presence';

function PresenceDot({ status }: { status: PresenceStatus }) {
  return (
    <span
      className={cn(
        'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card',
        PRESENCE_DOT[status],
      )}
      title={presenceLabel(status)}
    />
  );
}

function FriendRow({
  friend,
  onRemove,
  onOpen,
  onJoin,
}: {
  friend: FriendSummary;
  onRemove: (id: string) => void;
  onOpen: (id: string) => void;
  onJoin: (roomId: string) => void;
}) {
  const subtitle =
    friend.status === 'offline'
      ? formatLastSeen(friend.lastSeenAt)
      : friend.roomName
        ? `${presenceLabel(friend.status)} — ${friend.roomName}`
        : presenceLabel(friend.status);
  const joinRoomId = friend.joinable && friend.roomId ? friend.roomId : null;

  return (
    <div className="group flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors">
      <button className="relative shrink-0" onClick={() => onOpen(friend.id)} title="Voir le profil">
        <UserAvatar avatar={friend.avatar} username={friend.username} className="h-9 w-9" />
        <PresenceDot status={friend.status} />
      </button>
      <button className="flex-1 min-w-0 text-left" onClick={() => onOpen(friend.id)}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-sm truncate">{friend.username}</span>
          <RoleBadge role={friend.role} size={14} />
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          {subtitle} — Niv. {friend.level}
        </div>
      </button>
      {joinRoomId ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
          title="Rejoindre le salon"
          aria-label="Rejoindre le salon"
          onClick={() => onJoin(joinRoomId)}
        >
          <LogIn className="h-4 w-4" />
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
        title="Retirer"
        onClick={() => onRemove(friend.id)}
      >
        <UserMinus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function IncomingRow({
  request,
  onAccept,
  onReject,
  onOpen,
}: {
  request: FriendRequest;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/5 border border-primary/10">
      <button onClick={() => onOpen(request.user.id)} className="shrink-0">
        <UserAvatar avatar={request.user.avatar} username={request.user.username} className="h-9 w-9" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-semibold text-sm truncate">{request.user.username}</span>
          <RoleBadge role={request.user.role} size={14} />
        </div>
        <div className="text-[11px] text-muted-foreground">Souhaite vous ajouter</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
        title="Accepter"
        onClick={() => onAccept(request.id)}
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        title="Refuser"
        onClick={() => onReject(request.id)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function RecentRow({ player, onAdd }: { player: RecentPlayer; onAdd: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors">
      <UserAvatar avatar={player.avatar} username={player.username} className="h-9 w-9 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{player.username}</div>
        <div className="text-[11px] text-muted-foreground">Niv. {player.level}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
        title="Ajouter en ami"
        onClick={() => onAdd(player.id)}
      >
        <UserPlus className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function FriendsPanel() {
  const {
    friends,
    incoming,
    outgoing,
    blocked,
    recentPlayers,
    allowFriendRequests,
    loading,
    sendRequest,
    addById,
    accept,
    reject,
    remove,
    unblock,
    setPrivacy,
    openProfile,
  } = useFriends();
  const [username, setUsername] = useState('');
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();

  // Online first, then offline; alphabetical within each group.
  const sortedFriends = useMemo(
    () =>
      [...friends].sort((a, b) => {
        const rank = (f: FriendSummary) => (f.status === 'offline' ? 1 : 0);
        const byStatus = rank(a) - rank(b);
        if (byStatus !== 0) return byStatus;
        return a.username.localeCompare(b.username, 'fr', { sensitivity: 'base' });
      }),
    [friends],
  );

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    sendRequest(username);
    setUsername('');
    setAdding(false);
  };

  const cancelAdd = () => {
    setUsername('');
    setAdding(false);
  };

  const handleJoin = (roomId: string) => navigate('/play', { state: { fromInvite: true, roomId } });

  const empty =
    friends.length === 0 && incoming.length === 0 && outgoing.length === 0 && recentPlayers.length === 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Amis ({friends.length})</h2>
        </div>
        <label className="flex items-center gap-2 text-[11px] text-muted-foreground cursor-pointer">
          Demandes
          <Switch checked={allowFriendRequests} onCheckedChange={setPrivacy} />
        </label>
      </div>

      <div className="glass-card bg-card/40 rounded-xl flex flex-col overflow-hidden">
        {adding ? (
          <form onSubmit={handleAdd} className="p-3 border-b border-border/60 flex gap-2">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Pseudo exact…"
              className="h-9 bg-background/50"
              autoFocus
            />
            <Button type="submit" size="icon" variant="glow" className="h-9 w-9 shrink-0" title="Envoyer la demande">
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 shrink-0 text-muted-foreground"
              title="Annuler"
              onClick={cancelAdd}
            >
              <X className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <div className="p-3 border-b border-border/60">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setAdding(true)}
            >
              <UserPlus className="h-4 w-4" /> Ajouter un ami
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4 max-h-[300px]">
          {loading ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <>
              {incoming.length > 0 && (
                <section className="space-y-1">
                  <h3 className="px-2 text-[11px] font-bold uppercase tracking-wider text-primary/80">
                    Demandes reçues ({incoming.length})
                  </h3>
                  {incoming.map((r) => (
                    <IncomingRow key={r.id} request={r} onAccept={accept} onReject={reject} onOpen={openProfile} />
                  ))}
                </section>
              )}

              <section className="space-y-1">
                {empty ? (
                  <div className="h-[280px] flex flex-col items-center justify-center gap-2 text-center text-muted-foreground/60 text-sm px-4">
                    <Users className="h-8 w-8 opacity-40" />
                    Aucun ami pour l'instant. Ajoute quelqu'un par son pseudo !
                  </div>
                ) : (
                  sortedFriends.map((f) => (
                    <FriendRow key={f.id} friend={f} onRemove={remove} onOpen={openProfile} onJoin={handleJoin} />
                  ))
                )}
              </section>

              {outgoing.length > 0 && (
                <section className="space-y-1">
                  <h3 className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    En attente ({outgoing.length})
                  </h3>
                  {outgoing.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg opacity-70">
                      <UserAvatar avatar={r.user.avatar} username={r.user.username} className="h-9 w-9 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-sm truncate">{r.user.username}</span>
                          <RoleBadge role={r.user.role} size={14} />
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Demande envoyée
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Annuler"
                        onClick={() => reject(r.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </section>
              )}

              {recentPlayers.length > 0 && (
                <section className="space-y-1">
                  <h3 className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-1">
                    <History className="h-3 w-3" /> Joueurs récents
                  </h3>
                  {recentPlayers.map((p) => (
                    <RecentRow key={p.id} player={p} onAdd={addById} />
                  ))}
                </section>
              )}

              {blocked.length > 0 && (
                <section className="space-y-1">
                  <h3 className="px-2 text-[11px] font-bold uppercase tracking-wider text-destructive/70 flex items-center gap-1">
                    <Ban className="h-3 w-3" /> Bloqués ({blocked.length})
                  </h3>
                  {blocked.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 p-2 rounded-lg opacity-60">
                      <UserAvatar avatar={b.avatar} username={b.username} className="h-9 w-9 shrink-0" />
                      <div className="flex-1 min-w-0 font-semibold text-sm truncate">{b.username}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-[11px] text-muted-foreground hover:text-foreground"
                        onClick={() => unblock(b.id)}
                      >
                        Débloquer
                      </Button>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
