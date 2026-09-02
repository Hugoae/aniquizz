/**
 * Avatars are stored at `{userId}/avatar.jpg` in the Supabase `avatars` bucket.
 * Only that public object URL (optional cache-buster query) is trusted on write
 * and when rendering remote images.
 */

const AVATAR_OBJECT = 'avatar.jpg';
const PUBLIC_PREFIX = '/storage/v1/object/public/avatars/';

const parseHttpUrl = (value: string): URL | null => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    if (url.hash) return null;
    return url;
  } catch {
    return null;
  }
};

const avatarObjectPath = (userId: string): string =>
  `${PUBLIC_PREFIX}${encodeURIComponent(userId)}/${AVATAR_OBJECT}`;

/**
 * True when `avatarUrl` is a public object in this project's `avatars` bucket.
 * Pass `ownerUserId` to require that object to belong to that user.
 */
export const isTrustedSupabaseAvatarUrl = (
  avatarUrl: string,
  supabaseUrl: string,
  ownerUserId?: string,
): boolean => {
  const candidate = parseHttpUrl(avatarUrl);
  const origin = parseHttpUrl(supabaseUrl);
  if (!candidate || !origin) return false;
  if (candidate.protocol !== origin.protocol) return false;
  if (candidate.host !== origin.host) return false;

  if (ownerUserId) {
    return candidate.pathname === avatarObjectPath(ownerUserId);
  }

  if (!candidate.pathname.startsWith(PUBLIC_PREFIX) || !candidate.pathname.endsWith(`/${AVATAR_OBJECT}`)) {
    return false;
  }
  const owner = candidate.pathname.slice(PUBLIC_PREFIX.length, -(AVATAR_OBJECT.length + 1));
  return owner.length > 0 && !owner.includes('/') && owner !== '.' && owner !== '..';
};
