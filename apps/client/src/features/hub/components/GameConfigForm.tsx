import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { User } from '@supabase/supabase-js';
import type { GameConfig, RoomConfig } from '@aniquizz/shared';
import { withWatchedPoolSoundCount, hasWatchedListLink } from '@aniquizz/shared';
import type { Profile } from '@/features/auth/context/AuthContext';

import { RoomSettingsSection } from './config/RoomSettingsSection';
import { RulesSection } from './config/RulesSection';
import { SourceSection } from './config/SourceSection';
import { AdvancedSection } from './config/AdvancedSection';
import { isWatchedSourceBlocked, checkWatchedPoolLaunch, WATCHED_SOURCE_BLOCK_MESSAGE } from './config/watchedSource';
import { useWatchedPoolStats } from '@/features/hub/hooks/useWatchedPoolStats';
import {
  buildConfigSections,
  defaultSectionId,
  type ConfigSectionId,
} from './config/configSections';

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
  const sections = useMemo(() => buildConfigSections(), []);
  const [activeSection, setActiveSection] = useState<ConfigSectionId>(() => defaultSectionId());

  const safeActiveSection = sections.some((s) => s.id === activeSection)
    ? activeSection
    : defaultSectionId();

  const activeSectionLabel = sections.find((s) => s.id === safeActiveSection)?.label;

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
    <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-8">
      <aside className="flex shrink-0 flex-col gap-4 lg:w-56">
        {showRoomSettings && (
          <RoomSettingsSection
            variant="sidebar"
            config={cfg}
            update={update}
            minPlayers={currentPlayersCount}
          />
        )}

        <nav
          aria-label="Sections de configuration"
          className="custom-scrollbar flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = safeActiveSection === section.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isActive
                    ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
                    : 'border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:bg-card/80 hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{section.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="glass-card custom-scrollbar flex-1 overflow-y-auto px-5 pb-4 pt-3 md:px-6 md:pb-5 md:pt-3 lg:px-8 lg:pb-6">
          {activeSectionLabel && (
            <h2 className="mb-3 border-b border-border/60 pb-1.5 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
              {activeSectionLabel}
            </h2>
          )}
          {safeActiveSection === 'general' && (
            <RulesSection
              config={cfg}
              update={update}
              toggleSoundType={toggleSoundType}
              toggleDifficulty={toggleDifficulty}
            />
          )}
          {safeActiveSection === 'source' && (
            <SourceSection
              config={cfg}
              update={update}
              isRoom={isRoom}
              watchedListLinked={hasWatchedListLink(profile ?? {})}
              roomId={roomId}
              watchedPlayersKey={watchedPlayersKey}
            />
          )}
          {safeActiveSection === 'advanced' && <AdvancedSection config={cfg} update={update} />}
        </div>

        <div className="mt-3 flex shrink-0 flex-col gap-2 border-t border-border/60 pt-3 md:mt-4 md:pt-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={onReset} className="gap-2 rounded-lg sm:w-auto">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset
            </Button>
            <Button
              variant="glow"
              onClick={onSubmit}
              className="flex-1 rounded-lg text-base font-bold md:text-lg"
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
    </div>
  );
}
