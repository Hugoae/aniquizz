import { normalizePlayerPrefs, resolveMotionReduced, type MotionMode } from '@aniquizz/shared';
import { readPlayerPrefs } from '@/features/settings/lib/playerPrefsStorage';

export function resolvedMotionValue(mode: MotionMode, osPrefersReduced: boolean): 'reduced' | 'full' {
  return resolveMotionReduced(mode, osPrefersReduced) ? 'reduced' : 'full';
}

export function readOsPrefersReduced(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function subscribeOsPrefersReduced(onChange: (matches: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listener = () => onChange(mq.matches);
  mq.addEventListener('change', listener);
  return () => mq.removeEventListener('change', listener);
}

/** Apply the resolved motion flag before paint / after a pref change. */
export function applyMotionAttribute(mode: MotionMode, osPrefersReduced: boolean): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-motion', resolvedMotionValue(mode, osPrefersReduced));
}

export function applyStoredMotionAttribute(): void {
  const prefs = normalizePlayerPrefs(readPlayerPrefs());
  applyMotionAttribute(prefs.motionMode, readOsPrefersReduced());
}
