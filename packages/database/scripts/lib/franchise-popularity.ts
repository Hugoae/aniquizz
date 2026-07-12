import type { PrismaClient } from '@prisma/client';

/** Recompute denormalized maxPopularity for one franchise (or all when id omitted). */
export async function recomputeFranchiseMaxPopularity(
  prisma: PrismaClient,
  franchiseId?: number,
): Promise<void> {
  if (franchiseId !== undefined) {
    const agg = await prisma.anime.aggregate({
      where: { franchiseId },
      _max: { popularity: true },
    });
    await prisma.franchise.update({
      where: { id: franchiseId },
      data: { maxPopularity: agg._max.popularity ?? 0 },
    });
    return;
  }

  await prisma.$executeRaw`
    UPDATE "Franchise" f
    SET "maxPopularity" = COALESCE(
      (SELECT MAX(a."popularity") FROM "Anime" a WHERE a."franchiseId" = f.id),
      0
    )
  `;
}
