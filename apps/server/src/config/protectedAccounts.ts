import { prisma } from '@aniquizz/database';

const PROTECTED_USERNAMES = new Set(['kirikou']);
const PROTECTED_EMAILS = new Set(['hugo.aen2@gmail.com']);

const normalizeUsername = (value: string): string => value.trim().toLowerCase();
const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export const isProtectedProfile = (profile: {
  username: string;
  email: string;
}): boolean =>
  PROTECTED_USERNAMES.has(normalizeUsername(profile.username)) ||
  PROTECTED_EMAILS.has(normalizeEmail(profile.email));

export const isProtectedUserId = async (userId: string): Promise<boolean> => {
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { username: true, email: true },
  });
  if (!profile) return false;
  return isProtectedProfile(profile);
};

/** Block moderation targets that are owner-protected (optional self-service exception). */
export const assertModerationAllowed = async (
  targetUserId: string,
  actorUserId: string,
  options?: { allowSelf?: boolean },
): Promise<{ ok: true } | { ok: false; message: string }> => {
  if (options?.allowSelf && targetUserId === actorUserId) {
    return { ok: true };
  }
  if (await isProtectedUserId(targetUserId)) {
    return { ok: false, message: 'Ce compte est protégé contre les actions de modération.' };
  }
  return { ok: true };
};
