import type { RevealSong, RoundHistoryEntry } from '@aniquizz/shared';
import { toPlaybackUrl } from '../../../lib/mediaPlaybackUrl';
import type { PlaylistItem, RecordedRound } from './types';

/** Public reveal payload for a playlist row (no answer leaks). */
export function toRevealSong(item: PlaylistItem): RevealSong {
  return {
    id: item.id,
    anime: item.anime,
    title: item.title,
    artist: item.artist,
    type: item.typeLabel,
    difficulty: item.difficulty,
    cover: item.cover,
    franchise: item.franchise,
    year: item.year,
    season: item.season,
    format: item.format,
    episodeRange: item.episodeRange,
    coverColor: item.coverColor,
    siteUrl: item.siteUrl,
    tags: item.tags,
    animeId: item.animeId,
    videoKey: toPlaybackUrl(item.videoKey),
    videoStartTime: 0,
  };
}

/** Authoritative per-player round recap for game-over and reconnect sync. */
export function buildRoundHistoryByUser(
  playlist: PlaylistItem[],
  recordedRounds: RecordedRound[],
  playerIds: string[],
): Record<string, RoundHistoryEntry[]> {
  const playlistBySongId = new Map(playlist.map((item) => [item.id, item]));
  const byUser = new Map<string, RoundHistoryEntry[]>();

  for (const recorded of recordedRounds) {
    const item = playlistBySongId.get(recorded.songId) ?? playlist[recorded.roundNumber - 1];
    if (!item) continue;
    const song = toRevealSong(item);
    const answersByUser = new Map(recorded.answers.map((a) => [a.userId, a]));

    for (const userId of playerIds) {
      const answer = answersByUser.get(userId);
      const entry: RoundHistoryEntry = {
        round: recorded.roundNumber,
        song,
        isCorrect: answer?.isCorrect ?? false,
        points: answer?.pointsAwarded ?? 0,
        myAnswer: answer?.answer ?? null,
        answerType: answer?.answerType ?? null,
        answerTimeMs: answer?.isCorrect && answer.timeMs != null ? answer.timeMs : null,
        speedRank: answer?.speedRank ?? null,
        speedBonus: answer?.speedBonus ?? 0,
      };
      const list = byUser.get(userId) ?? [];
      list.push(entry);
      byUser.set(userId, list);
    }
  }

  return Object.fromEntries(byUser);
}
