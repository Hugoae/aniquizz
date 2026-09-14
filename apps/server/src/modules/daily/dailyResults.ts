import { prisma } from '@aniquizz/database';
import { isDailyVictory } from '@aniquizz/shared';
import { attemptInclude } from './dailyAttemptLifecycle';
import { computeAttemptTotals, type DailyRoundRow } from './dailyPayloads';
import { syncChallengeRanksNow } from './dailyRanks';

/**
 * Recalc totals/`won` for every terminal attempt of a challenge (voided round).
 * Lives outside `dailyService` so admin tools do not import the HTTP play module.
 */
export async function recomputeChallengeResults(challengeId: string): Promise<void> {
  const attempts = await prisma.dailyAttempt.findMany({
    where: { challengeId, state: { in: ['COMPLETED', 'FORFEITED', 'EXPIRED'] } },
    include: attemptInclude,
  });
  for (const attempt of attempts) {
    const totals = computeAttemptTotals(attempt.challenge.rounds as DailyRoundRow[], attempt.answers);
    const won = isDailyVictory(totals.correctCount, totals.activeRoundCount);
    const prevWon = attempt.won;
    await prisma.dailyAttempt.update({
      where: { id: attempt.id },
      data: {
        correctCount: totals.correctCount,
        activeRoundCount: totals.activeRoundCount,
        won,
        totalResponseMs: totals.totalResponseMs,
      },
    });
    if (prevWon !== won) {
      const stats = await prisma.dailyPlayerStats.findUnique({
        where: { profileId: attempt.profileId },
        select: { wins: true },
      });
      if (stats) {
        await prisma.dailyPlayerStats.update({
          where: { profileId: attempt.profileId },
          data: { wins: Math.max(0, stats.wins + (won ? 1 : -1)) },
        });
      }
    }
  }
  await syncChallengeRanksNow(challengeId);
}
