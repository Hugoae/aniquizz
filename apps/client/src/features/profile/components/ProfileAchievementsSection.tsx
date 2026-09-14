import { Award } from 'lucide-react';
import { PROFILE_COPY } from '@/features/profile/copy/profileCopy';

export function ProfileAchievementsSection() {
  return (
    <section className="space-y-4 animate-fade-in" style={{ animationDelay: '240ms' }}>
      <div className="flex items-center gap-2">
        <Award className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">{PROFILE_COPY.achievementsTitle}</h2>
      </div>
      <div className="rounded-xl border border-dashed border-border/70 bg-card/30 p-8 text-center">
        <Award className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-semibold text-foreground">
          {PROFILE_COPY.achievementsSoonTitle}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{PROFILE_COPY.achievementsSoonBody}</p>
      </div>
    </section>
  );
}
