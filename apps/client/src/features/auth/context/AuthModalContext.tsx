import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type AuthModalContextType = {
  showAuthModal: boolean;
  setShowAuthModal: (open: boolean) => void;
};

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

/** Isolated modal open state so toggling login does not re-render the whole auth tree. */
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const value = useMemo(
    () => ({ showAuthModal, setShowAuthModal }),
    [showAuthModal],
  );
  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>;
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (context === undefined) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
}
