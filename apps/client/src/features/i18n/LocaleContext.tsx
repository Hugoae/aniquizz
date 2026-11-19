import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { resolveAppLocale, type AppLocale } from '@aniquizz/shared';
import { useAuth } from '@/features/auth/context/AuthContext';
import i18n, { applyDocumentLocale } from '@/lib/i18n';
import { readDeviceLocale, writeDeviceLocale } from '@/lib/i18n/localeStorage';
import { socket } from '@/lib/socket';

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { user, profile, profileLoading, patchProfile } = useAuth();
  const [locale, setLocaleState] = useState<AppLocale>(() =>
    resolveAppLocale({
      device: readDeviceLocale(),
      navigatorLanguages: navigator.languages,
    }),
  );

  useEffect(() => {
    if (user && profileLoading) return;
    const next = resolveAppLocale({
      account: user ? profile?.uiLocale : null,
      device: readDeviceLocale(),
      navigatorLanguages: navigator.languages,
    });
    applyDocumentLocale(next);
    // Wait until i18next has the language, then paint. Setting state first
    // froze French strings that were read during that render.
    if (i18n.language === next || i18n.language.startsWith(`${next}-`)) {
      setLocaleState(next);
      return;
    }
    void i18n.changeLanguage(next).then(() => setLocaleState(next));
  }, [user, profileLoading, profile?.uiLocale]);

  const setLocale = useCallback(
    (next: AppLocale) => {
      writeDeviceLocale(next);
      applyDocumentLocale(next);
      void i18n.changeLanguage(next).then(() => setLocaleState(next));
      if (!user) return;
      patchProfile({ uiLocale: next });
      socket.emit('profile:update_prefs', { uiLocale: next });
    },
    [patchProfile, user],
  );

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** Test and story wrapper. Production screens use `LocaleProvider`. */
export function LocaleTestProvider({ children }: { children: ReactNode }) {
  const value = useMemo<LocaleContextValue>(
    () => ({ locale: 'fr', setLocale: () => undefined }),
    [],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used within a LocaleProvider');
  return value;
}
