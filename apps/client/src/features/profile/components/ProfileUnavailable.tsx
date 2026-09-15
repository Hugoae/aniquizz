import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SeoHead } from '@/components/seo/SeoHead';
import { PROFILE_COPY } from '@/features/profile/copy/profileCopy';
import { ProfilePageShell } from '@/features/profile/components/ProfilePageShell';

export function ProfilePublicUnavailable({
  backLabel,
  onBack,
}: {
  backLabel: string;
  onBack: () => void;
}) {
  return (
    <>
      <SeoHead title={PROFILE_COPY.seoUnavailable} noindex />
      <ProfilePageShell mainClassName="space-y-8">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 mb-2 text-muted-foreground hover:text-foreground pl-0"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Button>
        <div className="glass-card rounded-xl border border-border bg-card/40 p-10 text-center">
          <h1 className="text-2xl font-black">{PROFILE_COPY.unavailableTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{PROFILE_COPY.unavailableBody}</p>
        </div>
      </ProfilePageShell>
    </>
  );
}

export function ProfileOwnLoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <>
      <SeoHead title={PROFILE_COPY.seoUnavailable} noindex />
      <ProfilePageShell>
        <div className="glass-card rounded-xl border border-border bg-card/40 p-10 text-center">
          <h1 className="text-2xl font-black">{PROFILE_COPY.loadFailedTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{PROFILE_COPY.sessionStillActive}</p>
          <Button className="mt-6" onClick={onRetry}>
            {PROFILE_COPY.retry}
          </Button>
        </div>
      </ProfilePageShell>
    </>
  );
}
