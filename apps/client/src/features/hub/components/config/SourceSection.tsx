import { useEffect, useRef, useState } from 'react';
import { Eye, Link2, Shuffle, Music2, AlertTriangle } from 'lucide-react';
import { type PlaylistPoolStats, type RoomConfig, type WatchedPoolStats } from '@aniquizz/shared';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { pick, tx } from '@/lib/i18n/text';
import { SectionHeader, OptionButton, FOCUS_RING } from './ConfigPrimitives';
import { usePublishedPlaylists } from '@/features/hub/hooks/usePublishedPlaylists';
import {
  watchedListStatuses,
  watchedModeDisplayLabel,
  showWatchedFusionMode,
  WATCHED_LIST_UNAVAILABLE,
  WATCHED_ANILIST_BLOCKED_MESSAGE,
  WATCHED_ANILIST_STALE_MESSAGE,
  WATCHED_SERVER_OFFLINE,
} from './watchedSource';
import { PlaylistPicker } from './PlaylistPicker';
import { PLAYLISTS_COPY } from './playlistsCopy';
import { openSettings } from '@/features/settings/lib/openSettings';
import { useSettingsCopy } from '@/features/settings/copy/settingsCopy';

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
  /** Versus race: lanes must share one draw, so the Watched source is hidden. */
  watchedForbidden?: boolean;
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
  watchedForbidden = false,
}: SourceSectionProps) {
  const source = config.soundSelection;
  const copy = useSettingsCopy();
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
    ? watchedModeDisplayLabel(stats?.watchedMode ?? config.watchedMode)
    : pick('votre liste', 'your list');
  const listStatuses = watchedListStatuses('et');

  return (
    <div className="space-y-3">
      <SectionHeader
        icon={Eye}
        title={tx('hub', 'config.sourceTitle')}
        tooltip={tx('hub', 'config.sourceHint', { statuses: listStatuses })}
      />

      <div
        role="tablist"
        aria-label={pick('Source des musiques', 'Music source')}
        className="flex shrink-0 gap-1 rounded-lg bg-secondary/30 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'random'}
          onClick={() => setSource('random')}
          className={tabClass(tab === 'random')}
        >
          {pick('Aléatoire', 'Random')}
        </button>
        {!watchedForbidden && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'watched'}
            onClick={() => setSource('watched')}
            className={tabClass(tab === 'watched')}
          >
            Watched
          </button>
        )}
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
            <p className="font-bold text-foreground">{pick('Mode aléatoire', 'Random mode')}</p>
            <p className="mt-1 text-xs">
              {pick(
                'Pioche parmi toute la base de données selon les filtres et contraintes.',
                'Draws from the whole catalogue, within the filters and limits.',
              )}
            </p>
          </div>
        )}

        {tab === 'watched' && (
          <div className="custom-scrollbar h-full min-h-0 animate-in fade-in zoom-in space-y-4 overflow-y-auto p-2 duration-300">
            <div className="rounded-xl border border-info/20 bg-info/10 p-3 text-xs text-muted-foreground">
              <p className="mb-1 flex items-center gap-2 font-bold text-info">
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" />{' '}
                {pick('Ma liste anime', 'My anime list')}
              </p>
              {pick(
                `Pioche uniquement parmi les animes de vos listes ${listStatuses} (AniList ou MyAnimeList).`,
                `Draws only from anime on your ${listStatuses} lists (AniList or MyAnimeList).`,
              )}
              {!watchedListLinked &&
                !isRoom &&
                pick(
                  ' Liez AniList ou MyAnimeList pour lancer une partie.',
                  ' Link AniList or MyAnimeList to start a match.',
                )}
              <button
                type="button"
                className="mt-2 block font-semibold text-info underline-offset-2 hover:underline"
                onClick={() => openSettings('account')}
              >
                {copy.integrationsManage}
              </button>
            </div>

            {watchedEnabled && (
              <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-xs">
                <Music2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                {watchedPoolOffline ? (
                  <span className="text-destructive">
                    {pick(
                      WATCHED_SERVER_OFFLINE,
                      'The game server is unreachable. Start it, then try again.',
                    )}
                  </span>
                ) : loading || !stats ? (
                  <span className="text-muted-foreground">
                    {pick('Analyse du pool…', 'Checking the pool…')}
                  </span>
                ) : stats.playableSongs === 0 ? (
                  <span className="text-warning">
                    {stats.listError === 'anilist_blocked'
                      ? pick(
                          WATCHED_ANILIST_BLOCKED_MESSAGE,
                          'The AniList API is down. Try again later.',
                        )
                      : stats.animeCount === 0
                        ? pick(
                            WATCHED_LIST_UNAVAILABLE,
                            'Your list is empty or unreachable (private on AniList?). Make it public, or pick another source.',
                          )
                        : pick(
                            `Aucun son jouable dans la ${modeLabel} pour ces filtres.`,
                            `No playable songs in ${modeLabel} for these filters.`,
                          )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {pick(
                      `${stats.playableSongs} son${stats.playableSongs > 1 ? 's' : ''} jouable${stats.playableSongs > 1 ? 's' : ''}`,
                      `${stats.playableSongs} playable song${stats.playableSongs > 1 ? 's' : ''}`,
                    )}
                    {showFusion ? ` (${modeLabel})` : ''}
                    <span className="text-muted-foreground/70">
                      {' '}
                      — {stats.animeCount} anime{stats.animeCount > 1 ? 's' : ''}
                    </span>
                    {stats.insufficient && !config.watchedAllowFallback && (
                      <span className="text-warning">
                        {' '}
                        —{' '}
                        {pick(
                          `insuffisant pour ${stats.soundCount} sons`,
                          `not enough for ${stats.soundCount} songs`,
                        )}
                      </span>
                    )}
                    {stats.insufficient && config.watchedAllowFallback && (
                      <span className="text-info">
                        {' '}
                        — {pick('complétion aléatoire activée', 'random fill is on')}
                      </span>
                    )}
                    {stats.listError === 'anilist_blocked' && (
                      <span className="text-warning">
                        {' '}
                        —{' '}
                        {pick(
                          WATCHED_ANILIST_STALE_MESSAGE,
                          'AniList is unstable: the list shown may be a few minutes old.',
                        )}
                      </span>
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
                    {pick(
                      `Pas assez de sons dans la ${modeLabel} pour ${stats.soundCount} manches. Sans action, le lancement sera bloqué.`,
                      `Not enough songs in ${modeLabel} for ${stats.soundCount} rounds. Without a choice, the match cannot start.`,
                    )}
                  </p>
                  <OptionButton
                    active={Boolean(config.watchedAllowFallback)}
                    onClick={() => update({ watchedAllowFallback: !config.watchedAllowFallback })}
                    className="w-full p-2 text-left"
                  >
                    <div className="text-xs font-bold">
                      {pick("Compléter avec l'aléatoire", 'Fill with random songs')}
                    </div>
                    <div className="text-[9px] text-muted-foreground">
                      {pick(
                        'Les manches manquantes seront tirées dans le catalogue global (choix explicite).',
                        'The missing rounds are drawn from the full catalogue (you choose this).',
                      )}
                    </div>
                  </OptionButton>
                </div>
              )}

            {showFusion && (
              <div className="space-y-2">
                <Label className="text-xs uppercase">{pick('Mode de fusion', 'Merge mode')}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <OptionButton
                    active={config.watchedMode === 'union'}
                    onClick={() => update({ watchedMode: 'union' })}
                    className="p-2 text-left"
                  >
                    <div className="text-xs font-bold">Union</div>
                    <div className="text-[9px] text-muted-foreground">
                      {pick('Les listes de tout le monde.', "Everyone's lists.")}
                    </div>
                  </OptionButton>
                  <OptionButton
                    active={config.watchedMode === 'intersection'}
                    onClick={() => update({ watchedMode: 'intersection' })}
                    className="p-2 text-left"
                  >
                    <div className="text-xs font-bold">{pick('Commun', 'Shared')}</div>
                    <div className="text-[9px] text-muted-foreground">
                      {pick('Vus par TOUS les joueurs.', 'Seen by EVERY player.')}
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
              watchedForbidden={watchedForbidden}
            />
          </div>
        )}
      </div>
    </div>
  );
}
