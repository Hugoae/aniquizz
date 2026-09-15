import { useEffect, useRef, useState } from 'react';
import { Eye, Link2, Shuffle, Music2, AlertTriangle } from 'lucide-react';
import {
  WATCHED_LIST_STATUS_LABELS,
  type PlaylistPoolStats,
  type RoomConfig,
  type WatchedPoolStats,
} from '@aniquizz/shared';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { SectionHeader, OptionButton, FOCUS_RING } from './ConfigPrimitives';
import { usePublishedPlaylists } from '@/features/hub/hooks/usePublishedPlaylists';
import {
  watchedPoolModeLabel,
  showWatchedFusionMode,
  WATCHED_LIST_STATUSES_ET,
  WATCHED_LIST_UNAVAILABLE,
  WATCHED_ANILIST_BLOCKED_MESSAGE,
  WATCHED_ANILIST_STALE_MESSAGE,
  WATCHED_SERVER_OFFLINE,
} from './watchedSource';
import { PlaylistPicker } from './PlaylistPicker';
import { PLAYLISTS_COPY } from './playlistsCopy';
import { openSettings } from '@/features/settings/lib/openSettings';
import { SETTINGS_COPY } from '@/features/settings/copy/settingsCopy';

type Source = RoomConfig['soundSelection'];
type SourceTab = 'random' | 'watched' | 'playlist';

interface SourceSectionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
  isRoom: boolean;
  watchedListLinked?: boolean;
  /** Live Watched pool from the parent form (single socket fetch). */
  watchedPoolStats?: WatchedPoolStats | null;
  watchedPoolLoading?: boolean;
  watchedPoolOffline?: boolean;
  /** Live playlist pool from the parent form (single socket fetch). */
  playlistPoolStats?: PlaylistPoolStats | null;
  /** Humans currently in the salon — fusion modes need 2+ lists. */
  currentPlayersCount?: number;
}

export function SourceSection({
  config,
  update,
  isRoom,
  watchedListLinked = false,
  watchedPoolStats = null,
  watchedPoolLoading = false,
  watchedPoolOffline = false,
  playlistPoolStats = null,
  currentPlayersCount = 0,
}: SourceSectionProps) {
  const source = config.soundSelection;
  const [tab, setTab] = useState<SourceTab>(
    source === 'playlist' ? 'playlist' : source === 'watched' ? 'watched' : 'random',
  );

  useEffect(() => {
    if (source === 'playlist') setTab('playlist');
    else if (source === 'watched') setTab('watched');
    else setTab('random');
  }, [source]);

  const setSource = (next: Source) => {
    const patch: Partial<RoomConfig> = { soundSelection: next };
    if (next !== 'watched' && !(next === 'playlist' && config.playlistWatched)) {
      patch.watchedAllowFallback = false;
    }
    if (next !== 'playlist') {
      patch.playlistId = undefined;
      patch.decadePlaylistId = undefined;
      patch.playlistWatched = false;
    }
    update(patch);
    setTab(next === 'mix' ? 'random' : next);
  };

  const watchedEnabled = source === 'watched' && (isRoom || watchedListLinked);
  const stats = watchedPoolStats;
  const loading = watchedPoolLoading;

  const playlistTab = tab === 'playlist';
  const {
    playlists,
    loading: playlistsLoading,
    error: playlistsError,
    retry: retryPlaylists,
  } = usePublishedPlaylists(playlistTab);
  const playlistStats = playlistPoolStats;
  const updateRef = useRef(update);
  updateRef.current = update;

  useEffect(() => {
    if (!stats || stats.insufficient || !config.watchedAllowFallback) return;
    if (source !== 'watched') return;
    updateRef.current({ watchedAllowFallback: false });
  }, [stats, config.watchedAllowFallback, source]);

  useEffect(() => {
    if (!playlistStats || playlistStats.insufficient || !config.watchedAllowFallback) return;
    if (source !== 'playlist' || !config.playlistWatched) return;
    updateRef.current({ watchedAllowFallback: false });
  }, [playlistStats, config.watchedAllowFallback, source, config.playlistWatched]);

  const tabClass = (active: boolean) =>
    cn(
      'flex-1 rounded-md py-1.5 text-xs font-bold transition-all',
      active ? 'bg-background text-primary shadow' : 'text-muted-foreground hover:text-foreground',
      FOCUS_RING,
    );

  const showFusion = showWatchedFusionMode(isRoom, currentPlayersCount);
  const modeLabel = showFusion
    ? watchedPoolModeLabel(stats?.watchedMode ?? config.watchedMode)
    : 'votre liste';

  return (
    <div className="space-y-3">
      <SectionHeader
        icon={Eye}
        title="Source des musiques"
        tooltip={`D'où proviennent les animes piochés. « Watched » utilise votre liste AniList ou MyAnimeList (${WATCHED_LIST_STATUSES_ET}). Playlists = packs staff figés.`}
      />

      <div
        role="tablist"
        aria-label="Source des musiques"
        className="flex shrink-0 gap-1 rounded-lg bg-secondary/30 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'random'}
          onClick={() => setSource('random')}
          className={tabClass(tab === 'random')}
        >
          Aléatoire
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'watched'}
          onClick={() => setSource('watched')}
          className={tabClass(tab === 'watched')}
        >
          Watched
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'playlist'}
          onClick={() => setTab('playlist')}
          className={tabClass(tab === 'playlist')}
        >
          {PLAYLISTS_COPY.tab}
        </button>
      </div>

      <div className="flex h-[22rem] shrink-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40 p-2">
        {tab === 'random' && (
          <div className="flex h-full min-h-0 animate-in fade-in zoom-in flex-col items-center justify-center p-4 text-center text-muted-foreground duration-300">
            <div className="mb-3 rounded-full bg-primary/10 p-4">
              <Shuffle className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>
            <p className="font-bold text-foreground">Mode aléatoire</p>
            <p className="mt-1 text-xs">
              Pioche parmi toute la base de données selon les filtres et contraintes.
            </p>
          </div>
        )}

        {tab === 'watched' && (
          <div className="custom-scrollbar h-full min-h-0 animate-in fade-in zoom-in space-y-4 overflow-y-auto p-2 duration-300">
            <div className="rounded-xl border border-info/20 bg-info/10 p-3 text-xs text-muted-foreground">
              <p className="mb-1 flex items-center gap-2 font-bold text-info">
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Ma liste anime
              </p>
              Pioche uniquement parmi les animes de vos listes{' '}
              {WATCHED_LIST_STATUS_LABELS.map((label, index) => (
                <span key={label}>
                  {index > 0
                    ? index === WATCHED_LIST_STATUS_LABELS.length - 1
                      ? ' et '
                      : ', '
                    : null}
                  <b className="text-foreground">{label}</b>
                </span>
              ))}{' '}
              (AniList ou MyAnimeList).
              {!watchedListLinked &&
                !isRoom &&
                ' Liez AniList ou MyAnimeList pour lancer une partie.'}
              <button
                type="button"
                className="mt-2 block font-semibold text-info underline-offset-2 hover:underline"
                onClick={() => openSettings('account')}
              >
                {SETTINGS_COPY.integrationsManage}
              </button>
            </div>

            {watchedEnabled && (
              <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-xs">
                <Music2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                {watchedPoolOffline ? (
                  <span className="text-destructive">{WATCHED_SERVER_OFFLINE}</span>
                ) : loading || !stats ? (
                  <span className="text-muted-foreground">Analyse du pool…</span>
                ) : stats.playableSongs === 0 ? (
                  <span className="text-warning">
                    {stats.listError === 'anilist_blocked'
                      ? WATCHED_ANILIST_BLOCKED_MESSAGE
                      : stats.animeCount === 0
                        ? WATCHED_LIST_UNAVAILABLE
                        : `Aucun son jouable dans la ${modeLabel} pour ces filtres.`}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    <b className="text-foreground">{stats.playableSongs}</b> son
                    {stats.playableSongs > 1 ? 's' : ''} jouable{stats.playableSongs > 1 ? 's' : ''}
                    {showFusion ? ` (${modeLabel})` : ''}
                    <span className="text-muted-foreground/70">
                      {' '}
                      — {stats.animeCount} anime{stats.animeCount > 1 ? 's' : ''}
                    </span>
                    {stats.insufficient && !config.watchedAllowFallback && (
                      <span className="text-warning">
                        {' '}
                        — insuffisant pour {stats.soundCount} sons
                      </span>
                    )}
                    {stats.insufficient && config.watchedAllowFallback && (
                      <span className="text-info"> — complétion aléatoire activée</span>
                    )}
                    {stats.listError === 'anilist_blocked' && (
                      <span className="text-warning"> — {WATCHED_ANILIST_STALE_MESSAGE}</span>
                    )}
                  </span>
                )}
              </div>
            )}

            {watchedEnabled &&
              stats?.insufficient &&
              stats.playableSongs > 0 &&
              !config.watchedAllowFallback && (
                <div className="space-y-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <p className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertTriangle
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning"
                      aria-hidden="true"
                    />
                    Pas assez de sons dans la {modeLabel} pour {stats.soundCount} manches. Sans
                    action, le lancement sera bloqué.
                  </p>
                  <OptionButton
                    active={Boolean(config.watchedAllowFallback)}
                    onClick={() => update({ watchedAllowFallback: !config.watchedAllowFallback })}
                    className="w-full p-2 text-left"
                  >
                    <div className="text-xs font-bold">Compléter avec l&apos;aléatoire</div>
                    <div className="text-[9px] text-muted-foreground">
                      Les manches manquantes seront tirées dans le catalogue global (choix
                      explicite).
                    </div>
                  </OptionButton>
                </div>
              )}

            {showFusion && (
              <div className="space-y-2">
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
                    <div className="text-[9px] text-muted-foreground">
                      Vus par TOUS les joueurs.
                    </div>
                  </OptionButton>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'playlist' && (
          <div className="flex h-full min-h-0 flex-1 flex-col">
            <PlaylistPicker
              config={config}
              update={update}
              playlists={playlists}
              loading={playlistsLoading}
              loadError={Boolean(playlistsError)}
              loadErrorOffline={playlistsError === 'offline'}
              onRetry={retryPlaylists}
              stats={playlistStats}
              isRoom={isRoom}
              currentPlayersCount={currentPlayersCount}
              watchedListLinked={watchedListLinked}
            />
          </div>
        )}
      </div>
    </div>
  );
}
