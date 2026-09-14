import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PrefVolumeVideo } from './PrefVolumeVideo';

vi.mock('@/features/settings/context/PlayerPrefsContext', () => ({
  usePlayerPrefs: () => ({
    audioVolume: 20,
    audioMuted: true,
    setAudioVolume: vi.fn(),
    setAudioMuted: vi.fn(),
  }),
}));

describe('PrefVolumeVideo', () => {
  it('applies player volume and mute before playback', () => {
    render(<PrefVolumeVideo data-testid="preview" src="about:blank" />);
    const el = screen.getByTestId('preview') as HTMLVideoElement;
    expect(el.muted).toBe(true);
    expect(el.volume).toBeCloseTo(0.2);
  });
});
