import { ListMusic } from 'lucide-react';
import type { ConfigPoolPreview } from './configPoolPreview';

const formatCount = (value: number | null, loading: boolean): string => {
  if (loading && value == null) return '…';
  if (value == null) return '—';
  return value.toLocaleString('fr-FR');
};

export function ConfigPoolCard({ preview }: { preview: ConfigPoolPreview }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 px-3 py-2.5">
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        <ListMusic className="h-3 w-3 text-primary" aria-hidden="true" />
        Disponible
      </p>
      <p className="text-lg font-bold tabular-nums leading-none text-foreground">
        {formatCount(preview.songs, preview.loading)}
        <span className="ml-1.5 text-xs font-medium text-muted-foreground">
          son{preview.songs === 1 ? '' : 's'}
        </span>
      </p>
      <p className="mt-1.5 text-sm font-semibold tabular-nums text-foreground">
        {formatCount(preview.animes, preview.loading)}
        <span className="ml-1.5 text-xs font-medium text-muted-foreground">
          anime{preview.animes === 1 ? '' : 's'}
        </span>
      </p>
      <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
        {preview.loading ? 'Analyse…' : 'Uniquement les cases cochées.'}
      </p>
    </div>
  );
}
