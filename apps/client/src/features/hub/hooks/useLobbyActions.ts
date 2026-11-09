import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import type { GameConfig, GameMode, RoomConfig } from '@aniquizz/shared';
import type { LobbyPlayer } from '@/features/hub/components/LobbyPlayerCard';
import { HUB_COPY } from '@/features/hub/copy/hubCopy';
import { soloRoomName } from '@/features/hub/copy/hubCopy';
import { useAuth } from '@/features/auth/context/AuthContext';
import { socket } from '@/lib/socket';
import { createOnceReadyQueue } from '@/lib/socketReady';
import { getPlayBannedMessage, isSanctionActive } from '@/lib/suspension';
import {
  playCreatePath,
  parsePlayConfigSearch,
  resolveLobbySettingsAction,
} from '@/features/hub/playConfigSearch';
import type { LobbyView } from '@/features/hub/lobbySocketPolicy';
import { defaultRoomConfig } from './lobbyDefaults';

type Identity = { userId: string | undefined; username: string; avatar: string };

export function useLobbyActions(input: {
  profile: ReturnType<typeof useAuth>['profile'];
  navigate: NavigateFunction;
  setConfig: Dispatch<SetStateAction<GameConfig>>;
  setRoomConfig: Dispatch<SetStateAction<RoomConfig>>;
  setCurrentRoomId: Dispatch<SetStateAction<string>>;
  currentRoomIdRef: MutableRefObject<string>;
  roomConfigRef: MutableRefObject<RoomConfig>;
  getPlayerIdentity: () => Identity;
  readyQueueRef: MutableRefObject<ReturnType<typeof createOnceReadyQueue>>;
  config: GameConfig;
  locationSearch: string;
  currentRoomId: string;
  roomConfig: RoomConfig;
  leaveConfigRoute: () => void;
  isAmIHost: boolean;
  isLaunchStarting: boolean;
  setIsLaunchPending: Dispatch<SetStateAction<boolean>>;
  joinCode: string;
  pendingRoomId: string;
  passwordInput: string;
  view: LobbyView;
  setView: Dispatch<SetStateAction<LobbyView>>;
  setLobbyPlayers: Dispatch<SetStateAction<LobbyPlayer[]>>;
  silentSettingsPatchRef: MutableRefObject<boolean>;
}) {
  const {
    profile,
    navigate,
    setConfig,
    setRoomConfig,
    setCurrentRoomId,
    currentRoomIdRef,
    roomConfigRef,
    getPlayerIdentity,
    readyQueueRef,
    config,
    locationSearch,
    currentRoomId,
    roomConfig,
    leaveConfigRoute,
    isAmIHost,
    isLaunchStarting,
    setIsLaunchPending,
    joinCode,
    pendingRoomId,
    passwordInput,
    view,
    setView,
    setLobbyPlayers,
    silentSettingsPatchRef,
  } = input;

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
    [profile?.bannedUntil, navigate, setConfig],
  );

  const openCreateRoom = useCallback(() => {
    setRoomConfig({ ...defaultRoomConfig });
    setCurrentRoomId('');
    navigate(playCreatePath('create'));
  }, [navigate, setRoomConfig, setCurrentRoomId]);

  const openLobbySettings = useCallback(() => {
    navigate(playCreatePath('edit', currentRoomIdRef.current), {
      state: { intent: 'edit', draft: roomConfigRef.current, returnTo: '/play' },
    });
  }, [navigate, currentRoomIdRef, roomConfigRef]);

  /** Solo ready Retour: one step back to the config, not the mode list. */
  const returnSoloToConfig = useCallback(() => {
    navigate(playCreatePath('edit', currentRoomIdRef.current), {
      state: {
        intent: 'edit',
        draft: roomConfigRef.current,
        leaveOnBack: true,
      },
    });
  }, [navigate, currentRoomIdRef, roomConfigRef]);

  const emitSolo = useCallback(
    (soloConfig: GameConfig) => {
      const pseudo = profile?.username || HUB_COPY.player;
      readyQueueRef.current.enqueue(() => {
        socket.emit('lobby:create', {
          roomName: soloRoomName(pseudo),
          ...getPlayerIdentity(),
          settings: { ...soloConfig, isPrivate: true, maxPlayers: 1, password: '' },
        });
      });
    },
    [profile, getPlayerIdentity, readyQueueRef],
  );

  const startSolo = useCallback(() => {
    emitSolo(config);
  }, [config, emitSolo]);

  const createOrUpdateRoom = useCallback(
    (override?: RoomConfig) => {
      const cfg = override ?? roomConfig;
      const search = parsePlayConfigSearch(locationSearch);
      const roomId = currentRoomId || search.roomId || '';
      const intent = search.intent ?? (roomId ? 'edit' : 'create');
      const action = resolveLobbySettingsAction(intent, roomId);
      if (action === 'missing-room') {
        toast.error(HUB_COPY.toasts.missingRoom);
        navigate('/play', { replace: true });
        return;
      }
      if (action === 'update') {
        readyQueueRef.current.enqueue(() => {
          socket.emit('update_room_settings', { roomId, settings: cfg });
        });
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
      readyQueueRef.current.enqueue(() => {
        socket.emit('lobby:create', payload);
      });
    },
    [
      currentRoomId,
      roomConfig,
      getPlayerIdentity,
      leaveConfigRoute,
      locationSearch,
      navigate,
      readyQueueRef,
    ],
  );

  const patchRoomSettings = useCallback(
    (patch: Partial<RoomConfig>, silent = false) => {
      if (!currentRoomId || !isAmIHost) return;
      silentSettingsPatchRef.current = silent;
      socket.emit('update_room_settings', { roomId: currentRoomId, settings: patch });
    },
    [currentRoomId, isAmIHost, silentSettingsPatchRef],
  );

  const startLobbyGame = useCallback(() => {
    if (!currentRoomId || !isAmIHost || isLaunchStarting) return;
    setIsLaunchPending(true);
    readyQueueRef.current.enqueue(() => {
      socket.emit('start_game', { roomId: currentRoomId });
    });
  }, [currentRoomId, isAmIHost, isLaunchStarting, readyQueueRef, setIsLaunchPending]);
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
      if (targetRoomId)
        readyQueueRef.current.enqueue(() => {
          socket.emit('lobby:join', { roomId: targetRoomId, ...getPlayerIdentity() });
        });
    },
    [joinCode, getPlayerIdentity, readyQueueRef],
  );
  const refreshRooms = useCallback(() => {
    if (socket.connected) socket.emit('get_rooms');
  }, []);
  const submitPassword = useCallback(() => {
    if (!pendingRoomId || !passwordInput) return;
    readyQueueRef.current.enqueue(() => {
      socket.emit('lobby:join', {
        roomId: pendingRoomId,
        password: passwordInput,
        ...getPlayerIdentity(),
      });
    });
  }, [pendingRoomId, passwordInput, getPlayerIdentity, readyQueueRef]);

  const goBack = useCallback(() => {
    if (view === 'lobby' && currentRoomId) {
      socket.emit('leave_room', { roomId: currentRoomId });
      setCurrentRoomId('');
      setLobbyPlayers([]);
    }
    setView('modes');
    window.history.replaceState({}, document.title);
    navigate('/play', { replace: true });
  }, [view, currentRoomId, navigate, setCurrentRoomId, setLobbyPlayers, setView]);
  return {
    selectMode,
    openCreateRoom,
    openLobbySettings,
    returnSoloToConfig,
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
