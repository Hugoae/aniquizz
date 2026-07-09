import type { Dispatch, SetStateAction } from 'react';
import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';

import type { User } from '@supabase/supabase-js';
import type { GameConfig, RoomConfig } from '@aniquizz/shared';
import type { Profile } from '@/features/auth/context/AuthContext';

import { RoomSettingsSection } from './config/RoomSettingsSection';
import { RulesSection } from './config/RulesSection';
import { SourceSection } from './config/SourceSection';
import { FiltersSection } from './config/FiltersSection';
import { isWatchedSourceBlocked, WATCHED_SOURCE_BLOCK_MESSAGE } from './config/watchedSource';

interface GameConfigFormProps<T extends GameConfig> {
  config: T;
  setConfig: Dispatch<SetStateAction<T>>;
  toggleSoundType: (type: string) => void;
  onReset: () => void;
  onSubmit: () => void;
  isRoom?: boolean;
  hideRoomSettings?: boolean;
  currentPlayersCount?: number;
  user: User | null;
  profile: Profile | null;
}

export function GameConfigForm<T extends GameConfig>({
  config,
  setConfig,
  toggleSoundType,
  onReset,
  onSubmit,
  isRoom = false,
  hideRoomSettings = false,
  currentPlayersCount = 0,
  user,
  profile,
}: GameConfigFormProps<T>) {
  // The form reads a widened RoomConfig view; room-only fields are simply absent
  // (and unused) in solo mode. Writes go through the typed `update` helper.
  const cfg = config as unknown as RoomConfig;

  const update = (patch: Partial<RoomConfig>) => setConfig((prev) => ({ ...prev, ...patch }) as T);

  const toggleDifficulty = (id: string) =>
    setConfig((prev) => {
      const current = (prev as unknown as RoomConfig).difficulty || [];
      if (current.includes(id)) {
        if (current.length <= 1) return prev;
        return { ...prev, difficulty: current.filter((d) => d !== id) } as T;
      }
      return { ...prev, difficulty: [...current, id] } as T;
    });

  const showRoomSettings = isRoom && !hideRoomSettings;
  const noTypes = (cfg.soundTypes?.length ?? 0) === 0;
  const missingPassword = showRoomSettings && cfg.isPrivate && !cfg.password;
  const watchedBlocked = isWatchedSourceBlocked(cfg.soundSelection, user, profile);
  const submitDisabled = noTypes || missingPassword || watchedBlocked;

  const submitLabel = isRoom ? (currentPlayersCount > 0 ? 'Mettre à jour' : 'Créer le salon') : 'Lancer la partie';

  return (
    <div className="flex max-h-[85vh] flex-col">
      <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-1 pr-2">
        {showRoomSettings && <RoomSettingsSection config={cfg} update={update} minPlayers={currentPlayersCount} />}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          <RulesSection config={cfg} update={update} />
          <SourceSection
            config={cfg}
            update={update}
            isRoom={isRoom}
            anilistLinked={Boolean(profile?.anilistUsername?.trim())}
          />
        </div>

        <FiltersSection config={cfg} toggleSoundType={toggleSoundType} toggleDifficulty={toggleDifficulty} />
      </div>

      <div className="mt-3 flex shrink-0 flex-col gap-2 border-t border-border/60 pt-3">
        <div className="flex gap-3">
          <Button variant="outline" onClick={onReset} className="gap-2 rounded-lg">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
          <Button
            variant="glow"
            onClick={onSubmit}
            className="flex-1 rounded-lg text-lg font-bold"
            disabled={submitDisabled}
          >
            {submitLabel}
          </Button>
        </div>
        {watchedBlocked && (
          <p className="text-center text-sm font-medium text-destructive" role="alert">
            {WATCHED_SOURCE_BLOCK_MESSAGE}
          </p>
        )}
      </div>
    </div>
  );
}
