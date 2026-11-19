import { explicitAppLocale, type AppLocale } from '@aniquizz/shared';

const DEVICE_LOCALE_KEY = 'aniquizz.locale';

/** A language the player chose on this device. Missing means "follow the browser". */
export function readDeviceLocale(): AppLocale | null {
  try {
    return explicitAppLocale(localStorage.getItem(DEVICE_LOCALE_KEY));
  } catch {
    return null;
  }
}

export function writeDeviceLocale(locale: AppLocale): void {
  try {
    localStorage.setItem(DEVICE_LOCALE_KEY, locale);
  } catch {
    // Private mode can reject storage. The in-memory choice still applies.
  }
}
