import {
  isSpeedBonusEnabled,
  isTimeAttackSettings,
  matchPlaylistPersistence,
  normalizePrecision,
} from '@aniquizz/shared';
import { isBotId } from '@aniquizz/database';
import { logger } from '../../../utils/logger';
import type { EngineDeps } from './matchEngineHost';
import type { Room } from './Room';

/**
 * Writes each title to Postgres when its clip starts, not when the match ends.
 * A restart, a cancel, or a player leaving keeps the rounds already stored.
 * Dev and production each write to their own database.
 */
export interface ActivityHost {
  room: Room;
  deps: EngineDeps;
  playlist: { length: number };
  startedAt: Date;
  finishStarted: boolean;
  activityMatchId: string | null;
  activityOpen: Promise<string | null> | null;
}

/**
 * Opens the row on the first title, not during the intro. Two lanes that
 * start together share one promise, set before the insert awaits.
 */
function ensureActivityMatch(host: ActivityHost): Promise<string | null> | null {
  if (host.activityOpen) return host.activityOpen;
  if (host.finishStarted) return null;
  if (host.room.settings.testMatch === true) return null;
  const open = host.deps.repo.openActivityMatch;
  if (!open) return null;
  const humans = [...host.room.players.values()].filter((player) => !isBotId(player.userId));
  if (!humans.length) return null;

  const settings = host.room.settings;
  const packs = matchPlaylistPersistence(settings);
  host.activityOpen = open({
    startedAt: host.startedAt,
    totalRounds: Math.max(1, host.playlist.length),
    speedBonusEnabled: isSpeedBonusEnabled(settings),
    timeAttack: isTimeAttackSettings(settings),
    responseType: settings.responseType ?? 'mix',
    precision: normalizePrecision(settings.precision),
    playlistId: packs.playlistId,
    decadePlaylistId: packs.decadePlaylistId,
  })
    .then((matchId) => {
      host.activityMatchId = matchId;
      return matchId;
    })
    .catch((error: unknown) => {
      logger.error('[activity] failed to open the match row', 'Scoring', error);
      return null;
    });
  return host.activityOpen;
}

/** The clip on screen counts, even if this title never reaches a reveal. */
export function noteActivityRound(host: ActivityHost, roundNumber: number, songId: number): void {
  const pending = ensureActivityMatch(host);
  if (!pending) return;
  void pending
    .then((matchId) => {
      if (!matchId) return undefined;
      return host.deps.repo.recordPlayedRound?.(matchId, roundNumber, songId);
    })
    .catch((error: unknown) => {
      logger.error('[activity] failed to record a played round', 'Scoring', error);
    });
}

/** A quit keeps the rounds. A finish in progress must not be rewritten as abandoned. */
export function abandonScheduledActivity(host: ActivityHost): void {
  if (host.finishStarted) return;
  const pending = host.activityOpen;
  host.activityOpen = null;
  host.activityMatchId = null;
  if (!pending) return;
  void pending.then((matchId) => {
    if (matchId) return host.deps.repo.abandonActivityMatch?.(matchId);
    return undefined;
  });
}

/** Hands the opened id to the finish writer, once, so cancel cannot abandon it afterwards. */
export async function takeActivityMatchId(host: ActivityHost): Promise<string | null> {
  const pending = host.activityOpen;
  host.activityOpen = null;
  host.activityMatchId = null;
  if (!pending) return null;
  return pending;
}
