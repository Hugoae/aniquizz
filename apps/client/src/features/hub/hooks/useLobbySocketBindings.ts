import { useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import {
  isBanSanctionReason,
  normalizeVideoMode,
  type GameConfig,
  type GameStartedPayload,
  type GameStatus,
  type PlayersUpdatePayload,
  type RoomConfig,
  type RoomListItem,
  type RoomSettings,
  type RoomUpdatedPayload,
} from '@aniquizz/shared';
import type { LobbyPlayer } from '@/features/hub/components/LobbyPlayerCard';
import { mapServerPlayersToLobby, type ServerLobbyPlayer } from '@/features/hub/mapLobbyPlayers';
import {
  isLobbyJoinRejectedMessage,
  resolveLobbyJoinedKind,
  shouldRejoinLobbyOnConnect,
  type LobbyView,
} from '@/features/hub/lobbySocketPolicy';
import { HUB_COPY } from '@/features/hub/copy/hubCopy';
import { notifyModerationBan } from '@/lib/suspension';
import { socket } from '@/lib/socket';

type WireRoomSettings = Partial<RoomSettings> & { name?: string; password?: string };

interface LobbySocketRefs {
  pathnameRef: MutableRefObject<string>;
  currentRoomIdRef: MutableRefObject<string>;
  gameStatusRef: MutableRefObject<GameStatus>;
  identityRef: MutableRefObject<{
    userId: string | undefined;
    username: string;
    avatar: string;
  }>;
  lobbyPlayersRef: MutableRefObject<LobbyPlayer[]>;
  navigateRef: MutableRefObject<NavigateFunction>;
  leaveConfigRouteRef: MutableRefObject<() => void>;
  isSoloRoomRef: MutableRefObject<boolean>;
  prevHostIdRef: MutableRefObject<string | null>;
  silentSettingsPatchRef: MutableRefObject<boolean>;
  roomConfigRef: MutableRefObject<RoomConfig>;
  configRef: MutableRefObject<GameConfig>;
}

interface LobbySocketSetters {
  setAvailableRooms: Dispatch<SetStateAction<RoomListItem[]>>;
  setCurrentRoomId: Dispatch<SetStateAction<string>>;
  setIsAmIHost: Dispatch<SetStateAction<boolean>>;
  setLobbyPlayers: Dispatch<SetStateAction<LobbyPlayer[]>>;
  setGameStatus: Dispatch<SetStateAction<GameStatus>>;
  setRoomConfig: Dispatch<SetStateAction<RoomConfig>>;
  setView: Dispatch<SetStateAction<LobbyView>>;
  setIsLaunchPending: Dispatch<SetStateAction<boolean>>;
  setShowPasswordModal: Dispatch<SetStateAction<boolean>>;
  setPasswordInput: Dispatch<SetStateAction<string>>;
  setJoinCode: Dispatch<SetStateAction<string>>;
  setPendingRoomId: Dispatch<SetStateAction<string>>;
}

/** Bind lobby socket listeners once. Identity / roster / navigate live in refs. */
export function useLobbySocketBindings(refs: LobbySocketRefs, setters: LobbySocketSetters): void {
  useEffect(() => {
    const {
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
    } = refs;
    const {
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
    } = setters;

    const onConnect = () => {
      if (pathnameRef.current.endsWith('/join')) socket.emit('lobby:subscribe_list');
      const roomId = currentRoomIdRef.current;
      if (shouldRejoinLobbyOnConnect(roomId, gameStatusRef.current)) {
        socket.emit('lobby:join', { roomId, ...identityRef.current });
      }
    };

    socket.on('connect', onConnect);
    if (socket.connected) onConnect();
    else socket.connect();
    const onRoomsUpdate = (rooms: RoomListItem[]) => setAvailableRooms(rooms);

    const myUserId = () => identityRef.current.userId || '';

    const onRoomCreated = (data: {
      roomId: string;
      room: { players?: ServerLobbyPlayer[]; status?: GameStatus; settings?: WireRoomSettings };
    }) => {
      const isSolo = data.room.settings?.maxPlayers === 1;
      isSoloRoomRef.current = isSolo;
      prevHostIdRef.current = myUserId() || null;

      setCurrentRoomId(data.roomId);
      setIsAmIHost(true);
      setLobbyPlayers(mapServerPlayersToLobby(data.room.players ?? [], myUserId()));
      if (data.room.status) setGameStatus(data.room.status);

      if (data.room.settings) {
        setRoomConfig((prev) => ({
          ...prev,
          ...data.room.settings,
          roomName: data.room.settings?.name || prev.roomName,
          password:
            data.room.settings?.isPrivate === false
              ? ''
              : data.room.settings?.password || prev.password,
        }));
      }

      setView('lobby');
      leaveConfigRouteRef.current();
    };

    const onRoomJoined = (data: {
      roomId: string;
      players?: ServerLobbyPlayer[];
      hostId?: string;
      settings?: WireRoomSettings;
      status?: GameStatus;
    }) => {
      const uid = myUserId();
      isSoloRoomRef.current = data.settings?.maxPlayers === 1;
      prevHostIdRef.current = data.hostId ? String(data.hostId) : null;
      setCurrentRoomId(data.roomId);
      if (data.hostId && uid) setIsAmIHost(String(data.hostId) === String(uid));
      setLobbyPlayers(mapServerPlayersToLobby(data.players ?? [], data.hostId));

      if (data.settings) {
        setRoomConfig((prev) => ({
          ...prev,
          ...data.settings,
          roomName: data.settings?.name || prev.roomName,
          password:
            data.settings?.isPrivate === false ? '' : data.settings?.password || prev.password,
        }));
      }

      if (data.status) setGameStatus(data.status);
      if (data.status !== 'waiting') setIsLaunchPending(false);
      setShowPasswordModal(false);
      setPasswordInput('');
      setJoinCode('');
      setView('lobby');
      if (pathnameRef.current.endsWith('/join')) {
        navigateRef.current('/play', { replace: true });
      }
    };

    const onRoomUpdated = (data: RoomUpdatedPayload) => {
      setRoomConfig((prev) => ({
        ...prev,
        ...data.roomSettings,
        roomName: data.roomName,
        password:
          data.roomSettings?.isPrivate === false
            ? ''
            : data.roomSettings?.password || prev.password,
      }));
      setLobbyPlayers(mapServerPlayersToLobby(data.players, undefined));
      if (!silentSettingsPatchRef.current) {
        toast.info(HUB_COPY.toasts.settingsUpdated);
      }
      silentSettingsPatchRef.current = false;
      leaveConfigRouteRef.current();
    };

    const onRoomClosed = (payload?: { reason?: string }) => {
      const reason = payload?.reason || HUB_COPY.toasts.roomClosed;
      if (!notifyModerationBan(reason)) {
        toast.error(reason);
      }
      setIsLaunchPending(false);
      setCurrentRoomId('');
      setLobbyPlayers([]);
      setGameStatus('waiting');
      if (isBanSanctionReason(reason)) {
        navigateRef.current('/', { replace: true });
        return;
      }
      navigateRef.current('/play/join', { replace: true });
    };
    const onPasswordRequired = (data: { roomId: string }) => {
      setPendingRoomId(data.roomId);
      setPasswordInput('');
      setShowPasswordModal(true);
    };

    const onUpdatePlayers = (data: PlayersUpdatePayload) => {
      const uid = myUserId();
      if (data.hostId && uid) {
        const newHostId = String(data.hostId);
        const amINewHost = newHostId === String(uid);
        if (
          amINewHost &&
          prevHostIdRef.current !== null &&
          prevHostIdRef.current !== newHostId &&
          !isSoloRoomRef.current
        ) {
          toast.success(HUB_COPY.toasts.youAreHost);
        }
        prevHostIdRef.current = newHostId;
        setIsAmIHost(amINewHost);
      }
      if (data.status) setGameStatus(data.status);
      if (data.status !== 'waiting') setIsLaunchPending(false);
      setLobbyPlayers(mapServerPlayersToLobby(data.players, data.hostId));
    };

    const onGameStarted = (
      data: GameStartedPayload & { firstChoices?: string[]; firstDuoChoices?: string[] },
    ) => {
      const isSolo = data.settings?.maxPlayers === 1;
      const gameDataConstructed = {
        firstVideo: data.firstVideo,
        firstChoices: data.firstChoices,
        firstDuoChoices: data.firstDuoChoices,
      };
      setIsLaunchPending(false);
      setGameStatus('playing');
      const safePlayers = mapServerPlayersToLobby(
        data.players || lobbyPlayersRef.current,
        undefined,
      );
      const localStartTime = Date.now() + (data.introDuration || 3000);
      const mergedSettings = {
        ...data.settings,
        videoMode: normalizeVideoMode(
          data.settings?.videoMode ??
            roomConfigRef.current.videoMode ??
            configRef.current.videoMode,
        ),
      };

      navigateRef.current('/game', {
        state: {
          roomId: data.roomId,
          gameData: gameDataConstructed,
          players: safePlayers,
          settings: mergedSettings,
          mode: isSolo ? 'solo' : 'multiplayer',
          gameStartTime: localStartTime,
        },
      });
    };

    const onError = (err: { message: string }) => {
      setIsLaunchPending(false);
      if (notifyModerationBan(err.message)) return;
      toast.error(err.message || HUB_COPY.toasts.genericError);
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('mot de passe')) setPasswordInput('');
      if (isLobbyJoinRejectedMessage(err.message || '')) {
        setJoinCode('');
        if (pathnameRef.current.endsWith('/join')) return;
        setCurrentRoomId('');
        setLobbyPlayers([]);
        setGameStatus('waiting');
        setView('modes');
        window.history.replaceState({}, document.title);
      }
    };

    socket.on('rooms_update', onRoomsUpdate);
    socket.on('lobby:joined', (data) => {
      const isSameRoom = currentRoomIdRef.current === data.roomId;
      if (resolveLobbyJoinedKind({ isHost: Boolean(data.isHost), isSameRoom }) === 'created') {
        onRoomCreated({ roomId: data.roomId, room: { ...data } });
      } else {
        onRoomJoined(data);
      }
    });
    socket.on('room_updated', onRoomUpdated);
    socket.on('room_closed', onRoomClosed);
    socket.on('password_required', onPasswordRequired);
    socket.on('update_players', onUpdatePlayers);
    socket.on('game_started', onGameStarted);
    socket.on('error', onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('rooms_update', onRoomsUpdate);
      socket.off('lobby:joined');
      socket.off('room_updated', onRoomUpdated);
      socket.off('room_closed', onRoomClosed);
      socket.off('password_required', onPasswordRequired);
      socket.off('update_players', onUpdatePlayers);
      socket.off('game_started', onGameStarted);
      socket.off('error', onError);
    };
    // Bind once for the hub lifetime. View/status/identity live in refs so a
    // game_started cannot be dropped while listeners rebind on status change.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs + setters are stable
  }, []);
}
