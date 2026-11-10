import { describe, expect, it } from 'vitest';
import type { GameConfig } from './types';
import {
  parseMatchReplayConfig,
  replayConfigFromSettings,
  soloGameConfigFromReplay,
} from './replayConfig';

const settings = {
  mode: 'multiplayer',
  gameType: 'evolving',
  responseType: 'typing',
  soundCount: 20,
  soundTypes: ['opening'],
  difficulty: ['medium'],
  guessDuration: 15,
  soundSelection: 'random',
  precision: 'franchise',
  evolvingInfiniteReplay: false,
  evolvingReplayLimit: 1,
  hostName: 'Kirikou',
  videoMode: 'hidden',
  songStartMode: 'random',
} satisfies GameConfig;

describe('replayConfigFromSettings', () => {
  it('keeps the rules and drops the host name', () => {
    const snapshot = replayConfigFromSettings(settings);
    expect(snapshot?.gameType).toBe('evolving');
    expect(snapshot?.evolvingReplayLimit).toBe(1);
    expect(snapshot).not.toHaveProperty('hostName');
    expect(snapshot).not.toHaveProperty('mode');
  });
});

describe('parseMatchReplayConfig', () => {
  it('rejects a payload that is not a rules snapshot', () => {
    expect(parseMatchReplayConfig({ password: 'secret' })).toBeNull();
    expect(parseMatchReplayConfig(null)).toBeNull();
  });

  it('reads a snapshot written earlier', () => {
    const snapshot = replayConfigFromSettings(settings);
    expect(snapshot).not.toBeNull();
    expect(parseMatchReplayConfig(snapshot)?.soundCount).toBe(20);
  });
});

describe('soloGameConfigFromReplay', () => {
  it('opens a solo game with the saved rules', () => {
    const snapshot = replayConfigFromSettings(settings);
    expect(snapshot).not.toBeNull();
    if (!snapshot) return;
    const config = soloGameConfigFromReplay(snapshot);
    expect(config.mode).toBe('solo');
    expect(config.gameType).toBe('evolving');
    expect(config.evolvingInfiniteReplay).toBe(false);
  });
});
