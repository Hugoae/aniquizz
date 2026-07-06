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
  PublicProfile,
  RecentPlayer,
} from '@aniquizz/shared';
import { socket } from '@/lib/socket';
import { useAuth } from '@/features/auth/context/AuthContext';
import { PublicProfileDialog } from './PublicProfileDialog';

const EMPTY: FriendsState = {
  friends: [],
  incoming: [],
  outgoing: [],
  blocked: [],
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
}

const FriendsContext = createContext<FriendsContextValue | null>(null);

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<FriendsState>(EMPTY);
  const [recentPlayers, setRecentPlayers] = useState<RecentPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  // Public-profile modal.
  const [profileOpen, setProfileOpen] = useState(false);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const pendingProfileId = useRef<string | null>(null);

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
    const onError = (e: { message: string }) => toast.error(e.message);
    const onPublic = (p: PublicProfile) => {
      // Ignore late responses for a profile we no longer care about.
      if (pendingProfileId.current && p.id !== pendingProfileId.current) return;
      setProfile(p);
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
    socket.on('profile:public', onPublic);
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
      socket.off('profile:public', onPublic);
      socket.off('connect', requestSnapshot);
    };
  }, [user, navigate]);

  const sendRequest = useCallback((username: string) => {
    const trimmed = username.trim();
    if (trimmed) socket.emit('friends:request', { username: trimmed });
  }, []);
  const addById = useCallback((userId: string) => {
    if (userId) socket.emit('friends:request', { userId });
  }, []);
  const accept = useCallback((requestId: string) => socket.emit('friends:accept', { requestId }), []);
  const reject = useCallback((requestId: string) => socket.emit('friends:reject', { requestId }), []);
  const remove = useCallback((userId: string) => socket.emit('friends:remove', { userId }), []);
  const block = useCallback((userId: string) => socket.emit('friends:block', { userId }), []);
  const unblock = useCallback((userId: string) => socket.emit('friends:unblock', { userId }), []);
  const invite = useCallback((userId: string) => socket.emit('friends:invite', { userId }), []);
  const setPrivacy = useCallback((allow: boolean) => socket.emit('friends:set_privacy', { allow }), []);
  const refreshRecent = useCallback(() => socket.emit('friends:recent'), []);

  const openProfile = useCallback((userId: string) => {
    pendingProfileId.current = userId;
    setProfile(null);
    setProfileOpen(true);
    socket.emit('profile:get_public', { userId });
  }, []);

  const relationOf = useCallback(
    (userId: string): Relation => {
      if (user && userId === user.id) return 'self';
      if (state.friends.some((f) => f.id === userId)) return 'friends';
      if (state.blocked.some((f) => f.id === userId)) return 'blocked';
      if (state.outgoing.some((r) => r.user.id === userId)) return 'outgoing';
      if (state.incoming.some((r) => r.user.id === userId)) return 'incoming';
      return 'none';
    },
    [state, user],
  );

  const onlineCount = useMemo(
    () => state.friends.filter((f) => f.status !== 'offline').length,
    [state.friends],
  );

  const value: FriendsContextValue = {
    friends: state.friends,
    incoming: state.incoming,
    outgoing: state.outgoing,
    blocked: state.blocked,
    recentPlayers,
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
  };

  return (
    <FriendsContext.Provider value={value}>
      {children}
      <PublicProfileDialog
        open={profileOpen}
        profile={profile}
        onOpenChange={setProfileOpen}
        onAdd={addById}
        onRemove={remove}
        onBlock={block}
        onUnblock={unblock}
        onAccept={addById}
      />
    </FriendsContext.Provider>
  );
}

/** Access the shared friends state. Returns null-safe defaults outside a provider. */
export function useFriends(): FriendsContextValue {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error('useFriends must be used within a FriendsProvider');
  return ctx;
}
