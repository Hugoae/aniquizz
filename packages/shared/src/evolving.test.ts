import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeMedal, medalMarkerScores } from './grading';
import {
  evolvingCanAdvance,
  evolvingCue,
  evolvingExcerptStart,
  evolvingPlaySeconds,
  evolvingPointsForStep,
  formatEvolvingSeconds,
  resolveEvolvingReplayLimit,
} from './evolving';

describe('evolving ladder', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scores the short steps higher', () => {
    expect(evolvingPointsForStep(0)).toBe(6);
    expect(evolvingPointsForStep(1)).toBe(5);
    expect(evolvingPointsForStep(5)).toBe(1);
  });

  it('formats the notch labels', () => {
    expect(formatEvolvingSeconds(0.25)).toBe('0,25 s');
    expect(formatEvolvingSeconds(0.5)).toBe('0,5 s');
    expect(formatEvolvingSeconds(15)).toBe('15 s');
  });

  it('starts at the beginning when asked, or when the song cannot hold 15 s', () => {
    expect(evolvingExcerptStart(90, 'beginning')).toBe(0);
    expect(evolvingExcerptStart(10, 'random')).toBe(0);
  });

  it('picks a random start that still leaves the last step', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(evolvingExcerptStart(90, 'random')).toBe(37);
  });

  it('caps a step when the song runs out, and stops the ladder there', () => {
    expect(evolvingPlaySeconds(0, 90, 0)).toBe(0.25);
    expect(evolvingPlaySeconds(4, 4, 0)).toBe(4);
    expect(evolvingPlaySeconds(5, 4, 0)).toBe(4);

    const early = evolvingCue(3, 4, 0);
    expect(early.clipSeconds).toBe(3);
    expect(early.nextClipSeconds).toBe(4);
    expect(evolvingCanAdvance(early)).toBe(true);

    const stuck = evolvingCue(4, 4, 0);
    expect(stuck.nextClipSeconds).toBeNull();
    expect(evolvingCanAdvance(stuck)).toBe(false);
  });

  it('places medium Franchise medals on the steps people actually reach', () => {
    const markers = medalMarkerScores(6, ['medium'], 'franchise', true);
    expect(markers).toEqual({ bronze: 2, silver: 3, gold: 4, platinum: 5 });
    expect(computeMedal(2, 6, ['medium'], 'franchise', true)).toBe('bronze');
    expect(computeMedal(3, 6, ['medium'], 'franchise', true)).toBe('silver');
    expect(computeMedal(4, 6, ['medium'], 'franchise', true)).toBe('gold');
    expect(computeMedal(5, 6, ['medium'], 'franchise', true)).toBe('platinum');
    expect(computeMedal(1, 6, ['medium'], 'franchise', true)).toBeNull();
  });

  it('keeps infinite replay unless it is turned off', () => {
    expect(resolveEvolvingReplayLimit({})).toBeNull();
    expect(resolveEvolvingReplayLimit({ evolvingInfiniteReplay: true })).toBeNull();
    expect(resolveEvolvingReplayLimit({ evolvingInfiniteReplay: false })).toBe(1);
    expect(
      resolveEvolvingReplayLimit({ evolvingInfiniteReplay: false, evolvingReplayLimit: 0 }),
    ).toBe(0);
    expect(
      resolveEvolvingReplayLimit({ evolvingInfiniteReplay: false, evolvingReplayLimit: 9 }),
    ).toBe(5);
  });

  it('keeps a next step on a full-length song', () => {
    const first = evolvingCue(0, 90, 0);
    expect(first.clipSeconds).toBe(0.25);
    expect(first.nextClipSeconds).toBe(0.5);
    expect(first.points).toBe(6);
    expect(evolvingCanAdvance(evolvingCue(5, 90, 0))).toBe(false);
  });
});
