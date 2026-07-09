/**
 * Play hub controller — owns the lobby state machine and all socket wiring for /play.
 *
 * Views: modes → roomList → createModal → lobby (solo skips roomList).
 * Navigation state (returnToLobby, fromInvite, createSolo) is consumed once on mount
 * then cleared so a refresh does not re-trigger stale joins.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';

import {
  GameConfig,
  RoomConfig,
  GameMode,
  type GamePlayer,
  type GameStatus,
  type GameStartedPayload,
  type PlayersUpdatePayload,
  type RoomListItem,
  type RoomSettings,
  type RoomUpdatedPayload,
} from '@aniquizz/shared';
import type { LobbyPlayer } from '@/features/hub/components/MultiplayerLobby';

import { useAuth } from '@/features/auth/context/AuthContext';
import { socket } from '@/lib/socket';

export type LobbyView = 'modes' | 'roomList' | 'createModal' | 'lobby';

/** Navigation state used to resume/join a lobby or auto-create a solo game. */
interface GameHubLocationState {
  returnToLobby?: boolean;
  fromInvite?: boolean;
  createSolo?: boolean;
  roomId?: string;
  settings?: Partial<GameConfig>;
}

/** Shape the server actually sends for lobby players (wire-loose superset of GamePlayer). */
type ServerLobbyPlayer = Partial<GamePlayer> & {
  socketId?: string;
  name?: string;
};

/** RoomSettings as they arrive over the wire (server adds `name`/`password`). */
type WireRoomSettings = Partial<RoomSettings> & { name?: string; password?: string };

export const defaultConfig: GameConfig = {
  mode: 'solo', gameType: 'standard', responseType: 'mix', soundCount: 20, soundTypes: ['opening'], difficulty: ['medium'],
  guessDuration: 15, soundSelection: 'random', precision: 'franchise', watchedMode: 'union'
};

export const defaultRoomConfig: RoomConfig = { ...defaultConfig, mode: 'multiplayer', roomName: '', isPrivate: false, password: '', maxPlayers: 16 };

const mapServerPlayersToLobby = (
  serverPlayers: ServerLobbyPlayer[],
  currentHostId?: string,
): LobbyPlayer[] => {
  if (!Array.isArray(serverPlayers)) return [];
  return serverPlayers.map((p) => ({
    id: p.id ?? p.socketId ?? '',
    name: p.username || p.name || `Joueur ${String(p.id).substring(0, 4)}`,
    avatar: p.avatar || 'player1',
    isReady: p.isReady || false,
    isHost: (currentHostId && String(p.id) === String(currentHostId)) ? true : (p.isHost || false),
    isInGame: p.isInGame,
    isBot: typeof p.id === 'string' && p.id.startsWith('bot-'),
    role: p.role,
    level: p.level,
    hasAniList: Boolean(p.anilistUsername),
  }));
};

/**
 * Owns the whole Play/lobby state machine: socket lifecycle, lobby state,
 * view transitions, dialogs and the emit actions. Keeps `GameHub` presentational.
 */
export function useLobbyController() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state ?? null) as GameHubLocationState | null;
  const { user, profile } = useAuth();

  const joinedKeyRef = useRef<string | null>(null);
  const hasAutoCreatedRef = useRef(false);
  // Last known host id — lets us fire the "you are host" toast only on a genuine
  // promotion (host actually changed to us), never on room creation/join where
  // being host is self-evident. Also dedupes repeated `update_players` events.
  const prevHostIdRef = useRef<string | null>(null);
  // Solo rooms are a private, single-player context: lobby toasts ("host", "room
  // ready") are noise there, so we suppress them based on the room capacity.
  const isSoloRoomRef = useRef(false);

  const [view, setView] = useState<LobbyView>(() => {
    if (locationState?.returnToLobby && locationState?.roomId) return 'lobby';
    return 'modes';
  });

  const [showConfig, setShowConfig] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingRoomId, setPendingRoomId] = useState('');

  const [config, setConfig] = useState<GameConfig>(defaultConfig);
  const [roomConfig, setRoomConfig] = useState<RoomConfig>(defaultRoomConfig);

  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string>(locationState?.roomId || '');
  const [isAmIHost, setIsAmIHost] = useState(false);
  const [mySocketId, setMySocketId] = useState<string>(socket.id || '');
  const [joinCode, setJoinCode] = useState('');
  const [availableRooms, setAvailableRooms] = useState<RoomListItem[]>([]);

  const [gameStatus, setGameStatus] = useState<GameStatus>('waiting');
  /** Optimistic latch until the server confirms `starting` (covers socket RTT). */
  const [isLaunchPending, setIsLaunchPending] = useState(false);

  const [multiplayerCount, setMultiplayerCount] = useState(0);

  const getPlayerIdentity = useCallback(
    () => ({ userId: user?.id, username: profile?.username || 'Invité', avatar: profile?.avatar || 'player1' }),
    [user, profile],
  );

  useEffect(() => {
    if (view !== 'roomList') return;

    const subscribe = () => {
      socket.emit('lobby:subscribe_list');
    };

    if (socket.connected) subscribe();
    else socket.once('connect', subscribe);

    return () => {
      socket.off('connect', subscribe);
      if (socket.connected) socket.emit('lobby:unsubscribe_list');
    };
  }, [view]);

  // Live "players in multiplayer rooms" count for the Multiplayer card teaser.
  useEffect(() => {
    const onStats = (s: { inMultiplayer: number }) => setMultiplayerCount(s.inMultiplayer);
    const fetchStats = () => { if (socket.connected) socket.emit('get_home_stats'); };
    socket.on('home_stats', onStats);
    socket.on('connect', fetchStats);
    fetchStats();
    const interval = setInterval(fetchStats, 20_000);
    return () => {
      socket.off('home_stats', onStats);
      socket.off('connect', fetchStats);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (locationState?.createSolo && !hasAutoCreatedRef.current) {
      hasAutoCreatedRef.current = true;
      if (locationState.settings) setConfig(prev => ({ ...prev, ...locationState.settings }));

      const pseudo = profile?.username || 'Joueur';
      const soloRoomName = `${pseudo}'s Solo`;

      const soloRoomPayload = {
        roomName: soloRoomName,
        ...getPlayerIdentity(),
        settings: {
          ...(locationState.settings || config),
          isPrivate: true,
          maxPlayers: 1,
          password: '',
        },
      };
      socket.emit('lobby:create', soloRoomPayload);
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationState, config, user, profile]);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    if (socket.connected) setMySocketId(socket.id || '');

    const onConnect = () => {
      setMySocketId(socket.id || '');
      if (view === 'roomList') socket.emit('lobby:subscribe_list');
    };
    const onRoomsUpdate = (rooms: RoomListItem[]) => setAvailableRooms(rooms);

    const myUserId = user?.id || '';

    const onRoomCreated = (data: { roomId: string; room: { players?: ServerLobbyPlayer[]; status?: GameStatus; settings?: WireRoomSettings } }) => {
      const isSolo = data.room.settings?.maxPlayers === 1;
      isSoloRoomRef.current = isSolo;
      // Creating a room makes you the host by definition — no toast needed.
      prevHostIdRef.current = myUserId || null;

      setCurrentRoomId(data.roomId);
      setIsAmIHost(true);
      setLobbyPlayers(mapServerPlayersToLobby(data.room.players ?? [], myUserId));
      if (data.room.status) setGameStatus(data.room.status);

      if (data.room.settings) {
        setRoomConfig(prev => ({ ...prev, ...data.room.settings, roomName: data.room.settings?.name || prev.roomName }));
      }

      setShowCreateModal(false); setShowConfig(false);
      setView('lobby');
    };

    const onRoomJoined = (data: { roomId: string; players?: ServerLobbyPlayer[]; hostId?: string; settings?: WireRoomSettings; status?: GameStatus }) => {
      isSoloRoomRef.current = data.settings?.maxPlayers === 1;
      // Record the host at join time so a later change (promotion) can be detected.
      prevHostIdRef.current = data.hostId ? String(data.hostId) : null;
      setCurrentRoomId(data.roomId);
      if (data.hostId && myUserId) setIsAmIHost(String(data.hostId) === String(myUserId));
      setLobbyPlayers(mapServerPlayersToLobby(data.players ?? [], data.hostId));

      if (data.settings) {
        setRoomConfig(prev => ({
          ...prev,
          ...data.settings,
          roomName: data.settings?.name || prev.roomName,
          password: data.settings?.password || prev.password,
        }));
      }

      if (data.status) setGameStatus(data.status);
      if (data.status !== 'waiting') setIsLaunchPending(false);
      setShowPasswordModal(false); setPasswordInput(''); setJoinCode('');
      setView('lobby');
    };

    const onRoomUpdated = (data: RoomUpdatedPayload) => {
      setRoomConfig(prev => ({
        ...prev,
        ...data.roomSettings,
        roomName: data.roomName,
      }));
      setLobbyPlayers(mapServerPlayersToLobby(data.players, undefined));
      toast.info('Paramètres mis à jour.');
      setShowCreateModal(false);
    };

    const onRoomClosed = (payload?: { reason?: string }) => {
      toast.error(payload?.reason || 'Salon fermé.');
      setIsLaunchPending(false);
      setCurrentRoomId(''); setLobbyPlayers([]); setGameStatus('waiting'); setView('roomList');
    };
    const onPasswordRequired = (data: { roomId: string }) => { setPendingRoomId(data.roomId); setPasswordInput(''); setShowPasswordModal(true); };

    const onUpdatePlayers = (data: PlayersUpdatePayload) => {
      if (data.hostId && myUserId) {
        const newHostId = String(data.hostId);
        const amINewHost = newHostId === String(myUserId);
        // Only a genuine promotion (host actually changed, from someone else to
        // us) warrants a toast — and the synchronous ref dedupes bursts of
        // `update_players` that would otherwise fire it twice.
        if (
          amINewHost &&
          prevHostIdRef.current !== null &&
          prevHostIdRef.current !== newHostId &&
          !isSoloRoomRef.current
        ) {
          toast.success("Vous êtes l'hôte !");
        }
        prevHostIdRef.current = newHostId;
        setIsAmIHost(amINewHost);
      }
      if (data.status) setGameStatus(data.status);
      if (data.status !== 'waiting') setIsLaunchPending(false);
      setLobbyPlayers(mapServerPlayersToLobby(data.players, data.hostId));
    };

    const onGameStarted = (data: GameStartedPayload & { firstChoices?: string[]; firstDuoChoices?: string[] }) => {
      const isSolo = data.settings?.maxPlayers === 1;
      const gameDataConstructed = { firstVideo: data.firstVideo, firstChoices: data.firstChoices, firstDuoChoices: data.firstDuoChoices };
      setIsLaunchPending(false);
      setGameStatus('playing');
      const safePlayers = mapServerPlayersToLobby(data.players || lobbyPlayers, undefined);
      const localStartTime = Date.now() + (data.introDuration || 3000);

      navigate('/game', {
        state: {
          roomId: data.roomId, gameData: gameDataConstructed, players: safePlayers,
          settings: data.settings, mode: isSolo ? 'solo' : 'multiplayer', gameStartTime: localStartTime,
        },
      });
    };

    const onError = (err: { message: string }) => {
      setIsLaunchPending(false);
      toast.error(err.message || 'Erreur');
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('mot de passe')) setPasswordInput('');
      if (msg.includes('introuvable') || msg.includes('fermé') || msg.includes('complet')) {
        // Wrong/stale code typed on the join screen: just clear the box and stay put.
        setJoinCode('');
        if (view === 'roomList') return;
        // A stale rejoin (e.g. after a refresh) targeting a dead room: recover to modes.
        setCurrentRoomId(''); setLobbyPlayers([]); setGameStatus('waiting'); setView('modes');
        window.history.replaceState({}, document.title);
      }
    };

    socket.on('connect', onConnect); socket.on('rooms_update', onRoomsUpdate);
    socket.on('lobby:joined', (data) => { if (data.isHost) { onRoomCreated({ roomId: data.roomId, room: { players: [], ...data } }); } else { onRoomJoined(data); } });
    socket.on('room_updated', onRoomUpdated); socket.on('room_closed', onRoomClosed); socket.on('password_required', onPasswordRequired); socket.on('update_players', onUpdatePlayers); socket.on('game_started', onGameStarted); socket.on('error', onError);

    return () => { socket.off('connect', onConnect); socket.off('rooms_update', onRoomsUpdate); socket.off('lobby:joined'); socket.off('room_updated', onRoomUpdated); socket.off('room_closed', onRoomClosed); socket.off('password_required', onPasswordRequired); socket.off('update_players', onUpdatePlayers); socket.off('game_started', onGameStarted); socket.off('error', onError); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus, view]);

  // Join a lobby whenever we arrive with a `fromInvite`/`returnToLobby` navigation.
  // Keyed on `location.key` so it fires on EVERY navigation — including clicking
  // "Rejoindre" while already on this page (same route, new history entry), which
  // the socket-lifecycle effect above (deps: view/gameStatus) would otherwise miss.
  useEffect(() => {
    const st = (location.state ?? null) as GameHubLocationState | null;
    if (!st?.roomId || (!st.fromInvite && !st.returnToLobby)) return;
    if (joinedKeyRef.current === location.key) return;
    joinedKeyRef.current = location.key;

    const payload = st.fromInvite
      ? { roomId: st.roomId, fromInvite: true, ...getPlayerIdentity() }
      : { roomId: st.roomId, ...getPlayerIdentity() };
    const doJoin = () => socket.emit('lobby:join', payload);

    if (socket.connected) doJoin();
    else {
      socket.connect();
      socket.once('connect', doJoin);
    }
    // Consume the navigation state so a page refresh doesn't retry a stale join.
    window.history.replaceState({}, document.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const selectMode = useCallback((mode: GameMode) => {
    if (mode === 'competitive') return;
    setConfig(prev => ({ ...prev, mode }));
    if (mode === 'multiplayer') setView('roomList');
    else setShowConfig(true);
  }, []);

  const openCreateRoom = useCallback(() => { setRoomConfig({ ...defaultRoomConfig }); setShowCreateModal(true); }, []);

  const emitSolo = useCallback((soloConfig: GameConfig) => {
    const pseudo = profile?.username || 'Joueur';
    socket.emit('lobby:create', {
      roomName: `${pseudo}'s Solo`,
      ...getPlayerIdentity(),
      settings: { ...soloConfig, isPrivate: true, maxPlayers: 1, password: '' },
    });
  }, [profile, getPlayerIdentity]);

  const startSolo = useCallback(() => { emitSolo(config); }, [config, emitSolo]);

  const createOrUpdateRoom = useCallback((override?: RoomConfig) => {
    const cfg = override ?? roomConfig;
    if (view === 'lobby' && currentRoomId) {
      socket.emit('update_room_settings', { roomId: currentRoomId, settings: cfg });
    } else {
      const payload = { roomName: cfg.roomName?.trim() || '', ...getPlayerIdentity(), settings: cfg };
      socket.emit('lobby:create', payload);
    }
  }, [view, currentRoomId, roomConfig, getPlayerIdentity]);

  const isLaunchStarting = isLaunchPending || gameStatus === 'starting';

  const startLobbyGame = useCallback(() => {
    if (!currentRoomId || !isAmIHost || isLaunchStarting) return;
    setIsLaunchPending(true);
    socket.emit('start_game', { roomId: currentRoomId });
  }, [currentRoomId, isAmIHost, isLaunchStarting]);
  const toggleReady = useCallback(() => { if (currentRoomId) socket.emit('toggle_ready', { roomId: currentRoomId }); }, [currentRoomId]);
  const transferHost = useCallback((targetId: string | number) => { if (currentRoomId && isAmIHost) socket.emit('transfer_host', { roomId: currentRoomId, targetId: String(targetId) }); }, [currentRoomId, isAmIHost]);
  const kickPlayer = useCallback((targetId: string | number) => { if (currentRoomId && isAmIHost) socket.emit('lobby:kick', { roomId: currentRoomId, targetId: String(targetId) }); }, [currentRoomId, isAmIHost]);
  const addBots = useCallback((count: number) => { if (currentRoomId && isAmIHost) socket.emit('dev:add_bots', { roomId: currentRoomId, count }); }, [currentRoomId, isAmIHost]);
  const joinRoom = useCallback((roomId: string) => { const targetRoomId = roomId || joinCode; if (targetRoomId) socket.emit('lobby:join', { roomId: targetRoomId, ...getPlayerIdentity() }); }, [joinCode, getPlayerIdentity]);
  const refreshRooms = useCallback(() => { if (socket.connected) socket.emit('get_rooms'); }, []);
  const submitPassword = useCallback(() => { if (!pendingRoomId || !passwordInput) return; socket.emit('lobby:join', { roomId: pendingRoomId, password: passwordInput, ...getPlayerIdentity() }); }, [pendingRoomId, passwordInput, getPlayerIdentity]);

  const goBack = useCallback(() => {
    if (view === 'lobby' && currentRoomId) {
      socket.emit('leave_room', { roomId: currentRoomId });
      setCurrentRoomId('');
      setLobbyPlayers([]);
    }
    setView('modes');
    // Drop any leftover returnToLobby/roomId so a refresh lands cleanly on modes.
    window.history.replaceState({}, document.title);
  }, [view, currentRoomId]);

  return {
    // identity
    user, profile,
    // view / navigation
    view, setView, navigate,
    // lobby state
    lobbyPlayers, currentRoomId, isAmIHost, mySocketId, gameStatus, isLaunchStarting, availableRooms,
    // teasers / shortcuts
    multiplayerCount,
    // configs
    config, setConfig, roomConfig, setRoomConfig,
    // dialogs
    showConfig, setShowConfig,
    showCreateModal, setShowCreateModal,
    showPasswordModal, setShowPasswordModal,
    passwordInput, setPasswordInput,
    joinCode, setJoinCode,
    // actions
    selectMode, openCreateRoom, startSolo, createOrUpdateRoom,
    startLobbyGame, toggleReady, transferHost, kickPlayer, addBots, joinRoom, submitPassword, goBack, refreshRooms,
  };
}
