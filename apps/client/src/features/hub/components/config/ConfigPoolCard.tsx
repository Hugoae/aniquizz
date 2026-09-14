import { ListMusic } from 'lucide-react';
import { formatPoolMetric, poolUnitLabel, type ConfigPoolPreview } from './configPoolPreview';

export function ConfigPoolCard({ preview }: { preview: ConfigPoolPreview }) {
  const songs = formatPoolMetric(preview.songs, preview.loading);
  const animes = formatPoolMetric(preview.animes, preview.loading);

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 px-3 py-2.5">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <ListMusic className="h-3 w-3 text-primary" aria-hidden="true" />
        Disponible
      </p>
      <p className="text-lg font-bold tabular-nums leading-none text-foreground">
        {songs.count}
        {songs.unitVisible && (
          <span className="ml-1.5 text-xs font-medium text-muted-foreground">
            {poolUnitLabel(preview.songs, 'son', 'sons')}
          </span>
        )}
      </p>
      <p className="mt-1.5 text-sm font-semibold tabular-nums text-foreground">
        {animes.count}
        {animes.unitVisible && (
          <span className="ml-1.5 text-xs font-medium text-muted-foreground">
            {poolUnitLabel(preview.animes, 'anime', 'animes')}
          </span>
        )}
      </p>
      <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
        {preview.loading ? 'Analyse…' : 'Uniquement les cases cochées.'}
      </p>
    </div>
  );
}
