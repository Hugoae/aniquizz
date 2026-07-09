import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCookieConsent } from '@/features/legal/CookieConsentContext';

/** First-visit RGPD banner — no non-essential scripts before consent. */
export function CookieConsentBanner() {
  const { bannerOpen, acceptAll, rejectOptional, closeBanner } = useCookieConsent();

  if (!bannerOpen) return null;

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-banner-title"
      aria-describedby="cookie-banner-desc"
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-xl rounded-2xl border border-border/70 bg-popover/95 p-4 shadow-elevated backdrop-blur-xl sm:inset-x-auto sm:right-6 sm:bottom-6"
    >
      <h2 id="cookie-banner-title" className="text-sm font-bold text-foreground">
        Cookies et confidentialité
      </h2>
      <p id="cookie-banner-desc" className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Nous utilisons des cookies strictement nécessaires à la connexion et au jeu. Les cookies
        d&apos;analyse (s&apos;ils sont activés plus tard) ne seront chargés qu&apos;avec votre accord.{' '}
        <Link to="/legal/confidentialite" className="text-primary underline-offset-2 hover:underline">
          Politique de confidentialité
        </Link>
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={acceptAll}>
          Tout accepter
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={rejectOptional}>
          Refuser l&apos;optionnel
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={closeBanner} className="text-muted-foreground">
          Fermer
        </Button>
      </div>
    </div>
  );
}
