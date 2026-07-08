import { computeCompetitionRanks, type GamePlayer } from '@aniquizz/shared';

/** Players still actively in the match (excludes lobby returns). */
export function activeMatchPlayers(players: GamePlayer[]): GamePlayer[] {
  return players.filter((p) => p.isInGame !== false);
}

/** Display label — lobby payloads use `name`, wire payloads use `username`. */
export function playerDisplayName(p: Pick<GamePlayer, 'id' | 'username'> & { name?: string }): string {
  return p.username || p.name || `Joueur ${String(p.id).substring(0, 4)}`;
}

/** Competition ranking ("1-2-2-4"): players with an equal score share the same
 * place, and the next distinct score skips the tied slots. Used everywhere a
 * rank is shown (player cards, sidebar, game-over) so ties are handled
 * consistently instead of an arbitrary array order.
 *
 * @returns a Map keyed by `String(player.id)` → rank (1-based).
 */
export function computeRanks(players: GamePlayer[]): Map<string, number> {
  return computeCompetitionRanks(
    players.map((player) => ({ id: String(player.id), score: player.score })),
  );
}

/** True once at least two active players have different scores. */
export function hasRankingSpread(players: GamePlayer[]): boolean {
  const roster = activeMatchPlayers(players);
  if (roster.length <= 1) return false;
  const first = roster[0].score;
  return roster.some((p) => p.score !== first);
}

/** Neutral pill while every player is still tied on score. */
export function rankNeutralAccent(): string {
  return 'bg-secondary text-muted-foreground';
}

/** Podium accent classes for a rank (design tokens only; shared across views). */
export function rankAccent(rank: number): string {
  if (rank === 1) return 'bg-warning text-white';
  if (rank === 2) return 'bg-silver text-white';
  if (rank === 3) return 'bg-bronze text-bronze-foreground';
  return 'bg-secondary text-muted-foreground';
}
