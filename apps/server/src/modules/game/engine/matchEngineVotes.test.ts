import { describe, expect, it } from 'vitest';
import { countActiveVotes, playerCanVote, requiredVoteCount } from './matchEngineVotes';
import type { RoomPlayer } from './types';

function player(partial: Partial<RoomPlayer> & Pick<RoomPlayer, 'userId'>): RoomPlayer {
  return {
    username: 'p',
    avatar: 'player1',
    socketId: null,
    isConnected: true,
    isReady: true,
    anilistUsername: null,
    malUsername: null,
    activeListProvider: null,
    score: 0,
    streak: 0,
    maxStreak: 0,
    matchCorrectCount: 0,
    matchTotalCount: 0,
    correctSongIds: new Set(),
    hasAnswered: false,
    currentAnswer: null,
    isCorrect: null,
    roundPoints: 0,
    answerType: null,
    answerTimeMs: null,
    speedRank: null,
    speedBonus: 0,
    ...partial,
  };
}

describe('matchEngineVotes', () => {
  it('requires a majority of human voters (at least one)', () => {
    expect(requiredVoteCount(0)).toBe(1);
    expect(requiredVoteCount(1)).toBe(1);
    expect(requiredVoteCount(2)).toBe(1);
    expect(requiredVoteCount(3)).toBe(2);
    expect(requiredVoteCount(4)).toBe(2);
  });

  it('ignores bots and disconnected players in the active tally', () => {
    const players = new Map<string, RoomPlayer>([
      ['a', player({ userId: 'a' })],
      ['bot', player({ userId: 'bot', isBot: true })],
      ['gone', player({ userId: 'gone', isConnected: false })],
    ]);
    expect(playerCanVote(players.get('bot'))).toBe(false);
    expect(playerCanVote(players.get('gone'))).toBe(false);
    expect(countActiveVotes(new Set(['a', 'bot', 'gone', 'missing']), players)).toBe(1);
  });
});
