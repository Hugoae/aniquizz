import { Link } from 'react-router-dom';
import { Cookie, Scale, Shield, FileText } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCookieConsent } from '@/features/legal/CookieConsentContext';
import { useSettingsCopy } from '@/features/settings/copy/settingsCopy';

export function SettingsAccountExtras() {
  const { consent, savePreferences, openBanner } = useCookieConsent();
  const copy = useSettingsCopy();
  const analyticsOn = consent?.analytics ?? false;
  const legalLinks = [
    { to: '/legal/confidentialite', label: copy.legalPrivacy, icon: Shield },
    { to: '/legal/cgu', label: copy.legalTerms, icon: FileText },
    { to: '/legal/mentions', label: copy.legalNotice, icon: Scale },
  ];

  return (
    <>
      <section aria-labelledby="settings-legal-heading">
        <h3 id="settings-legal-heading" className="text-sm font-bold text-foreground">
          {copy.legalHeading}
        </h3>
        <ul className="mt-3 space-y-1">
          {legalLinks.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="h-4 w-4 shrink-0 text-primary/80" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="settings-cookies-heading"
        className="border-t border-border/60 pt-5"
      >
        <div className="flex items-center gap-2">
          <Cookie className="h-4 w-4 text-primary" aria-hidden />
          <h3 id="settings-cookies-heading" className="font-bold text-foreground text-sm">
            {copy.cookiesHeading}
          </h3>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{copy.cookiesBody}</p>

        <div className="mt-4 flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-secondary/20 px-3 py-3">
          <Label htmlFor="cookie-analytics" className="text-sm font-medium leading-snug">
            {copy.analyticsLabel}
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
              {copy.analyticsHint}
            </span>
          </Label>
          <Switch
            id="cookie-analytics"
            checked={analyticsOn}
            onCheckedChange={savePreferences}
            aria-describedby="cookie-analytics-desc"
          />
        </div>
        <p id="cookie-analytics-desc" className="sr-only">
          {copy.analyticsAria}
        </p>

        <button
          type="button"
          onClick={openBanner}
          className="mt-3 rounded-sm text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copy.reopenBanner}
        </button>
      </section>
    </>
  );
}
