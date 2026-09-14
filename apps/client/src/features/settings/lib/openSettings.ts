export type SettingsTab = 'general' | 'social' | 'account';

type Listener = (tab: SettingsTab) => void;
const listeners = new Set<Listener>();

export function openSettings(tab: SettingsTab = 'general'): void {
  listeners.forEach((listener) => listener(tab));
}

export function subscribeSettingsOpen(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
