import type { RoomPlayer } from './types';

/** Human, connected players — bots never vote to pause/skip. */
export function isHumanVoter(player: RoomPlayer): boolean {
  return player.isConnected && !player.isBot;
}

export function requiredVoteCount(humanCount: number): number {
  return Math.max(1, Math.ceil(humanCount / 2));
}

export function playerCanVote(player: RoomPlayer | undefined): boolean {
  return Boolean(player && isHumanVoter(player));
}

export function countActiveVotes(votes: Set<string>, players: Map<string, RoomPlayer>): number {
  let count = 0;
  for (const id of votes) {
    if (playerCanVote(players.get(id))) count += 1;
  }
  return count;
}
