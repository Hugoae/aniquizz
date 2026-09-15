import { usePlayerPrefs } from '@/features/settings/context/PlayerPrefsContext';

export function useMotionReduced(): boolean {
  return usePlayerPrefs().motionReduced;
}
