export const COOKIE_CONSENT_STORAGE_KEY = 'aniquizz-cookie-consent-v1';

export type CookieCategory = 'necessary' | 'analytics';

export interface CookieConsentState {
  /** ISO timestamp when the user saved their choice. */
  decidedAt: string;
  necessary: true;
  analytics: boolean;
}

export function readCookieConsent(): CookieConsentState | null {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentState;
    if (parsed.necessary !== true || typeof parsed.analytics !== 'boolean') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCookieConsent(analytics: boolean): CookieConsentState {
  const state: CookieConsentState = {
    decidedAt: new Date().toISOString(),
    necessary: true,
    analytics,
  };
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(state));
  return state;
}

export function hasCookieConsentDecision(): boolean {
  return readCookieConsent() !== null;
}
