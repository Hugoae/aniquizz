import { prisma } from '@aniquizz/database';

const PROTECTED_USERNAMES = new Set(['kirikou']);

const normalizeUsername = (value: string): string => value.trim().toLowerCase();
const normalizeEmail = (value: string): string => value.trim().toLowerCase();

/** Parse `PROTECTED_ACCOUNT_EMAILS` CSV (owner mailboxes live in env, not git). */
export const parseProtectedEmails = (csv: string | undefined): Set<string> => {
  if (!csv) return new Set();
  return new Set(
    csv
      .split(',')
      .map((part) => normalizeEmail(part))
      .filter(Boolean),
  );
};

const emailsFromEnv = (): Set<string> => parseProtectedEmails(process.env.PROTECTED_ACCOUNT_EMAILS);

export const isProtectedProfile = (
  profile: { username: string; email: string },
  emails: Set<string> = emailsFromEnv(),
): boolean =>
  PROTECTED_USERNAMES.has(normalizeUsername(profile.username)) ||
  emails.has(normalizeEmail(profile.email));

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
