import type { Dispatch, SetStateAction } from 'react';
import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { User } from '@supabase/supabase-js';
import type { GameConfig, RoomConfig } from '@aniquizz/shared';
import { withWatchedPoolSoundCount, hasWatchedListLink } from '@aniquizz/shared';
import type { Profile } from '@/features/auth/context/AuthContext';

import { RoomSettingsSection } from './config/RoomSettingsSection';
import { RulesSection } from './config/RulesSection';
import { SourceSection } from './config/SourceSection';
import { FiltersSection } from './config/FiltersSection';
import { VideoDisplaySection } from './config/VideoDisplaySection';
import { SongStartSection } from './config/SongStartSection';
import { isWatchedSourceBlocked, checkWatchedPoolLaunch, WATCHED_SOURCE_BLOCK_MESSAGE } from './config/watchedSource';
import { useWatchedPoolStats } from '@/features/hub/hooks/useWatchedPoolStats';

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
  roomId?: string;
  /** Lobby roster key — refetches Watched pool stats on join/leave/kick. */
  watchedPlayersKey?: string;
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
  roomId,
  watchedPlayersKey,
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
  const { stats: watchedStatsRaw } = useWatchedPoolStats({
    roomId,
    soundCount: cfg.soundCount,
    difficulty: cfg.difficulty,
    types: cfg.soundTypes,
    watchedMode: cfg.watchedMode,
    enabled: cfg.soundSelection === 'watched' && (isRoom || hasWatchedListLink(profile ?? {})),
    refreshKey: isRoom ? watchedPlayersKey : undefined,
  });
  const watchedStats = withWatchedPoolSoundCount(watchedStatsRaw, cfg.soundCount);
  const watchedPoolCheck = checkWatchedPoolLaunch(cfg.soundSelection, watchedStats, cfg.watchedAllowFallback);
  const submitDisabled = noTypes || missingPassword || watchedBlocked || watchedPoolCheck.blocked;

  const submitLabel = isRoom ? (currentPlayersCount > 0 ? 'Mettre à jour' : 'Créer le salon') : 'Lancer la partie';

  return (
    <div className="flex max-h-[85vh] flex-col">
      <Tabs defaultValue="general" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="mb-3 w-full shrink-0 grid grid-cols-2">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="advanced">Avancé</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="custom-scrollbar mt-0 flex-1 space-y-4 overflow-y-auto p-1 pr-2">
          {showRoomSettings && <RoomSettingsSection config={cfg} update={update} minPlayers={currentPlayersCount} />}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <RulesSection config={cfg} update={update} />
            <SourceSection
              config={cfg}
              update={update}
              isRoom={isRoom}
              watchedListLinked={hasWatchedListLink(profile ?? {})}
              roomId={roomId}
              watchedPlayersKey={watchedPlayersKey}
            />
          </div>

          <FiltersSection config={cfg} toggleSoundType={toggleSoundType} toggleDifficulty={toggleDifficulty} />
        </TabsContent>

        <TabsContent value="advanced" className="custom-scrollbar mt-0 flex-1 space-y-4 overflow-y-auto p-1 pr-2">
          <VideoDisplaySection config={cfg} update={update} />
          <SongStartSection config={cfg} update={update} />
        </TabsContent>
      </Tabs>

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
        {!watchedBlocked && watchedPoolCheck.blocked && watchedPoolCheck.reason && (
          <p className="text-center text-sm font-medium text-destructive" role="alert">
            {watchedPoolCheck.reason}
          </p>
        )}
      </div>
    </div>
  );
}
