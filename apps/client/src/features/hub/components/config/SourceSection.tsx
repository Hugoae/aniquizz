import { useEffect } from 'react';
import { Eye, Link2, Shuffle, Lock, Music2, AlertTriangle } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import { withWatchedPoolSoundCount } from '@aniquizz/shared';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { SectionHeader, OptionButton, FOCUS_RING } from './ConfigPrimitives';
import { useWatchedPoolStats } from '@/features/hub/hooks/useWatchedPoolStats';
import { watchedPoolModeLabel } from './watchedSource';

type Source = RoomConfig['soundSelection'];

interface SourceSectionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
  isRoom: boolean;
  watchedListLinked?: boolean;
  /** When set, pool stats resolve the lobby union/intersection instead of solo list. */
  roomId?: string;
  /** Lobby roster key — refetches pool stats on join/leave/kick. */
  watchedPlayersKey?: string;
}

export function SourceSection({ config, update, isRoom, watchedListLinked = false, roomId, watchedPlayersKey }: SourceSectionProps) {
  const source = config.soundSelection;

  const setSource = (next: Source) => {
    const patch: Partial<RoomConfig> = { soundSelection: next };
    if (next !== 'watched') patch.watchedAllowFallback = false;
    update(patch);
  };

  const watchedEnabled = source === 'watched' && (isRoom || watchedListLinked);
  const { stats: statsRaw, loading } = useWatchedPoolStats({
    roomId: isRoom ? roomId : undefined,
    soundCount: config.soundCount,
    difficulty: config.difficulty,
    types: config.soundTypes,
    watchedMode: config.watchedMode,
    enabled: watchedEnabled,
    refreshKey: isRoom ? watchedPlayersKey : undefined,
  });
  const stats = withWatchedPoolSoundCount(statsRaw, config.soundCount);

  useEffect(() => {
    if (!stats || stats.insufficient || !config.watchedAllowFallback) return;
    update({ watchedAllowFallback: false });
  }, [stats?.insufficient, config.watchedAllowFallback]);

  const tabClass = (active: boolean) =>
    cn(
      'flex-1 rounded-md py-1.5 text-xs font-bold transition-all',
      active ? 'bg-background text-primary shadow' : 'text-muted-foreground hover:text-foreground',
      FOCUS_RING,
    );

  const modeLabel = isRoom
    ? watchedPoolModeLabel(stats?.watchedMode ?? config.watchedMode)
    : 'votre liste';

  return (
    <div className="space-y-3">
      <SectionHeader
        icon={Eye}
        title="Source des musiques"
        tooltip="D'où proviennent les animes piochés. « Watched » utilise votre liste AniList ou MyAnimeList (Completed, Watching, On-Hold)."
      />

      <div role="tablist" aria-label="Source des musiques" className="flex gap-1 rounded-lg bg-secondary/30 p-1">
        <button type="button" role="tab" aria-selected={source === 'random'} onClick={() => setSource('random')} className={tabClass(source === 'random')}>
          Aléatoire
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={source === 'watched'}
          onClick={() => setSource('watched')}
          className={tabClass(source === 'watched')}
        >
          Watched
        </button>
        <button
          type="button"
          disabled
          aria-disabled="true"
          className={cn(tabClass(false), 'flex cursor-not-allowed items-center justify-center gap-1.5 opacity-50 hover:text-muted-foreground')}
          title="Bientôt disponible"
        >
          Playlists <Lock className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-[180px] rounded-xl border border-border/60 bg-card/40 p-2">
        {source === 'random' && (
          <div className="flex h-full min-h-[160px] animate-in fade-in zoom-in flex-col items-center justify-center p-4 text-center text-muted-foreground duration-300">
            <div className="mb-3 rounded-full bg-primary/10 p-4">
              <Shuffle className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>
            <p className="font-bold text-foreground">Mode aléatoire</p>
            <p className="mt-1 text-xs">Pioche parmi toute la base de données selon les filtres et contraintes.</p>
          </div>
        )}

        {source === 'watched' && (
          <div className="animate-in fade-in zoom-in space-y-4 p-2 duration-300">
            <div className="rounded-xl border border-info/20 bg-info/10 p-3 text-xs text-muted-foreground">
              <p className="mb-1 flex items-center gap-2 font-bold text-info">
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Ma liste anime
              </p>
              Pioche uniquement parmi les animes de vos listes <b className="text-foreground">Completed</b>,{' '}
              <b className="text-foreground">Watching</b> et <b className="text-foreground">On-Hold</b> (AniList ou MyAnimeList).
              {!watchedListLinked && !isRoom && ' Liez AniList ou MyAnimeList pour lancer une partie.'}
            </div>

            {watchedEnabled && (
              <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-xs">
                <Music2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                {loading || !stats ? (
                  <span className="text-muted-foreground">Analyse du pool…</span>
                ) : stats.playableSongs === 0 ? (
                  <span className="text-warning">
                    Aucun son jouable dans la {modeLabel} pour ces filtres.
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    <b className="text-foreground">{stats.playableSongs}</b> son
                    {stats.playableSongs > 1 ? 's' : ''} jouable{stats.playableSongs > 1 ? 's' : ''}
                    {isRoom ? ` (${modeLabel})` : ''}
                    <span className="text-muted-foreground/70"> — {stats.animeCount} anime{stats.animeCount > 1 ? 's' : ''}</span>
                    {stats.insufficient && !config.watchedAllowFallback && (
                      <span className="text-warning"> — insuffisant pour {stats.soundCount} sons</span>
                    )}
                    {stats.insufficient && config.watchedAllowFallback && (
                      <span className="text-info"> — complétion aléatoire activée</span>
                    )}
                  </span>
                )}
              </div>
            )}

            {watchedEnabled && stats?.insufficient && stats.playableSongs > 0 && !config.watchedAllowFallback && (
              <div className="space-y-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
                  Pas assez de sons dans la {modeLabel} pour {stats.soundCount} manches. Sans action, le lancement sera bloqué.
                </p>
                <OptionButton
                  active={Boolean(config.watchedAllowFallback)}
                  onClick={() => update({ watchedAllowFallback: !config.watchedAllowFallback })}
                  className="w-full p-2 text-left"
                >
                  <div className="text-xs font-bold">Compléter avec l&apos;aléatoire</div>
                  <div className="text-[9px] text-muted-foreground">
                    Les manches manquantes seront tirées dans le catalogue global (choix explicite).
                  </div>
                </OptionButton>
              </div>
            )}

            {isRoom && (
              <div className="space-y-2">
                <Label className="text-xs uppercase">Mode de fusion</Label>
                <div className="grid grid-cols-2 gap-2">
                  <OptionButton
                    active={config.watchedMode === 'union'}
                    onClick={() => update({ watchedMode: 'union' })}
                    className="p-2 text-left"
                  >
                    <div className="text-xs font-bold">Union</div>
                    <div className="text-[9px] text-muted-foreground">Les listes de tout le monde.</div>
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
    </div>
  );
}
