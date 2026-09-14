const AUTH_RETURN_TO_KEY = 'aniquizz:auth-return-to';
const MAX_AGE_MS = 15 * 60 * 1000;

type KvStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type StoredReturnTo = {
  path: string;
  at: number;
};

function defaultStore(): KvStore | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Same-origin relative paths only. Blocks protocol-relative URLs and the
 * public home / password-reset routes (those are not "return after login").
 */
export function isSafeAuthReturnTo(target: string): boolean {
  if (!target.startsWith('/') || target.startsWith('//')) return false;
  if (target.includes('\\') || /[\n\r]/.test(target)) return false;
  try {
    const url = new URL(target, 'https://aniquizz.invalid');
    if (url.origin !== 'https://aniquizz.invalid') return false;
    if (url.username || url.password) return false;
    const path = url.pathname;
    if (path === '/' || path === '/reset-password') return false;
    return (
      path === '/play' ||
      path.startsWith('/play/') ||
      path === '/game' ||
      path === '/admin' ||
      path === '/profile' ||
      path.startsWith('/profile/')
    );
  } catch {
    return false;
  }
}

export function authReturnToFromLocation(pathname: string, search = '', hash = ''): string {
  return `${pathname}${search}${hash}`;
}

export function rememberAuthReturnTo(target: string, store: KvStore | null = defaultStore()): void {
  if (!store || !isSafeAuthReturnTo(target)) return;
  const payload: StoredReturnTo = { path: target, at: Date.now() };
  store.setItem(AUTH_RETURN_TO_KEY, JSON.stringify(payload));
}

export function consumeAuthReturnTo(
  store: KvStore | null = defaultStore(),
  now = Date.now(),
): string | null {
  if (!store) return null;
  const raw = store.getItem(AUTH_RETURN_TO_KEY);
  store.removeItem(AUTH_RETURN_TO_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredReturnTo;
    if (typeof parsed.path !== 'string' || typeof parsed.at !== 'number') return null;
    if (now - parsed.at > MAX_AGE_MS) return null;
    if (!isSafeAuthReturnTo(parsed.path)) return null;
    return parsed.path;
  } catch {
    return isSafeAuthReturnTo(raw) ? raw : null;
  }
}
