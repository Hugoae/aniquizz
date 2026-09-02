import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@aniquizz/database';
import { hasIntegrationEnv } from '../test/env';
import { reportLeaderboardAggregateDrift } from '../modules/profile/leaderboardConsistency';

const TEST_PREFIX = 'lbcons-';

describe.skipIf(!hasIntegrationEnv)('leaderboard aggregate drift', () => {
  const createdIds: string[] = [];
  const matchIds: string[] = [];

  const createProfile = async (suffix: string, data: Record<string, unknown>) => {
    const id = randomUUID();
    const username = `${TEST_PREFIX}${suffix}`;
    await prisma.profile.create({
      data: {
        id,
        username,
        email: `${username}@aniquizz.test`,
        avatar: 'default_avatar.png',
        ...data,
      },
    });
    createdIds.push(id);
    return { id, username };
  };

  const cleanup = async () => {
    if (matchIds.length) {
      await prisma.match.deleteMany({ where: { id: { in: matchIds } } });
      matchIds.length = 0;
    }
    await prisma.profile.deleteMany({ where: { username: { startsWith: TEST_PREFIX } } });
    createdIds.length = 0;
  };

  beforeAll(async () => {
    await prisma.profile.deleteMany({ where: { username: { startsWith: TEST_PREFIX } } });
  });

  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  it('detects a denormalized gamesPlayed counter and ignores a matching row', async () => {
    const drifted = await createProfile('drift', {
      gamesPlayed: 99,
      gamesWon: 0,
      correctGuesses: 0,
    });
    const consistent = await createProfile('ok', {
      gamesPlayed: 1,
      gamesWon: 1,
      correctGuesses: 4,
    });

    const driftedMatch = await prisma.match.create({
      data: {
        totalRounds: 1,
        status: 'FINISHED',
        endedAt: new Date(),
        players: {
          create: { profileId: drifted.id, isWinner: false, correctCount: 0 },
        },
      },
    });
    const okMatch = await prisma.match.create({
      data: {
        totalRounds: 1,
        status: 'FINISHED',
        endedAt: new Date(),
        players: {
          create: { profileId: consistent.id, isWinner: true, correctCount: 4 },
        },
      },
    });
    matchIds.push(driftedMatch.id, okMatch.id);

    const report = await reportLeaderboardAggregateDrift();
    const driftedRows = report.drifted.filter((row) => row.profileId === drifted.id);
    expect(driftedRows.some((row) => row.field === 'gamesPlayed')).toBe(true);
    expect(report.drifted.some((row) => row.profileId === consistent.id)).toBe(false);
  });
});
