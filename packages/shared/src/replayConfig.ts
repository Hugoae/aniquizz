import { z } from 'zod';
import type { GameConfig, GameType, SoundSelection } from './types';
import type { Precision } from './precision';
import type { SongStartMode } from './songStartMode';
import type { VideoMode } from './videoMode';

/**
 * Rules saved on a match so history can offer "play these settings again".
 * A few hundred bytes. The row is shared by every player in the room, so the
 * snapshot stays for the life of the match. Dropping it when the game leaves
 * one profile's last five would remove the button for someone who still sees it.
 */
export interface MatchReplayConfig {
  gameType: GameType;
  responseType: GameConfig['responseType'];
  soundCount: number;
  soundTypes: string[];
  difficulty: string[];
  guessDuration: number;
  soundSelection: SoundSelection;
  precision: Precision;
  watchedMode?: 'union' | 'intersection';
  watchedAllowFallback?: boolean;
  playlistId?: string | null;
  decadePlaylistId?: string | null;
  playlistWatched?: boolean;
  speedBonusEnabled?: boolean;
  timeBudgetSeconds?: number;
  timeAttackPunitiveSkip?: boolean;
  timeAttackReveal?: boolean;
  timeAttackStreakBonus?: boolean;
  timeAttackStreakLength?: number;
  timeAttackStreakBonusSeconds?: number;
  soloInstantReveal?: boolean;
  videoMode?: VideoMode;
  songStartMode?: SongStartMode;
  evolvingInfiniteReplay?: boolean;
  evolvingReplayLimit?: number;
}

const replayConfigSchema = z.object({
  gameType: z.enum(['standard', 'timeAttack', 'evolving']),
  responseType: z.enum(['typing', 'qcm', 'mix']),
  soundCount: z.number().int().min(1).max(200),
  soundTypes: z.array(z.string().min(1).max(40)).max(8),
  difficulty: z.array(z.string().min(1).max(40)).max(8),
  guessDuration: z.number().int().min(1).max(120),
  soundSelection: z.enum(['random', 'mix', 'watched', 'playlist']),
  precision: z.enum(['anime', 'franchise', 'artist']),
  watchedMode: z.enum(['union', 'intersection']).optional(),
  watchedAllowFallback: z.boolean().optional(),
  playlistId: z.string().min(1).max(80).nullable().optional(),
  decadePlaylistId: z.string().min(1).max(80).nullable().optional(),
  playlistWatched: z.boolean().optional(),
  speedBonusEnabled: z.boolean().optional(),
  timeBudgetSeconds: z.number().int().min(1).max(3600).optional(),
  timeAttackPunitiveSkip: z.boolean().optional(),
  timeAttackReveal: z.boolean().optional(),
  timeAttackStreakBonus: z.boolean().optional(),
  timeAttackStreakLength: z.number().int().min(1).max(50).optional(),
  timeAttackStreakBonusSeconds: z.number().int().min(1).max(120).optional(),
  soloInstantReveal: z.boolean().optional(),
  videoMode: z.enum(['hidden', 'blurred', 'peek']).optional(),
  songStartMode: z.enum(['random', 'beginning']).optional(),
  evolvingInfiniteReplay: z.boolean().optional(),
  evolvingReplayLimit: z.number().int().min(0).max(5).optional(),
});

/** Drops secrets and host identity. Null when the rules cannot be stored safely. */
export function replayConfigFromSettings(settings: GameConfig): MatchReplayConfig | null {
  const snapshot: MatchReplayConfig = {
    gameType: settings.gameType,
    responseType: settings.responseType,
    soundCount: settings.soundCount,
    soundTypes: settings.soundTypes ?? [],
    difficulty: settings.difficulty ?? [],
    guessDuration: settings.guessDuration,
    soundSelection: settings.soundSelection,
    precision: settings.precision,
    watchedMode: settings.watchedMode,
    watchedAllowFallback: settings.watchedAllowFallback,
    playlistId: settings.playlistId,
    decadePlaylistId: settings.decadePlaylistId,
    playlistWatched: settings.playlistWatched,
    speedBonusEnabled: settings.speedBonusEnabled,
    timeBudgetSeconds: settings.timeBudgetSeconds,
    timeAttackPunitiveSkip: settings.timeAttackPunitiveSkip,
    timeAttackReveal: settings.timeAttackReveal,
    timeAttackStreakBonus: settings.timeAttackStreakBonus,
    timeAttackStreakLength: settings.timeAttackStreakLength,
    timeAttackStreakBonusSeconds: settings.timeAttackStreakBonusSeconds,
    soloInstantReveal: settings.soloInstantReveal,
    videoMode: settings.videoMode,
    songStartMode: settings.songStartMode,
    evolvingInfiniteReplay: settings.evolvingInfiniteReplay,
    evolvingReplayLimit: settings.evolvingReplayLimit,
  };
  const parsed = replayConfigSchema.safeParse(snapshot);
  return parsed.success ? parsed.data : null;
}

/** Null when the stored JSON is missing or no longer matches the rules shape. */
export function parseMatchReplayConfig(value: unknown): MatchReplayConfig | null {
  const parsed = replayConfigSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Solo game using a saved snapshot. Room name, password, and seat count are not replayed. */
export function soloGameConfigFromReplay(snapshot: MatchReplayConfig): GameConfig {
  return {
    mode: 'solo',
    gameType: snapshot.gameType,
    responseType: snapshot.responseType,
    soundCount: snapshot.soundCount,
    soundTypes: snapshot.soundTypes,
    difficulty: snapshot.difficulty,
    guessDuration: snapshot.guessDuration,
    soundSelection: snapshot.soundSelection,
    precision: snapshot.precision,
    watchedMode: snapshot.watchedMode ?? 'union',
    watchedAllowFallback: snapshot.watchedAllowFallback,
    playlistId: snapshot.playlistId,
    decadePlaylistId: snapshot.decadePlaylistId,
    playlistWatched: snapshot.playlistWatched,
    speedBonusEnabled: snapshot.speedBonusEnabled ?? false,
    timeBudgetSeconds: snapshot.timeBudgetSeconds,
    timeAttackPunitiveSkip: snapshot.timeAttackPunitiveSkip,
    timeAttackReveal: snapshot.timeAttackReveal,
    timeAttackStreakBonus: snapshot.timeAttackStreakBonus,
    timeAttackStreakLength: snapshot.timeAttackStreakLength,
    timeAttackStreakBonusSeconds: snapshot.timeAttackStreakBonusSeconds,
    soloInstantReveal: snapshot.soloInstantReveal,
    videoMode: snapshot.videoMode ?? 'hidden',
    songStartMode: snapshot.songStartMode ?? 'random',
    evolvingInfiniteReplay: snapshot.evolvingInfiniteReplay,
    evolvingReplayLimit: snapshot.evolvingReplayLimit,
  };
}
