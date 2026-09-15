import { useAuthModal } from '@/features/auth/context/AuthModalContext';
import { SETTINGS_COPY } from '@/features/settings/copy/settingsCopy';

export function SettingsSignInHint({ message }: { message: string }) {
  const { setShowAuthModal } = useAuthModal();
  return (
    <p className="text-xs text-muted-foreground">
      {message}{' '}
      <button
        type="button"
        onClick={() => setShowAuthModal(true)}
        className="font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {SETTINGS_COPY.signInCta}
      </button>
    </p>
  );
}
