import type { PlaylistPoolStats, RoomConfig, ThematicPlaylistSummary } from '@aniquizz/shared';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { OptionButton, FOCUS_RING } from './ConfigPrimitives';
import { PLAYLISTS_COPY, playlistFlair } from './playlistsCopy';
import {
  showWatchedFusionMode,
  WATCHED_ANILIST_BLOCKED_MESSAGE,
  WATCHED_ANILIST_STALE_MESSAGE,
} from './watchedSource';
import {
  decadeStartYear,
  defaultDecadePack,
  effectivePlaylistSelection,
  pickerRows,
} from './playlistPickerModel';

interface PlaylistPickerProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
  playlists: ThematicPlaylistSummary[];
  loading: boolean;
  loadError: boolean;
  loadErrorOffline?: boolean;
  onRetry?: () => void;
  stats: PlaylistPoolStats | null;
  isRoom: boolean;
  watchedListLinked: boolean;
  /** Humans currently in the salon — fusion modes need 2+ lists. */
  currentPlayersCount?: number;
}

const packCardClass = (active: boolean) =>
  cn(
    'flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
    FOCUS_RING,
    active
      ? 'border-primary/50 bg-primary/10 shadow-[inset_3px_0_0_0_hsl(var(--primary))]'
      : 'border-border/50 bg-secondary/20 hover:border-primary/30 hover:bg-secondary/40',
  );

export function PlaylistPicker({
  config,
  update,
  playlists,
  loading,
  loadError,
  loadErrorOffline = false,
  onRetry,
  stats,
  isRoom,
  watchedListLinked,
  currentPlayersCount = 0,
}: PlaylistPickerProps) {
  const overlayOn = Boolean(config.playlistWatched);
  const showFusion = overlayOn && showWatchedFusionMode(isRoom, currentPlayersCount);
  const overlayEnabled = overlayOn && (isRoom || watchedListLinked);
  const showFallback =
    overlayEnabled &&
    Boolean(stats?.insufficient) &&
    (stats?.playableSongs ?? 0) > 0 &&
    !stats?.packInsufficient;
  const rows = pickerRows(playlists);
  const selection = effectivePlaylistSelection(config, playlists);

  const selectDecade = (id: string | undefined) =>
    update({
      soundSelection: 'playlist',
      playlistId: selection.playlistId,
      decadePlaylistId: id ?? null,
    });

  const selectGenre = (id: string) =>
    update({
      soundSelection: 'playlist',
      playlistId: selection.playlistId === id ? null : id,
      decadePlaylistId: selection.decadePlaylistId,
    });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-1">
        {loadError && (
          <div className="space-y-2 p-1">
            <p className="text-xs text-destructive">
              {loadErrorOffline ? PLAYLISTS_COPY.loadErrorOffline : PLAYLISTS_COPY.loadError}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className={cn(
                  'text-xs font-semibold text-primary underline-offset-2 hover:underline',
                  FOCUS_RING,
                )}
              >
                {PLAYLISTS_COPY.retry}
              </button>
            )}
          </div>
        )}
        {loading && <p className="p-1 text-xs text-muted-foreground">Chargement des packs…</p>}
        {!loading && !playlists.length && !loadError && (
          <p className="p-1 text-xs text-muted-foreground">{PLAYLISTS_COPY.empty}</p>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rows.map((row) => {
            if (row.kind === 'decade') {
              const selected = row.packs.find((pack) => pack.id === selection.decadePlaylistId);
              const active = Boolean(selected);
              const sliderIndex = Math.max(
                0,
                row.packs.findIndex((pack) => pack.id === selection.decadePlaylistId),
              );
              return (
                <div
                  key="decade"
                  className={cn(
                    'col-span-full rounded-xl border transition-colors',
                    active
                      ? 'border-primary/50 bg-primary/10 shadow-[inset_3px_0_0_0_hsl(var(--primary))]'
                      : 'border-border/50 bg-secondary/20 hover:border-primary/30 hover:bg-secondary/40',
                  )}
                >
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      if (active) {
                        selectDecade(undefined);
                        return;
                      }
                      const next = defaultDecadePack(row.packs);
                      if (next) selectDecade(next.id);
                    }}
                    className={cn(
                      'flex w-full items-start gap-3 px-3 py-2.5 text-left',
                      FOCUS_RING,
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg',
                        active ? 'bg-primary/20' : 'bg-background/60',
                      )}
                    >
                      📻
                    </span>
                    <span className="min-w-0 pt-0.5">
                      <span className="block text-sm font-bold leading-tight text-foreground">
                        {PLAYLISTS_COPY.decadeCard}
                      </span>
                      <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                        {PLAYLISTS_COPY.decadeBlurb}
                      </span>
                    </span>
                  </button>
                  {active && row.packs.length > 1 && (
                    <div className="px-3 pb-3 pt-1">
                      <Slider
                        min={0}
                        max={Math.max(0, row.packs.length - 1)}
                        step={1}
                        value={[sliderIndex]}
                        onValueChange={(values) => {
                          const pack = row.packs[values[0] ?? 0];
                          if (pack) selectDecade(pack.id);
                        }}
                        aria-label={PLAYLISTS_COPY.decadeCard}
                      />
                      <div className="mt-1.5 flex justify-between text-[10px] font-medium text-muted-foreground">
                        {row.packs.map((pack) => (
                          <span
                            key={pack.id}
                            className={cn(pack.id === selected?.id && 'text-foreground')}
                          >
                            {decadeStartYear(pack.slug) ?? pack.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            const pack = row.pack;
            const active = selection.playlistId === pack.id;
            const { emoji, blurb } = playlistFlair(pack.slug, pack.description);
            return (
              <button
                key={pack.id}
                type="button"
                aria-pressed={active}
                onClick={() => selectGenre(pack.id)}
                className={packCardClass(active)}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg',
                    active ? 'bg-primary/20' : 'bg-background/60',
                  )}
                >
                  {emoji}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className="block text-sm font-bold leading-tight text-foreground">
                    {pack.name}
                  </span>
                  <span className="mt-1 block text-[11px] leading-snug text-muted-foreground">
                    {blurb}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {(selection.playlistId || selection.decadePlaylistId) && (
        <div className="shrink-0 space-y-2 border-t border-border/50 bg-card/80 px-1 pt-2">
          <label className="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/20 px-2.5 py-2">
            <Checkbox
              checked={overlayOn}
              onCheckedChange={(checked) =>
                update({
                  playlistWatched: Boolean(checked),
                  watchedAllowFallback: checked ? config.watchedAllowFallback : false,
                })
              }
              className="mt-0.5"
            />
            <span>
              <span className="text-xs font-bold">{PLAYLISTS_COPY.overlayLabel}</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {PLAYLISTS_COPY.overlayHint}
              </span>
              {overlayOn && stats?.listError === 'anilist_blocked' && (
                <span className="mt-1 block text-[11px] text-warning">
                  {stats.playableSongs === 0
                    ? WATCHED_ANILIST_BLOCKED_MESSAGE
                    : WATCHED_ANILIST_STALE_MESSAGE}
                </span>
              )}
            </span>
          </label>

          {showFallback && (
            <OptionButton
              active={Boolean(config.watchedAllowFallback)}
              onClick={() => update({ watchedAllowFallback: !config.watchedAllowFallback })}
              className="w-full p-2 text-left"
            >
              <div className="text-xs font-bold">{PLAYLISTS_COPY.fallbackLabel}</div>
              <div className="text-[9px] text-muted-foreground">{PLAYLISTS_COPY.fallbackHint}</div>
            </OptionButton>
          )}

          {showFusion && (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase">Mode de fusion</Label>
              <div className="grid grid-cols-2 gap-2">
                <OptionButton
                  active={config.watchedMode === 'union'}
                  onClick={() => update({ watchedMode: 'union' })}
                  className="p-2 text-left"
                >
                  <div className="text-xs font-bold">Union</div>
                  <div className="text-[9px] text-muted-foreground">
                    Les listes de tout le monde.
                  </div>
                </OptionButton>
                <OptionButton
                  active={config.watchedMode === 'intersection'}
                  onClick={() => update({ watchedMode: 'intersection' })}
                  className="p-2 text-left"
                >
                  <div className="text-xs font-bold">Commun</div>
                  <div className="text-[9px] text-muted-foreground">Vus par TOUS les joueurs.</div>
                </OptionButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
