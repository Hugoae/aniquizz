import { describe, expect, it } from 'vitest';
import { localeFromNavigator, resolveAppLocale } from './locale';

describe('resolveAppLocale', () => {
  it('follows the browser until someone chooses', () => {
    expect(localeFromNavigator(['en-US', 'fr-FR'])).toBe('en');
    expect(localeFromNavigator(['fr-CA'])).toBe('fr');
    expect(localeFromNavigator(['de-DE'])).toBe('fr');
    expect(
      resolveAppLocale({
        account: null,
        device: null,
        navigatorLanguages: ['en-GB'],
      }),
    ).toBe('en');
  });

  it('lets a device choice beat the browser, and the account beat the device', () => {
    expect(
      resolveAppLocale({
        account: null,
        device: 'fr',
        navigatorLanguages: ['en-US'],
      }),
    ).toBe('fr');
    expect(
      resolveAppLocale({
        account: 'en',
        device: 'fr',
        navigatorLanguages: ['fr-FR'],
      }),
    ).toBe('en');
  });

  it('ignores a stored value that is not a supported language', () => {
    expect(
      resolveAppLocale({
        account: 'de',
        device: '',
        navigatorLanguages: ['en'],
      }),
    ).toBe('en');
  });
});
