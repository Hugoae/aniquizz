import { describe, expect, it } from 'vitest';
import {
  authReturnToFromLocation,
  consumeAuthReturnTo,
  isSafeAuthReturnTo,
  rememberAuthReturnTo,
} from './authReturnTo';

function memoryStore(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe('authReturnTo', () => {
  it('allows profile, play, game, and admin deep links', () => {
    expect(isSafeAuthReturnTo('/profile')).toBe(true);
    expect(isSafeAuthReturnTo('/profile/00000000-0000-4000-8000-000000000001')).toBe(true);
    expect(isSafeAuthReturnTo('/play')).toBe(true);
    expect(isSafeAuthReturnTo('/game?roomId=abc')).toBe(true);
    expect(isSafeAuthReturnTo('/admin')).toBe(true);
  });

  it('rejects open redirects and public home', () => {
    expect(isSafeAuthReturnTo('/')).toBe(false);
    expect(isSafeAuthReturnTo('//evil.example')).toBe(false);
    expect(isSafeAuthReturnTo('https://evil.example/profile')).toBe(false);
    expect(isSafeAuthReturnTo('/reset-password')).toBe(false);
    expect(isSafeAuthReturnTo('/library')).toBe(false);
  });

  it('remembers then consumes a profile deep link once', () => {
    const store = memoryStore();
    rememberAuthReturnTo(authReturnToFromLocation('/profile/abc', '?from=xp', '#amis'), store);
    expect(consumeAuthReturnTo(store)).toBe('/profile/abc?from=xp#amis');
    expect(consumeAuthReturnTo(store)).toBeNull();
  });

  it('drops an expired return path', () => {
    const store = memoryStore();
    rememberAuthReturnTo('/profile', store);
    expect(consumeAuthReturnTo(store, Date.now() + 16 * 60 * 1000)).toBeNull();
  });
});
