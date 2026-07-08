/**
 * Shared friends state — single socket subscription for the whole app (FriendsProvider).
 *
 * Exposes relationOf() for contextual UI (AddFriendButton, recent players filter).
 * Optimistic flags for add/accept are reconciled on friends:state or rolled back on friends:error.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type {
  FriendsState,
  FriendSummary,
  FriendPresencePayload,
  LobbyInvitePayload,
  RecentPlayer,
} from '@aniquizz/shared';
import { socket } from '@/lib/socket';
import { useAuth } from '@/features/auth/context/AuthContext';

const EMPTY: FriendsState = {
  friends: [],
  incoming: [],
  outgoing: [],
  blocked: [],
  blockedByUserIds: [],
  allowFriendRequests: true,
};

export type Relation = 'self' | 'friends' | 'incoming' | 'outgoing' | 'blocked' | 'none';

interface FriendsContextValue {
  friends: FriendSummary[];
  incoming: FriendsState['incoming'];
  outgoing: FriendsState['outgoing'];
  blocked: FriendSummary[];
  recentPlayers: RecentPlayer[];
  allowFriendRequests: boolean;
  onlineCount: number;
  loading: boolean;
  sendRequest: (username: string) => void;
  addById: (userId: string) => void;
  accept: (requestId: string) => void;
  reject: (requestId: string) => void;
  remove: (userId: string) => void;
  block: (userId: string) => void;
  unblock: (userId: string) => void;
  invite: (userId: string) => void;
  setPrivacy: (allow: boolean) => void;
  refreshRecent: () => void;
  openProfile: (userId: string) => void;
  relationOf: (userId: string) => Relation;
  /** Incoming request row id for a user, if any. */
  incomingRequestFor: (userId: string) => string | undefined;
}

const FriendsContext = createContext<FriendsContextValue | null>(null);

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<FriendsState>(EMPTY);
  const [recentPlayers, setRecentPlayers] = useState<RecentPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimisticOutgoing, setOptimisticOutgoing] = useState<Set<string>>(() => new Set());
  const [optimisticFriends, setOptimisticFriends] = useState<Set<string>>(() => new Set());
  const pendingOptimisticRef = useRef<Map<string, 'outgoing' | 'friends'>>(new Map());

  const clearOptimisticForUser = useCallback((userId: string) => {
    pendingOptimisticRef.current.delete(userId);
    setOptimisticOutgoing((prev) => {
      if (!prev.has(userId)) return prev;
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    setOptimisticFriends((prev) => {
      if (!prev.has(userId)) return prev;
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }, []);

  const reconcileOptimistic = useCallback(
    (s: FriendsState) => {
      for (const userId of [...pendingOptimisticRef.current.keys()]) {
        const kind = pendingOptimisticRef.current.get(userId);
        const isFriend = s.friends.some((f) => f.id === userId);
        const isOutgoing = s.outgoing.some((r) => r.user.id === userId);
        if (kind === 'outgoing' && (isOutgoing || isFriend)) clearOptimisticForUser(userId);
        if (kind === 'friends' && isFriend) clearOptimisticForUser(userId);
      }
    },
    [clearOptimisticForUser],
  );

  useEffect(() => {
    if (!user) {
      setState(EMPTY);
      setRecentPlayers([]);
      setLoading(false);
      return;
    }

    const onState = (s: FriendsState) => {
      setState(s);
      setLoading(false);
      reconcileOptimistic(s);
    };
    const onRequest = (payload: { from: FriendSummary }) => {
      toast.info(`${payload.from.username} vous a envoyé une demande d'ami.`);
    };
    const onPresence = (p: FriendPresencePayload) => {
      setState((prev) => ({
        ...prev,
        friends: prev.friends.map((f) =>
          f.id === p.userId
            ? {
                ...f,
                status: p.status,
                lastSeenAt: p.lastSeenAt,
                roomId: p.roomId ?? null,
                roomName: p.roomName ?? null,
                joinable: p.joinable ?? false,
              }
            : f,
        ),
      }));
    };
    const onRecent = (payload: { players: RecentPlayer[] }) => setRecentPlayers(payload.players);
    const onInvite = (p: LobbyInvitePayload) => {
      toast.info(`${p.from.username} vous invite dans « ${p.roomName} »`, {
        action: {
          label: 'Rejoindre',
          onClick: () => navigate('/play', { state: { fromInvite: true, roomId: p.roomId } }),
        },
        duration: 15_000,
      });
    };
    const onInfo = (p: { message: string }) => toast.success(p.message);
    const onError = (e: { message: string }) => {
      for (const userId of [...pendingOptimisticRef.current.keys()]) {
        clearOptimisticForUser(userId);
      }
      toast.error(e.message);
    };
    const requestSnapshot = () => {
      socket.emit('friends:list');
      socket.emit('friends:recent');
    };

    socket.on('friends:state', onState);
    socket.on('friends:request_received', onRequest);
    socket.on('friends:presence', onPresence);
    socket.on('friends:recent', onRecent);
    socket.on('friends:invite_received', onInvite);
    socket.on('friends:info', onInfo);
    socket.on('friends:error', onError);
    socket.on('connect', requestSnapshot);

    if (socket.connected) requestSnapshot();

    return () => {
      socket.off('friends:state', onState);
      socket.off('friends:request_received', onRequest);
      socket.off('friends:presence', onPresence);
      socket.off('friends:recent', onRecent);
      socket.off('friends:invite_received', onInvite);
      socket.off('friends:info', onInfo);
      socket.off('friends:error', onError);
      socket.off('connect', requestSnapshot);
    };
  }, [user, navigate, reconcileOptimistic, clearOptimisticForUser]);

  const sendRequest = useCallback((username: string) => {
    const trimmed = username.trim();
    if (trimmed) socket.emit('friends:request', { username: trimmed });
  }, []);
  const addById = useCallback((userId: string) => {
    if (!userId) return;
    pendingOptimisticRef.current.set(userId, 'outgoing');
    setOptimisticOutgoing((prev) => new Set(prev).add(userId));
    socket.emit('friends:request', { userId });
  }, []);
  const accept = useCallback(
    (requestId: string) => {
      const req = state.incoming.find((r) => r.id === requestId);
      if (req) {
        pendingOptimisticRef.current.set(req.user.id, 'friends');
        setOptimisticFriends((prev) => new Set(prev).add(req.user.id));
      }
      socket.emit('friends:accept', { requestId });
    },
    [state.incoming],
  );
  const reject = useCallback((requestId: string) => socket.emit('friends:reject', { requestId }), []);
  const remove = useCallback((userId: string) => socket.emit('friends:remove', { userId }), []);
  const block = useCallback((userId: string) => socket.emit('friends:block', { userId }), []);
  const unblock = useCallback((userId: string) => socket.emit('friends:unblock', { userId }), []);
  const invite = useCallback((userId: string) => socket.emit('friends:invite', { userId }), []);
  const setPrivacy = useCallback((allow: boolean) => socket.emit('friends:set_privacy', { allow }), []);
  const refreshRecent = useCallback(() => socket.emit('friends:recent'), []);

  const openProfile = useCallback((userId: string) => {
    navigate(`/profile/${userId}`);
  }, [navigate]);

  const relationOf = useCallback(
    (userId: string): Relation => {
      if (user && userId === user.id) return 'self';
      if (optimisticFriends.has(userId) || state.friends.some((f) => f.id === userId)) return 'friends';
      if (state.blocked.some((f) => f.id === userId) || state.blockedByUserIds.includes(userId)) {
        return 'blocked';
      }
      if (optimisticOutgoing.has(userId) || state.outgoing.some((r) => r.user.id === userId)) {
        return 'outgoing';
      }
      if (state.incoming.some((r) => r.user.id === userId)) return 'incoming';
      return 'none';
    },
    [state, user, optimisticFriends, optimisticOutgoing],
  );

  const incomingRequestFor = useCallback(
    (userId: string) => state.incoming.find((r) => r.user.id === userId)?.id,
    [state.incoming],
  );

  const onlineCount = useMemo(
    () => state.friends.filter((f) => f.status !== 'offline').length,
    [state.friends],
  );

  // Hide recent players we already have any relationship with (reacts instantly
  // to friend/request changes, unlike the server snapshot which filters at fetch).
  const visibleRecent = useMemo(
    () => recentPlayers.filter((p) => relationOf(p.id) === 'none'),
    [recentPlayers, relationOf],
  );

  const value: FriendsContextValue = {
    friends: state.friends,
    incoming: state.incoming,
    outgoing: state.outgoing,
    blocked: state.blocked,
    recentPlayers: visibleRecent,
    allowFriendRequests: state.allowFriendRequests,
    onlineCount,
    loading,
    sendRequest,
    addById,
    accept,
    reject,
    remove,
    block,
    unblock,
    invite,
    setPrivacy,
    refreshRecent,
    openProfile,
    relationOf,
    incomingRequestFor,
  };

  return <FriendsContext.Provider value={value}>{children}</FriendsContext.Provider>;
}

/** Access the shared friends state. Returns null-safe defaults outside a provider. */
export function useFriends(): FriendsContextValue {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error('useFriends must be used within a FriendsProvider');
  return ctx;
}
