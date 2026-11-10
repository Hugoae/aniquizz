import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { useCookieConsent } from '@/features/legal/CookieConsentContext';

type VaWindow = Window & {
  va?: (event: string, payload?: unknown) => void;
};

/**
 * Vercel Web Analytics for the Vite SPA. The dashboard snippet is the Next.js
 * import; this app uses `@vercel/analytics/react`. The script stays unloaded
 * until the visitor accepts optional analytics.
 */
export function VercelAnalytics() {
  const { consent } = useCookieConsent();
  const allowed = consent?.analytics === true;

  useEffect(() => {
    if (allowed) return;
    (window as VaWindow).va?.('beforeSend', () => null);
  }, [allowed]);

  if (!allowed) return null;
  return <Analytics />;
}
