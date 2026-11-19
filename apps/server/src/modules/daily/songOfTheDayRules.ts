export type SongOfTheDayBlock = 'past' | 'in-quiz' | 'other-day';

/** Why a staff change is refused. Null means the assignment can proceed. */
export function songOfTheDayChangeBlock(input: {
  isoDate: string;
  today: string;
  songId: number;
  quizSongIds: ReadonlySet<number>;
  otherFeaturedSongIds: ReadonlySet<number>;
}): SongOfTheDayBlock | null {
  if (input.isoDate < input.today) return 'past';
  if (input.quizSongIds.has(input.songId)) return 'in-quiz';
  if (input.otherFeaturedSongIds.has(input.songId)) return 'other-day';
  return null;
}
