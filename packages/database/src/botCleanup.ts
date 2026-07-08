import { prisma } from './index';
import { BOT_ID_PREFIX } from './bots';

export interface BotCleanupResult {
  matchPlayers: number;
  roundAnswers: number;
  songHistory: number;
  friendships: number;
}

/** Remove all gameplay/social history tied to DEV bot profiles. */
export async function cleanupBotHistory(): Promise<BotCleanupResult> {
  const bots = await prisma.profile.findMany({
    where: { id: { startsWith: BOT_ID_PREFIX } },
    select: { id: true },
  });
  const botIds = bots.map((b) => b.id);

  if (botIds.length === 0) {
    return { matchPlayers: 0, roundAnswers: 0, songHistory: 0, friendships: 0 };
  }

  const botMatchPlayerIds = (
    await prisma.matchPlayer.findMany({
      where: { profileId: { in: botIds } },
      select: { id: true },
    })
  ).map((row) => row.id);

  let roundAnswers = { count: 0 };
  if (botMatchPlayerIds.length > 0) {
    roundAnswers = await prisma.roundAnswer.deleteMany({
      where: { matchPlayerId: { in: botMatchPlayerIds } },
    });
  }

  const [matchPlayers, songHistory, friendships] = await prisma.$transaction([
    prisma.matchPlayer.deleteMany({ where: { profileId: { in: botIds } } }),
    prisma.songHistory.deleteMany({ where: { profileId: { in: botIds } } }),
    prisma.friendship.deleteMany({
      where: {
        OR: [{ requesterId: { in: botIds } }, { addresseeId: { in: botIds } }],
      },
    }),
  ]);

  return {
    matchPlayers: matchPlayers.count,
    roundAnswers: roundAnswers.count,
    songHistory: songHistory.count,
    friendships: friendships.count,
  };
}
