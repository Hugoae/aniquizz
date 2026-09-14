/**
 * Play hub controller — owns the lobby state machine and all socket wiring for /play.
 *
 * Views: modes → /play/join → /play/create → lobby (solo skips join list).
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
  type GameStatus,
  type RoomListItem,
  type RoomSettings,
} from '@aniquizz/shared';
import type { LobbyPlayer } from '@/features/hub/components/LobbyPlayerCard';
import { HUB_COPY, soloRoomName } from '@/features/hub/copy/hubCopy';
import { shouldPollHubHomeStats, type LobbyView } from '@/features/hub/lobbySocketPolicy';

import { useAuth } from '@/features/auth/context/AuthContext';
import { useLobbySocketBindings } from '@/features/hub/hooks/useLobbySocketBindings';
import { socket } from '@/lib/socket';
import { getPlayBannedMessage, isSanctionActive } from '@/lib/suspension';
import {
  playCreatePath,
  parsePlayConfigSearch,
  resolveLobbySettingsAction,
} from '@/features/hub/playConfigSearch';

export type { LobbyView } from '@/features/hub/lobbySocketPolicy';

/** Navigation state used to resume/join a lobby or auto-create a solo game. */
interface GameHubLocationState {
  returnToLobby?: boolean;
  fromInvite?: boolean;
  createSolo?: boolean;
  roomId?: string;
  settings?: Partial<GameConfig>;
}

/** RoomSettings as they arrive over the wire (server adds `name`/`password`). */
type WireRoomSettings = Partial<RoomSettings> & { name?: string; password?: string };

export const defaultConfig: GameConfig = {
  mode: 'solo',
  gameType: 'standard',
  responseType: 'mix',
  soundCount: 20,
  soundTypes: ['opening'],
  difficulty: ['medium'],
  guessDuration: 15,
  soundSelection: 'random',
  precision: 'franchise',
  watchedMode: 'union',
  videoMode: 'hidden',
  songStartMode: 'random',
};

export const defaultRoomConfig: RoomConfig = {
  ...defaultConfig,
  mode: 'multiplayer',
  roomName: '',
  isPrivate: false,
  password: '',
  maxPlayers: 16,
};

/**
 * Owns the whole Play/lobby state machine: socket lifecycle, lobby state,
 * view transitions, dialogs and the emit actions. Keeps play routes presentational.
 */
export function useLobbyController() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state ?? null) as GameHubLocationState | null;
  const { user, profile } = useAuth();
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  const joinedKeyRef = useRef<string | null>(null);
  const hasAutoCreatedRef = useRef(false);
  const silentSettingsPatchRef = useRef(false);
  const prevHostIdRef = useRef<string | null>(null);
  const isSoloRoomRef = useRef(false);
  /** Keep room identity across socket replace so reconnect can re-join the IO channel. */
  const currentRoomIdRef = useRef('');
  const gameStatusRef = useRef<GameStatus>('waiting');
  const identityRef = useRef<{
    userId: string | undefined;
    username: string;
    avatar: string;
  }>({
    userId: user?.id,
    username: HUB_COPY.guest,
    avatar: 'player1',
  });

  const [view, setView] = useState<LobbyView>(() => {
    if (locationState?.returnToLobby && locationState?.roomId) return 'lobby';
    return 'modes';
  });
  const viewRef = useRef(view);
  viewRef.current = view;

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [pendingRoomId, setPendingRoomId] = useState('');

  const [config, setConfig] = useState<GameConfig>(defaultConfig);
  const [roomConfig, setRoomConfig] = useState<RoomConfig>(defaultRoomConfig);
  const configRef = useRef(config);
  const roomConfigRef = useRef(roomConfig);
  configRef.current = config;
  roomConfigRef.current = roomConfig;

  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const lobbyPlayersRef = useRef(lobbyPlayers);
  lobbyPlayersRef.current = lobbyPlayers;
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const [currentRoomId, setCurrentRoomId] = useState<string>(
    () => locationState?.roomId || parsePlayConfigSearch(location.search).roomId || '',
  );
  const [isAmIHost, setIsAmIHost] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [availableRooms, setAvailableRooms] = useState<RoomListItem[]>([]);

  const [gameStatus, setGameStatus] = useState<GameStatus>('waiting');
  const [isLaunchPending, setIsLaunchPending] = useState(false);

  const [multiplayerCount, setMultiplayerCount] = useState(0);

  const getPlayerIdentity = useCallback(
    () => ({
      userId: user?.id,
      username: profile?.username || HUB_COPY.guest,
      avatar: profile?.avatar || 'player1',
    }),
    [user, profile],
  );
  currentRoomIdRef.current = currentRoomId;
  gameStatusRef.current = gameStatus;
  identityRef.current = getPlayerIdentity();

  const leaveConfigRoute = useCallback(() => {
    if (pathnameRef.current.includes('/play/create')) {
      navigate('/play', { replace: true });
    }
  }, [navigate]);
  const leaveConfigRouteRef = useRef(leaveConfigRoute);
  leaveConfigRouteRef.current = leaveConfigRoute;

  useEffect(() => {
    const onJoinRoute = location.pathname.endsWith('/join');
    if (!onJoinRoute) return;

    const subscribe = () => {
      socket.emit('lobby:subscribe_list');
    };

    if (socket.connected) subscribe();
    else socket.once('connect', subscribe);

    return () => {
      socket.off('connect', subscribe);
      if (socket.connected) socket.emit('lobby:unsubscribe_list');
    };
  }, [location.pathname]);

  useEffect(() => {
    const onStats = (s: { inMultiplayer: number }) => setMultiplayerCount(s.inMultiplayer);
    const fetchStats = () => {
      if (!shouldPollHubHomeStats(pathnameRef.current, viewRef.current)) return;
      if (socket.connected) socket.emit('get_home_stats');
    };
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
    if (shouldPollHubHomeStats(location.pathname, view) && socket.connected) {
      socket.emit('get_home_stats');
    }
  }, [view, location.pathname]);

  useEffect(() => {
    if (locationState?.createSolo && !hasAutoCreatedRef.current) {
      hasAutoCreatedRef.current = true;
      if (locationState.settings) setConfig((prev) => ({ ...prev, ...locationState.settings }));

      const pseudo = profile?.username || HUB_COPY.player;
      const soloRoomNameValue = soloRoomName(pseudo);

      const soloRoomPayload = {
        roomName: soloRoomNameValue,
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

  useLobbySocketBindings(
    {
      pathnameRef,
      currentRoomIdRef,
      gameStatusRef,
      identityRef,
      lobbyPlayersRef,
      navigateRef,
      leaveConfigRouteRef,
      isSoloRoomRef,
      prevHostIdRef,
      silentSettingsPatchRef,
      roomConfigRef,
      configRef,
    },
    {
      setAvailableRooms,
      setCurrentRoomId,
      setIsAmIHost,
      setLobbyPlayers,
      setGameStatus,
      setRoomConfig,
      setView,
      setIsLaunchPending,
      setShowPasswordModal,
      setPasswordInput,
      setJoinCode,
      setPendingRoomId,
    },
  );

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
    window.history.replaceState({}, document.title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  const selectMode = useCallback(
    (mode: GameMode) => {
      if (mode === 'competitive') return;
      if (isSanctionActive(profile?.bannedUntil)) {
        toast.error(getPlayBannedMessage(profile?.bannedUntil));
        return;
      }
      setConfig((prev) => ({ ...prev, mode }));
      if (mode === 'multiplayer') navigate('/play/join');
      else navigate(playCreatePath('solo'));
    },
    [profile?.bannedUntil, navigate],
  );

  const openCreateRoom = useCallback(() => {
    setRoomConfig({ ...defaultRoomConfig });
    setCurrentRoomId('');
    navigate(playCreatePath('create'));
  }, [navigate]);

  const openLobbySettings = useCallback(() => {
    navigate(playCreatePath('edit', currentRoomIdRef.current), {
      state: { intent: 'edit', draft: roomConfigRef.current, returnTo: '/play' },
    });
  }, [navigate]);

  const emitSolo = useCallback(
    (soloConfig: GameConfig) => {
      const pseudo = profile?.username || HUB_COPY.player;
      socket.emit('lobby:create', {
        roomName: soloRoomName(pseudo),
        ...getPlayerIdentity(),
        settings: { ...soloConfig, isPrivate: true, maxPlayers: 1, password: '' },
      });
    },
    [profile, getPlayerIdentity],
  );

  const startSolo = useCallback(() => {
    emitSolo(config);
  }, [config, emitSolo]);

  const createOrUpdateRoom = useCallback(
    (override?: RoomConfig) => {
      const cfg = override ?? roomConfig;
      const search = parsePlayConfigSearch(location.search);
      const roomId = currentRoomId || search.roomId || '';
      const intent = search.intent ?? (roomId ? 'edit' : 'create');
      const action = resolveLobbySettingsAction(intent, roomId);
      if (action === 'missing-room') {
        toast.error(HUB_COPY.toasts.missingRoom);
        navigate('/play', { replace: true });
        return;
      }
      if (action === 'update') {
        socket.emit('update_room_settings', { roomId, settings: cfg });
        // Don't wait for room_updated — host may be off the Socket.IO channel after
        // a session replace; settings still apply server-side via roomId lookup.
        leaveConfigRoute();
        return;
      }
      const payload = {
        roomName: cfg.roomName?.trim() || '',
        ...getPlayerIdentity(),
        settings: cfg,
      };
      socket.emit('lobby:create', payload);
    },
    [currentRoomId, roomConfig, getPlayerIdentity, leaveConfigRoute, location.search, navigate],
  );

  const patchRoomSettings = useCallback(
    (patch: Partial<RoomConfig>, silent = false) => {
      if (!currentRoomId || !isAmIHost) return;
      silentSettingsPatchRef.current = silent;
      socket.emit('update_room_settings', { roomId: currentRoomId, settings: patch });
    },
    [currentRoomId, isAmIHost],
  );

  const isLaunchStarting = isLaunchPending || gameStatus === 'starting';

  const startLobbyGame = useCallback(() => {
    if (!currentRoomId || !isAmIHost || isLaunchStarting) return;
    setIsLaunchPending(true);
    socket.emit('start_game', { roomId: currentRoomId });
  }, [currentRoomId, isAmIHost, isLaunchStarting]);
  const toggleReady = useCallback(() => {
    if (currentRoomId) socket.emit('toggle_ready', { roomId: currentRoomId });
  }, [currentRoomId]);
  const transferHost = useCallback(
    (targetId: string | number) => {
      if (currentRoomId && isAmIHost)
        socket.emit('transfer_host', { roomId: currentRoomId, targetId: String(targetId) });
    },
    [currentRoomId, isAmIHost],
  );
  const kickPlayer = useCallback(
    (targetId: string | number) => {
      if (currentRoomId && isAmIHost)
        socket.emit('lobby:kick', { roomId: currentRoomId, targetId: String(targetId) });
    },
    [currentRoomId, isAmIHost],
  );
  const addBots = useCallback(
    (count: number) => {
      if (currentRoomId && isAmIHost) socket.emit('dev:add_bots', { roomId: currentRoomId, count });
    },
    [currentRoomId, isAmIHost],
  );
  const joinRoom = useCallback(
    (roomId: string) => {
      const targetRoomId = roomId || joinCode;
      if (targetRoomId) socket.emit('lobby:join', { roomId: targetRoomId, ...getPlayerIdentity() });
    },
    [joinCode, getPlayerIdentity],
  );
  const refreshRooms = useCallback(() => {
    if (socket.connected) socket.emit('get_rooms');
  }, []);
  const submitPassword = useCallback(() => {
    if (!pendingRoomId || !passwordInput) return;
    socket.emit('lobby:join', {
      roomId: pendingRoomId,
      password: passwordInput,
      ...getPlayerIdentity(),
    });
  }, [pendingRoomId, passwordInput, getPlayerIdentity]);

  const goBack = useCallback(() => {
    if (view === 'lobby' && currentRoomId) {
      socket.emit('leave_room', { roomId: currentRoomId });
      setCurrentRoomId('');
      setLobbyPlayers([]);
    }
    setView('modes');
    window.history.replaceState({}, document.title);
    navigate('/play', { replace: true });
  }, [view, currentRoomId, navigate]);

  return {
    user,
    profile,
    view,
    setView,
    navigate,
    lobbyPlayers,
    currentRoomId,
    isAmIHost,
    gameStatus,
    isLaunchStarting,
    availableRooms,
    multiplayerCount,
    config,
    setConfig,
    roomConfig,
    setRoomConfig,
    showPasswordModal,
    setShowPasswordModal,
    passwordInput,
    setPasswordInput,
    joinCode,
    setJoinCode,
    selectMode,
    openCreateRoom,
    openLobbySettings,
    startSolo,
    createOrUpdateRoom,
    patchRoomSettings,
    startLobbyGame,
    toggleReady,
    transferHost,
    kickPlayer,
    addBots,
    joinRoom,
    submitPassword,
    goBack,
    refreshRooms,
  };
}
