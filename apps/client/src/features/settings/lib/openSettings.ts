export type SettingsTab = 'general' | 'social' | 'account';

type OpenListener = (tab: SettingsTab) => void;
const openListeners = new Set<OpenListener>();

export function openSettings(tab: SettingsTab = 'general'): void {
  openListeners.forEach((listener) => listener(tab));
}

export function subscribeSettingsOpen(listener: OpenListener): () => void {
  openListeners.add(listener);
  return () => {
    openListeners.delete(listener);
  };
}

type SuppressListener = (suppressed: boolean) => void;
const suppressListeners = new Set<SuppressListener>();
let suppressCount = 0;

/** Game / DailyPlay mount a modal instead — hide the floating widget while they are open. */
export function suppressFloatingSettings(): () => void {
  suppressCount += 1;
  suppressListeners.forEach((listener) => listener(suppressCount > 0));
  return () => {
    suppressCount = Math.max(0, suppressCount - 1);
    suppressListeners.forEach((listener) => listener(suppressCount > 0));
  };
}

export function subscribeFloatingSettingsSuppressed(listener: SuppressListener): () => void {
  listener(suppressCount > 0);
  suppressListeners.add(listener);
  return () => {
    suppressListeners.delete(listener);
  };
}
