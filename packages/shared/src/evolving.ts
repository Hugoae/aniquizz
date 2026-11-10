import type { MedalThresholds } from './grading';
import { GAME_CONFIG } from './constants';
import { normalizePrecision, type Precision } from './precision';
import { normalizeSongStartMode, type SongStartMode } from './songStartMode';

/** One excerpt start, replayed longer at each step. Durations do not stack. */
export const EVOLVING_STEPS_SECONDS = [0.25, 0.5, 1, 3, 10, 15] as const;

/** Points for a correct answer on that step. The last step is worth the least. */
export const EVOLVING_STEP_POINTS = [6, 5, 4, 3, 2, 1] as const;

export const EVOLVING_REVEAL_SECONDS = 15;

export const EVOLVING_LAST_STEP_SECONDS = EVOLVING_STEPS_SECONDS[EVOLVING_STEPS_SECONDS.length - 1];

export interface EvolvingStepMark {
  seconds: number;
  points: number;
}

/** Guess-phase cue. There is no clock: the player replays until they answer or pass. */
export interface EvolvingRoundCue {
  stepIndex: number;
  /** Seconds actually played for this step (shorter when the song runs out). */
  clipSeconds: number;
  /** Next step's play length. Null when this step is the last one that can grow. */
  nextClipSeconds: number | null;
  points: number;
  steps: EvolvingStepMark[];
}

export function evolvingSteps(): EvolvingStepMark[] {
  return EVOLVING_STEPS_SECONDS.map((seconds, index) => ({
    seconds,
    points: EVOLVING_STEP_POINTS[index] ?? 1,
  }));
}

export function isEvolvingSettings(
  settings: { gameType?: string | null } | null | undefined,
): boolean {
  return settings?.gameType === 'evolving';
}

/** Evolving is solo. A room with anyone else cannot enter that mode. */
export function evolvingOccupancyBlock(playerCount: number): string | null {
  if (playerCount <= 1) return null;
  return "L'Évolutif se joue en solo : un salon à plusieurs ne peut pas passer dans ce mode.";
}

/** French duration for the in-match notches and the skip label. */
export function formatEvolvingSeconds(seconds: number): string {
  const rounded = Math.round(seconds * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',');
  return `${text} s`;
}

/**
 * Pick the excerpt start once per song.
 * Random keeps a full last step when the song is long enough; otherwise it starts at 0.
 */
export function evolvingExcerptStart(
  durationSeconds: number | null | undefined,
  mode: SongStartMode | string | null | undefined,
): number {
  if (normalizeSongStartMode(mode) === 'beginning') return 0;
  const total = durationSeconds ?? 0;
  const maxStart = Math.floor(total - EVOLVING_LAST_STEP_SECONDS);
  if (maxStart <= 1) return 0;
  return Math.floor(Math.random() * maxStart);
}

/** Play length of one step, capped by whatever audio remains after the excerpt start. */
export function evolvingPlaySeconds(
  stepIndex: number,
  songDurationSeconds: number | null | undefined,
  startSeconds: number,
): number {
  const index = Math.min(EVOLVING_STEPS_SECONDS.length - 1, Math.max(0, Math.floor(stepIndex)));
  const nominal = EVOLVING_STEPS_SECONDS[index] ?? EVOLVING_LAST_STEP_SECONDS;
  if (
    songDurationSeconds == null ||
    !Number.isFinite(songDurationSeconds) ||
    songDurationSeconds <= 0
  ) {
    return nominal;
  }
  const remaining = songDurationSeconds - Math.max(0, startSeconds);
  if (remaining <= 0) return nominal;
  return Math.min(nominal, remaining);
}

export function evolvingPointsForStep(stepIndex: number): number {
  const index = Math.min(EVOLVING_STEP_POINTS.length - 1, Math.max(0, Math.floor(stepIndex)));
  return EVOLVING_STEP_POINTS[index] ?? 1;
}

export function evolvingCue(
  stepIndex: number,
  songDurationSeconds: number | null | undefined,
  startSeconds: number,
): EvolvingRoundCue {
  const index = Math.min(EVOLVING_STEPS_SECONDS.length - 1, Math.max(0, Math.floor(stepIndex)));
  const clipSeconds = evolvingPlaySeconds(index, songDurationSeconds, startSeconds);
  const nextNominal =
    index + 1 < EVOLVING_STEPS_SECONDS.length
      ? evolvingPlaySeconds(index + 1, songDurationSeconds, startSeconds)
      : null;
  const nextClipSeconds =
    nextNominal != null && nextNominal > clipSeconds + 0.001 ? nextNominal : null;
  return {
    stepIndex: index,
    clipSeconds,
    nextClipSeconds,
    points: evolvingPointsForStep(index),
    steps: evolvingSteps(),
  };
}

export function evolvingCanAdvance(cue: EvolvingRoundCue): boolean {
  return cue.nextClipSeconds != null;
}

/** Extra listens after the automatic one, when infinite replay is off. */
export const EVOLVING_REPLAY_LIMIT_MIN = 0;
export const EVOLVING_REPLAY_LIMIT_MAX = 5;
export const EVOLVING_REPLAY_LIMIT_DEFAULT = 1;

/**
 * Null means unlimited replays. A number is how many times play may restart
 * the excerpt after the first automatic listen. 0 is that single listen.
 */
export function resolveEvolvingReplayLimit(
  settings:
    | {
        evolvingInfiniteReplay?: boolean | null;
        evolvingReplayLimit?: number | null;
      }
    | null
    | undefined,
): number | null {
  if (settings?.evolvingInfiniteReplay !== false) return null;
  const raw = settings?.evolvingReplayLimit;
  const value =
    raw == null || !Number.isFinite(raw) ? EVOLVING_REPLAY_LIMIT_DEFAULT : Math.round(raw);
  return Math.min(EVOLVING_REPLAY_LIMIT_MAX, Math.max(EVOLVING_REPLAY_LIMIT_MIN, value));
}

/**
 * Medal ratios for Evolving. A full 6 is rare, so the bars sit on the steps
 * people actually reach: about 2, 3, 4 and 5 points per title on medium.
 */
const EVOLVING_MEDAL_THRESHOLDS: Record<'easy' | 'medium' | 'hard', MedalThresholds> = {
  easy: { bronze: 0.46, silver: 0.58, gold: 0.74, platinum: 0.88 },
  medium: { bronze: 0.4, silver: 0.52, gold: 0.66, platinum: 0.82 },
  hard: { bronze: 0.34, silver: 0.44, gold: 0.58, platinum: 0.74 },
};

const evolvingDifficulty = (raw: string): 'easy' | 'medium' | 'hard' => {
  switch (raw.toLowerCase()) {
    case 'easy':
      return 'easy';
    case 'hard':
      return 'hard';
    default:
      return 'medium';
  }
};

export function evolvingMedalThresholds(
  difficulties: string[],
  precision?: Precision,
): MedalThresholds {
  const rows = difficulties.length > 0 ? difficulties : ['medium'];
  const acc: MedalThresholds = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  for (const raw of rows) {
    const tier = EVOLVING_MEDAL_THRESHOLDS[evolvingDifficulty(raw)];
    acc.bronze += tier.bronze;
    acc.silver += tier.silver;
    acc.gold += tier.gold;
    acc.platinum += tier.platinum;
  }
  const n = rows.length;
  const offset = GAME_CONFIG.MEDALS.PRECISION_OFFSET[normalizePrecision(precision)];
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  return {
    bronze: clamp(acc.bronze / n + offset),
    silver: clamp(acc.silver / n + offset),
    gold: clamp(acc.gold / n + offset),
    platinum: clamp(acc.platinum / n + offset),
  };
}
