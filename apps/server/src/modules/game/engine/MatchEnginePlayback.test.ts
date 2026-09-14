import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAME_CONFIG, type RoundRevealPayload, type RoundStartPayload } from '@aniquizz/shared';
import { createEngineHarness, makePlaylistItem } from './matchEngineTestHarness';

vi.mock('../../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../lib/mediaPlaybackUrl', () => ({
  toPlaybackUrl: (videoKey: string) =>
    `https://media.test/v/${Buffer.from(videoKey).toString('hex')}`,
}));

const assertOpaquePlaybackUrl = (value: string | null | undefined) => {
  expect(value).toMatch(/^https:\/\/media\.test\/v\/[0-9a-f]+$/);
  expect(value).not.toMatch(/\.mp4/i);
  expect(value).not.toContain('Naruto');
  expect(value).not.toContain('OP2');
  expect(value).not.toContain('videos/test');
};

describe('MatchEngine opaque playback URLs', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps guessing, preload, and next-clip locators free of the R2 filename', async () => {
    const { engine, emitted } = createEngineHarness({
      playlist: [
        makePlaylistItem({ videoKey: 'DEATHNOTE-1535-OP2.mp4' }),
        makePlaylistItem({
          id: 2,
          anime: 'Bleach',
          validAnswers: ['Bleach'],
          videoKey: 'Bleach-5-OP1.mp4',
        }),
      ],
    });

    await engine.start();
    assertOpaquePlaybackUrl(engine.getSyncState().introFirstVideo);
    const preload = emitted.find((e) => e.event === 'game:preload');
    assertOpaquePlaybackUrl((preload?.payload as { videoKey: string }).videoKey);

    await vi.advanceTimersByTimeAsync(GAME_CONFIG.TIMERS.INTRO_DELAY);
    await vi.advanceTimersByTimeAsync(GAME_CONFIG.TIMERS.ROUND1_READY_DELAY);
    const roundStart = emitted.filter((e) => e.event === 'round_start').at(-1);
    const startPayload = roundStart?.payload as RoundStartPayload;
    assertOpaquePlaybackUrl(startPayload.videoKey);
    assertOpaquePlaybackUrl(engine.getSyncState().round?.videoKey);

    engine.forceEndRound();
    const reveal = emitted.find((e) => e.event === 'round_reveal');
    const revealPayload = reveal?.payload as RoundRevealPayload;
    assertOpaquePlaybackUrl(revealPayload.song.videoKey);
    assertOpaquePlaybackUrl(revealPayload.nextVideo);
  });
});
