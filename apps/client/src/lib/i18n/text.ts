import i18n from '@/lib/i18n';

/** Read a catalogue string in the language that is active right now. */
export function tx(ns: string, key: string, options?: Record<string, unknown>): string {
  return String(i18n.t(key, { ns, ...options }));
}

/** French stays the source string. English is used only while that language is active. */
export function pick(fr: string, en: string): string {
  return i18n.language.startsWith('en') ? en : fr;
}

/** String fields that follow the active language. Enumerable, so existing walks still see them. */
export function liveStrings<K extends string>(
  ns: string,
  prefix: string,
  keys: readonly K[],
): Record<K, string> {
  const out = {} as Record<K, string>;
  for (const key of keys) {
    Object.defineProperty(out, key, {
      enumerable: true,
      get() {
        return tx(ns, prefix ? `${prefix}.${key}` : key);
      },
    });
  }
  return out;
}

/**
 * Add fields onto a live-string object without reading its getters.
 * Object spread and Object.assign both snapshot getter values.
 */
export function extendLive<T extends object, E extends object>(base: T, extras: E): T & E {
  const out = base as T & E;
  for (const key of Object.keys(extras) as (keyof E)[]) {
    const desc = Object.getOwnPropertyDescriptor(extras, key);
    if (desc) Object.defineProperty(out, key, desc);
  }
  return out;
}
