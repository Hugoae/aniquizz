/** UI languages. French is the source; English falls back to French in the client. */
export const APP_LOCALES = ['fr', 'en'] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export function isAppLocale(value: unknown): value is AppLocale {
  return value === 'fr' || value === 'en';
}

/** An explicit choice. Anything else means "not chosen". */
export function explicitAppLocale(value: unknown): AppLocale | null {
  return isAppLocale(value) ? value : null;
}

/**
 * Browser languages, first match wins. An unsupported tag (for example `de`)
 * falls through. No match means French.
 */
export function localeFromNavigator(languages: readonly string[]): AppLocale {
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0];
    if (base === 'en') return 'en';
    if (base === 'fr') return 'fr';
  }
  return 'fr';
}

/**
 * Account choice, then a choice saved on this device, then the browser.
 * A missing choice does not count as French: French is only the last fallback.
 */
export function resolveAppLocale(input: {
  account?: unknown;
  device?: unknown;
  navigatorLanguages: readonly string[];
}): AppLocale {
  return (
    explicitAppLocale(input.account) ??
    explicitAppLocale(input.device) ??
    localeFromNavigator(input.navigatorLanguages)
  );
}
