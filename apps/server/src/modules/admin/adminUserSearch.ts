import { Prisma } from '@aniquizz/database';

/** Supabase/Postgres profile ids are UUID strings. */
export const PROFILE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isProfileIdQuery = (query: string): boolean => PROFILE_UUID_RE.test(query.trim());

/** Username / email contains, or exact id when the query is a UUID (ticket / log paste). */
export const buildUserSearchWhere = (query?: string): Prisma.ProfileWhereInput => {
  const q = query?.trim();
  if (!q) return {};
  if (isProfileIdQuery(q)) {
    return { id: { equals: q, mode: 'insensitive' } };
  }
  return {
    OR: [
      { username: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ],
  };
};
