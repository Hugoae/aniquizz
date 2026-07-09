import { useEffect, useState } from 'react';
import { Eye, Link2, Shuffle, Lock, Music2 } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { socket } from '@/lib/socket';
import { SectionHeader, OptionButton, FOCUS_RING } from './ConfigPrimitives';

type Source = RoomConfig['soundSelection'];

interface WatchedCount {
  listSize: number;
  playableSongs: number;
}

interface SourceSectionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
  isRoom: boolean;
  anilistLinked?: boolean;
}

export function SourceSection({ config, update, isRoom, anilistLinked = false }: SourceSectionProps) {
  const source = config.soundSelection;

  const setSource = (next: Source) => update({ soundSelection: next });

  // Ask the server how many playable songs the user's AniList list yields, so the
  // player knows whether Watched will fall back to random before starting.
  const [watchedCount, setWatchedCount] = useState<WatchedCount | null>(null);
  const [countLoading, setCountLoading] = useState(false);

  useEffect(() => {
    if (source !== 'watched' || !anilistLinked) {
      setWatchedCount(null);
      return;
    }
    setCountLoading(true);
    const onCount = (payload: WatchedCount) => {
      setWatchedCount(payload);
      setCountLoading(false);
    };
    socket.on('watched_count', onCount);
    socket.emit('get_watched_count');
    return () => {
      socket.off('watched_count', onCount);
    };
  }, [source, anilistLinked]);

  const tabClass = (active: boolean) =>
    cn(
      'flex-1 rounded-md py-1.5 text-xs font-bold transition-all',
      active ? 'bg-background text-primary shadow' : 'text-muted-foreground hover:text-foreground',
      FOCUS_RING,
    );

  return (
    <div className="space-y-3">
      <SectionHeader
        icon={Eye}
        title="Source des musiques"
        tooltip="D'où proviennent les animes piochés. « Watched » utilise votre liste AniList (Completed + Watching)."
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
            <p className="mt-1 text-xs">Pioche parmi toute la base de données.</p>
          </div>
        )}

        {source === 'watched' && (
          <div className="animate-in fade-in zoom-in space-y-4 p-2 duration-300">
            <div className="rounded-xl border border-info/20 bg-info/10 p-3 text-xs text-muted-foreground">
              <p className="mb-1 flex items-center gap-2 font-bold text-info">
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Ma liste AniList
              </p>
              Pioche uniquement parmi les animes de vos listes <b className="text-foreground">Completed</b> et{' '}
              <b className="text-foreground">Watching</b>.
              {!anilistLinked && ' Un compte AniList lié est requis pour lancer une partie.'}
            </div>

            {anilistLinked && (
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-secondary/30 px-3 py-2 text-xs">
                <Music2 className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
                {countLoading || !watchedCount ? (
                  <span className="text-muted-foreground">Analyse de votre liste AniList…</span>
                ) : watchedCount.playableSongs === 0 ? (
                  <span className="text-warning">
                    Aucun son jouable dans votre liste pour le moment (base en cours de remplissage).
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    <b className="text-foreground">≈ {watchedCount.playableSongs}</b> son
                    {watchedCount.playableSongs > 1 ? 's' : ''} jouable
                    {watchedCount.playableSongs > 1 ? 's' : ''} dans votre liste
                    <span className="text-muted-foreground/70"> ({watchedCount.listSize} animes)</span>
                  </span>
                )}
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
