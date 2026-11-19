import { Prisma, prisma } from '@aniquizz/database';
import {
  achievementXp,
  earnedAchievementIds,
  levelFromXp,
  type AchievementProgress,
} from '@aniquizz/shared';

export interface StoredAchievement {
  id: string;
  unlockedAt: string;
}

export interface AchievementSync {
  achievements: StoredAchievement[];
  newlyUnlocked: string[];
  xp: number;
  level: number;
}

/**
 * Grant every success the counters already meet and that this profile does not
 * own yet. A second caller loses the insert and does not pay the XP again.
 */
export async function syncProfileAchievements(
  profileId: string,
  progress: AchievementProgress,
  currentXp: number,
  currentLevel: number,
): Promise<AchievementSync> {
  const owned = await prisma.profileAchievement.findMany({
    where: { profileId },
    select: { achievementId: true, unlockedAt: true, xpAwarded: true },
  });
  const ownedIds = new Set(owned.map((row) => row.achievementId));
  const fresh = earnedAchievementIds(progress).filter((id) => !ownedIds.has(id));
  // Catalogue rewards can rise. Pay the difference once; a lost race pays nothing.
  const raises = owned.flatMap((row) => {
    const next = achievementXp(row.achievementId);
    const delta = next - row.xpAwarded;
    return delta > 0 ? [{ id: row.achievementId, next, delta }] : [];
  });

  let xp = currentXp;
  let level = currentLevel;
  const inserted: string[] = [];

  if (fresh.length > 0 || raises.length > 0) {
    const paid = await prisma.$transaction(async (tx) => {
      const wrote: string[] = [];
      for (const id of fresh) {
        try {
          await tx.profileAchievement.create({
            data: { profileId, achievementId: id, xpAwarded: achievementXp(id) },
          });
          wrote.push(id);
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
            throw error;
          }
        }
      }
      let gain = wrote.reduce((sum, id) => sum + achievementXp(id), 0);
      for (const raise of raises) {
        const updated = await tx.profileAchievement.updateMany({
          where: { profileId, achievementId: raise.id, xpAwarded: { lt: raise.next } },
          data: { xpAwarded: raise.next },
        });
        if (updated.count > 0) gain += raise.delta;
      }
      if (gain === 0) return { wrote, xp: currentXp, level: currentLevel };
      const updated = await tx.profile.update({
        where: { id: profileId },
        data: { xp: { increment: gain } },
        select: { xp: true },
      });
      const nextLevel = levelFromXp(updated.xp);
      await tx.profile.update({
        where: { id: profileId },
        data: { level: nextLevel },
      });
      return { wrote, xp: updated.xp, level: nextLevel };
    });
    inserted.push(...paid.wrote);
    xp = paid.xp;
    level = paid.level;
  }

  // A second tab can win the insert. Re-read so this response still shows the
  // rows and the XP that tab already wrote. The common path has nothing new.
  const rows =
    fresh.length === 0
      ? owned
      : await prisma.profileAchievement.findMany({
          where: { profileId },
          select: { achievementId: true, unlockedAt: true },
        });
  if ((fresh.length > 0 || raises.length > 0) && inserted.length === 0 && xp === currentXp) {
    const latest = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { xp: true, level: true },
    });
    if (latest) {
      xp = latest.xp;
      level = latest.level;
    }
  }

  return {
    achievements: rows.map((row) => ({
      id: row.achievementId,
      unlockedAt: row.unlockedAt.toISOString(),
    })),
    newlyUnlocked: inserted,
    xp,
    level,
  };
}
