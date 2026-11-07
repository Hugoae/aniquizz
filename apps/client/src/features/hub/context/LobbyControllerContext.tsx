import { createContext, useContext, useMemo, type Context, type ReactNode } from 'react';
import { useLobbyController } from '@/features/hub/hooks/useLobbyController';

type LobbyControllerValue = ReturnType<typeof useLobbyController>;

export type LobbyPasswordState = Pick<
  LobbyControllerValue,
  | 'showPasswordModal'
  | 'setShowPasswordModal'
  | 'passwordInput'
  | 'setPasswordInput'
  | 'submitPassword'
>;

export type LobbyStatsState = Pick<LobbyControllerValue, 'multiplayerCount'>;

/** Lobby fields without the home-stats counter or the password dialog. */
export type LobbyController = Omit<
  LobbyControllerValue,
  keyof LobbyPasswordState | keyof LobbyStatsState
>;

const LobbyControllerContext = createContext<LobbyController | null>(null);
const LobbyPasswordContext = createContext<LobbyPasswordState | null>(null);
const LobbyStatsContext = createContext<LobbyStatsState | null>(null);

/**
 * One socket controller, three contexts. A `home_stats` tick must not redraw the
 * open lobby or the closed password dialog, and typing a password must not redraw
 * the room list.
 */
export function LobbyControllerProvider({ children }: { children: ReactNode }) {
  const {
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
  } = useLobbyController();

  const lobby = useMemo<LobbyController>(
    () => ({
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
      config,
      setConfig,
      roomConfig,
      setRoomConfig,
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
      goBack,
      refreshRooms,
    }),
    [
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
      config,
      setConfig,
      roomConfig,
      setRoomConfig,
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
      goBack,
      refreshRooms,
    ],
  );

  const password = useMemo<LobbyPasswordState>(
    () => ({
      showPasswordModal,
      setShowPasswordModal,
      passwordInput,
      setPasswordInput,
      submitPassword,
    }),
    [showPasswordModal, setShowPasswordModal, passwordInput, setPasswordInput, submitPassword],
  );

  const stats = useMemo<LobbyStatsState>(() => ({ multiplayerCount }), [multiplayerCount]);

  return (
    <LobbyControllerContext.Provider value={lobby}>
      <LobbyPasswordContext.Provider value={password}>
        <LobbyStatsContext.Provider value={stats}>{children}</LobbyStatsContext.Provider>
      </LobbyPasswordContext.Provider>
    </LobbyControllerContext.Provider>
  );
}

const useRequiredContext = <T,>(context: Context<T | null>, name: string): T => {
  const value = useContext(context);
  if (!value) {
    throw new Error(`${name} must be used within LobbyControllerProvider`);
  }
  return value;
};

export function useLobbyControllerContext(): LobbyController {
  return useRequiredContext(LobbyControllerContext, 'useLobbyControllerContext');
}

export function useLobbyPasswordContext(): LobbyPasswordState {
  return useRequiredContext(LobbyPasswordContext, 'useLobbyPasswordContext');
}

export function useLobbyStatsContext(): LobbyStatsState {
  return useRequiredContext(LobbyStatsContext, 'useLobbyStatsContext');
}
