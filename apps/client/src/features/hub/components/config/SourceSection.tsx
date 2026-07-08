import { Eye, Link2, Shuffle, Lock, AlertTriangle } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import type { RoomConfig } from '@aniquizz/shared';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Profile } from '@/features/auth/context/AuthContext';
import { SectionHeader, OptionButton, FOCUS_RING } from './ConfigPrimitives';

type Source = RoomConfig['soundSelection'];

interface SourceSectionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
  user: User | null;
  profile: Profile | null;
  isRoom: boolean;
}

export function SourceSection({ config, update, user, profile, isRoom }: SourceSectionProps) {
  const source = config.soundSelection;
  const watchedLocked = !user || !profile?.anilistUsername;
  const watchedLockReason = !user ? 'Connectez-vous pour utiliser vos listes.' : 'Liez un compte AniList dans votre profil.';

  const setSource = (next: Source) => {
    if (next === 'watched' && watchedLocked) return;
    update({ soundSelection: next });
  };

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
        tooltip="D'où proviennent les animes piochés. « Watched » nécessite un compte AniList lié."
      />

      <div role="tablist" aria-label="Source des musiques" className="flex gap-1 rounded-lg bg-secondary/30 p-1">
        <button type="button" role="tab" aria-selected={source === 'random'} onClick={() => setSource('random')} className={tabClass(source === 'random')}>
          Aléatoire
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={source === 'watched'}
          disabled={watchedLocked}
          onClick={() => setSource('watched')}
          className={cn(tabClass(source === 'watched'), watchedLocked && 'cursor-not-allowed opacity-50 hover:text-muted-foreground', 'flex items-center justify-center gap-1.5')}
        >
          Watched {watchedLocked && <Lock className="h-3 w-3" aria-hidden="true" />}
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
                <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> Compte AniList requis
              </p>
              Utilise vos listes <b className="text-foreground">Completed</b> et <b className="text-foreground">Watching</b>.
            </div>

            {watchedLocked && (
              <div className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/10 p-3 text-xs text-warning">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{watchedLockReason}</span>
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
