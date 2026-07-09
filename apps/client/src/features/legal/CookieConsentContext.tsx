import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  hasCookieConsentDecision,
  readCookieConsent,
  writeCookieConsent,
  type CookieConsentState,
} from '@/features/legal/cookieConsent';

interface CookieConsentContextValue {
  consent: CookieConsentState | null;
  bannerOpen: boolean;
  acceptAll: () => void;
  rejectOptional: () => void;
  savePreferences: (analytics: boolean) => void;
  openBanner: () => void;
  closeBanner: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentState | null>(() => readCookieConsent());
  const [bannerOpen, setBannerOpen] = useState(() => !hasCookieConsentDecision());

  const persist = useCallback((analytics: boolean) => {
    const next = writeCookieConsent(analytics);
    setConsent(next);
    setBannerOpen(false);
  }, []);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      bannerOpen,
      acceptAll: () => persist(true),
      rejectOptional: () => persist(false),
      savePreferences: persist,
      openBanner: () => setBannerOpen(true),
      closeBanner: () => setBannerOpen(false),
    }),
    [consent, bannerOpen, persist],
  );

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider');
  }
  return ctx;
}
