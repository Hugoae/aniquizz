import { createContext, useContext, type ReactNode } from 'react';
import { useLobbyController } from '@/features/hub/hooks/useLobbyController';

export type LobbyController = ReturnType<typeof useLobbyController>;

const LobbyControllerContext = createContext<LobbyController | null>(null);

/** Single socket-backed lobby controller shared across all `/play/*` routes. */
export function LobbyControllerProvider({ children }: { children: ReactNode }) {
  const value = useLobbyController();
  return <LobbyControllerContext.Provider value={value}>{children}</LobbyControllerContext.Provider>;
}

export function useLobbyControllerContext(): LobbyController {
  const ctx = useContext(LobbyControllerContext);
  if (!ctx) {
    throw new Error('useLobbyControllerContext must be used within LobbyControllerProvider');
  }
  return ctx;
}
