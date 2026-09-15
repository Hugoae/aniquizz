import { lazy, Suspense } from 'react';
import { SettingsAudioSection } from '@/features/settings/components/SettingsAudioSection';
import { SettingsMotionSection } from '@/features/settings/components/SettingsMotionSection';
import { SettingsGameplaySection } from '@/features/settings/components/SettingsGameplaySection';
import { useAuth } from '@/features/auth/context/AuthContext';
import { SETTINGS_COPY } from '@/features/settings/copy/settingsCopy';
import { SettingsSignInHint } from '@/features/settings/components/SettingsSignInHint';

const SettingsPrivacySection = lazy(() =>
  import('@/features/settings/components/SettingsPrivacySection').then((m) => ({
    default: m.SettingsPrivacySection,
  })),
);
const SettingsNotificationsSection = lazy(() =>
  import('@/features/settings/components/SettingsNotificationsSection').then((m) => ({
    default: m.SettingsNotificationsSection,
  })),
);
const SettingsBlockedSection = lazy(() =>
  import('@/features/settings/components/SettingsBlockedSection').then((m) => ({
    default: m.SettingsBlockedSection,
  })),
);
const SettingsAccountExtras = lazy(() =>
  import('@/features/settings/components/SettingsAccountExtras').then((m) => ({
    default: m.SettingsAccountExtras,
  })),
);
const SettingsIntegrationsSection = lazy(() =>
  import('@/features/settings/integrations/SettingsIntegrationsSection').then((m) => ({
    default: m.SettingsIntegrationsSection,
  })),
);

export function SettingsGeneralPanel() {
  return (
    <div className="space-y-6">
      <SettingsAudioSection />
      <SettingsMotionSection />
      <SettingsGameplaySection />
    </div>
  );
}

export function SettingsSocialPanel() {
  const { session, authReady } = useAuth();
  const signedIn = Boolean(authReady && session);

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <SettingsNotificationsSection />
        {signedIn ? (
          <>
            <SettingsPrivacySection />
            <SettingsBlockedSection />
          </>
        ) : (
          <SettingsSignInHint message={SETTINGS_COPY.signInForAccount} />
        )}
      </Suspense>
    </div>
  );
}

export function SettingsAccountPanel() {
  const { session, authReady } = useAuth();
  const signedIn = Boolean(authReady && session);
  return (
    <div className="space-y-6">
      {signedIn ? (
        <Suspense fallback={null}>
          <SettingsIntegrationsSection />
        </Suspense>
      ) : (
        <SettingsSignInHint message={SETTINGS_COPY.signInForAccount} />
      )}
      <Suspense fallback={null}>
        <SettingsAccountExtras />
      </Suspense>
    </div>
  );
}
