import { prisma } from '@aniquizz/database';

export async function setModeration(
  userId: string,
  patch: { bannedUntil?: Date | null; mutedUntil?: Date | null },
): Promise<void> {
  await prisma.profile.update({
    where: { id: userId },
    data: patch,
  });
}

export async function clearModeration(userId: string): Promise<void> {
  await setModeration(userId, { bannedUntil: null, mutedUntil: null });
}

export async function countPlayableSongs(): Promise<number> {
  return prisma.song.count({ where: { downloadStatus: 'COMPLETED' } });
}
