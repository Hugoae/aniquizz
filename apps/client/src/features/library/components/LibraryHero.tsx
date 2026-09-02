import { Music2 } from 'lucide-react';
import type { LibraryMetaResponse } from '@aniquizz/shared';
import { LIBRARY_COPY } from '@/features/library/copy/libraryCopy';

interface LibraryHeroProps {
  meta: LibraryMetaResponse | null;
}

export function LibraryHero({ meta }: LibraryHeroProps) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-6 md:p-10">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-aqua/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/50 px-3 py-1 text-xs font-semibold text-muted-foreground">
            <span className="eq h-3 text-aqua" aria-hidden="true">
              <i /><i /><i /><i />
            </span>
            {LIBRARY_COPY.heroEyebrow}
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl gradient-text">
            {LIBRARY_COPY.heroTitle}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground text-pretty">{LIBRARY_COPY.heroSubtitle}</p>
        </div>

        {meta && (
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <StatPill value={meta.totalSongs} label={LIBRARY_COPY.statSongs} accent="text-primary" />
            <StatPill value={meta.totalAnimes} label={LIBRARY_COPY.statAnimes} accent="text-aqua" />
            <StatPill value={meta.totalFranchises} label={LIBRARY_COPY.statFranchises} accent="text-accent" />
            {meta.likedCount != null && (
              <div className="col-span-3">
                <p className="text-center text-xs font-semibold text-muted-foreground">
                  {LIBRARY_COPY.statLiked(meta.likedCount)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <Music2
        className="pointer-events-none absolute bottom-4 right-4 h-24 w-24 text-primary/5 md:h-32 md:w-32"
        aria-hidden="true"
      />
    </section>
  );
}

function StatPill({ value, label, accent }: { value: number; label: string; accent: string }) {
  return (
    <div className="glass-card rounded-xl px-3 py-2.5 text-center min-w-[5.5rem]">
      <div className={`text-xl font-black tabular-nums ${accent}`}>{value.toLocaleString('fr-FR')}</div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
