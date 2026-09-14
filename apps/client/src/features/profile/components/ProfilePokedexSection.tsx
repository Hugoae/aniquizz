import { Disc, Medal, Music2 } from 'lucide-react';
import { collectionMedal, COLLECTION_MEDALS } from '@/features/profile/collectionMedal';
import { PROFILE_COPY } from '@/features/profile/copy/profileCopy';

export function ProfilePokedexSection({
  discoveredSongs,
  progressPercent,
  totalSongs,
}: {
  discoveredSongs: number;
  progressPercent: number;
  totalSongs: number;
}) {
  const currentMedal = collectionMedal(progressPercent);

  return (
    <section className="space-y-4 animate-fade-in" style={{ animationDelay: '160ms' }}>
      <div className="flex items-center gap-2">
        <Disc className="h-5 w-5 text-accent" />
        <h2 className="text-xl font-bold">{PROFILE_COPY.pokedexTitle}</h2>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-card relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-6 z-10 relative">
          <div>
            <div className="text-4xl font-black gradient-text">{discoveredSongs}</div>
            <div className="text-sm text-muted-foreground font-medium">
              {PROFILE_COPY.uniqueDiscovered}
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 bg-secondary rounded-md text-xs font-bold border border-border ${currentMedal?.textClass ?? 'text-muted-foreground'}`}
          >
            <Medal className="h-4 w-4" />
            {currentMedal ? currentMedal.label : PROFILE_COPY.unranked}
          </span>
        </div>

        <div className="space-y-2 z-10 relative">
          <div className="relative h-5">
            {COLLECTION_MEDALS.map((m) => {
              const reached = progressPercent >= m.min;
              return (
                <div
                  key={m.key}
                  className="absolute -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${m.min}%` }}
                  title={`${m.label} — ${m.min}%`}
                >
                  <Medal
                    className={`h-4 w-4 transition-colors ${reached ? m.textClass : 'text-muted-foreground/30'}`}
                    strokeWidth={reached ? 2.25 : 2}
                  />
                </div>
              );
            })}
          </div>

          <div className="h-4 bg-secondary rounded-full overflow-hidden border border-border/60 relative">
            <div
              className="h-full bg-gradient-stage transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
            {COLLECTION_MEDALS.filter((m) => m.min < 100).map((m) => (
              <div
                key={m.key}
                className="absolute top-0 bottom-0 w-0.5 bg-background/70"
                style={{ left: `${m.min}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs font-mono text-muted-foreground">
            <span>{progressPercent}%</span>
            <span>{PROFILE_COPY.availableTotal(totalSongs)}</span>
          </div>
        </div>
        <div className="absolute top-[-20%] right-[-5%] p-8 opacity-5 pointer-events-none">
          <Music2 className="h-64 w-64" />
        </div>
      </div>
    </section>
  );
}
