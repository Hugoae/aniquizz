import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EVOLVING_REVEAL_SECONDS, revealClockMs } from '@aniquizz/shared';
import {
  advanceToGuessing,
  createEngineHarness,
  getPlayer,
  makePlaylistItem,
} from './matchEngineTestHarness';

vi.mock('../../../utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const song = () =>
  makePlaylistItem({
    clipDurationSeconds: 120,
    videoStartTime: 0,
    guessDuration: 0.25,
  });

describe('MatchEngine evolving ladder', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function start() {
    const harness = createEngineHarness({
      settings: { mode: 'solo', gameType: 'evolving', responseType: 'typing', maxPlayers: 1 },
      playlist: [song(), makePlaylistItem({ id: 2, anime: 'Bleach', validAnswers: ['Bleach'] })],
      playerIds: ['player-1'],
    });
    await advanceToGuessing(harness.engine);
    return harness;
  }

  it('opens on the first step and does not end when time passes', async () => {
    const { engine } = await start();
    const round = engine.getSyncState().round;
    expect(round?.evolving?.stepIndex).toBe(0);
    expect(round?.evolving?.clipSeconds).toBe(0.25);
    expect(round?.evolving?.points).toBe(6);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(engine.getSyncState().phase).toBe('guessing');
    expect(engine.getSyncState().round?.evolving?.stepIndex).toBe(0);
  });

  it('scores a correct answer on the current step and reveals', async () => {
    const { engine, room } = await start();
    engine.handleAnswer('player-1', 'Naruto', 'typing');
    expect(engine.getSyncState().phase).toBe('reveal');
    expect(getPlayer(room, 'player-1').score).toBe(6);
    expect(engine.getSyncState().reveal?.durationSeconds).toBe(EVOLVING_REVEAL_SECONDS);
  });

  it('lengthens the excerpt after a wrong answer or a skip', async () => {
    const { engine, room } = await start();
    engine.handleAnswer('player-1', 'Bleach', 'typing');
    expect(engine.getSyncState().phase).toBe('guessing');
    expect(engine.getSyncState().round?.evolving?.stepIndex).toBe(1);
    expect(engine.getSyncState().round?.evolving?.clipSeconds).toBe(0.5);
    expect(getPlayer(room, 'player-1').score).toBe(0);

    engine.forceEndRound();
    expect(engine.getSyncState().round?.evolving?.stepIndex).toBe(2);
    expect(engine.getSyncState().round?.evolving?.points).toBe(4);
  });

  it('ends the title on the last step and when it is abandoned', async () => {
    const { engine, room } = await start();
    engine.abandonRound();
    expect(engine.getSyncState().phase).toBe('reveal');
    expect(getPlayer(room, 'player-1').score).toBe(0);

    await vi.advanceTimersByTimeAsync(revealClockMs(EVOLVING_REVEAL_SECONDS));
    expect(engine.getSyncState().phase).toBe('guessing');
    expect(engine.getSyncState().currentRound).toBe(2);
  });
});
