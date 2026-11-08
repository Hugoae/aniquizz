import type { GameConfig } from '@aniquizz/shared';
import { playlistSourceDisplayName } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { buildLobbySettingChips } from '@/features/hub/components/roomSettings';
import { SettingChipItem, SettingChipList } from '@/features/hub/components/SettingChip';
import { GameModeBadge } from '@/features/hub/components/GameModeBadge';
import { TestMatchMark } from '@/features/hub/components/config/TestMatchOption';
import { usePublishedPlaylists } from '@/features/hub/hooks/usePublishedPlaylists';

interface MatchConfigHeaderProps {
  settings: Partial<
    Pick<
      GameConfig,
      | 'gameType'
      | 'speedBonusEnabled'
      | 'soundCount'
      | 'guessDuration'
      | 'difficulty'
      | 'precision'
      | 'responseType'
      | 'soundSelection'
      | 'playlistId'
      | 'decadePlaylistId'
      | 'timeBudgetSeconds'
      | 'testMatch'
    >
  >;
  className?: string;
}

/** Game-over settings strip — same chips as the room list / lobby (solo + multi). */
export function MatchConfigHeader({ settings, className }: MatchConfigHeaderProps) {
  const gameType = settings.gameType ?? 'standard';
  const isPlaylist = settings.soundSelection === 'playlist';
  const { playlists } = usePublishedPlaylists(isPlaylist);
  const playlistName = isPlaylist ? playlistSourceDisplayName(playlists, settings) : undefined;

  const chips = buildLobbySettingChips({
    soundCount: settings.soundCount ?? 10,
    guessDuration: settings.guessDuration ?? 15,
    gameType,
    timeBudgetSeconds: settings.timeBudgetSeconds,
    difficulty: settings.difficulty ?? [],
    precision: settings.precision ?? 'franchise',
    responseType: settings.responseType ?? 'typing',
    soundSelection: settings.soundSelection ?? 'random',
    playlistName,
  });

  return (
    <div
      className={cn(
        'flex w-full overflow-hidden rounded-lg border border-border/60 bg-secondary/20',
        className,
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center gap-2 self-stretch px-3 shadow-sm',
          gameType === 'timeAttack'
            ? 'bg-aqua text-aqua-foreground'
            : 'bg-primary text-primary-foreground',
        )}
      >
        <GameModeBadge
          gameType={gameType}
          speedBonusEnabled={Boolean(settings.speedBonusEnabled)}
          compact
          className="bg-transparent px-0 py-0 shadow-none"
        />
        {settings.testMatch ? <TestMatchMark /> : null}
      </div>
      <SettingChipList className="flex-1 px-4 py-3">
        {chips.map((spec) => (
          <SettingChipItem key={spec.key} spec={spec} />
        ))}
      </SettingChipList>
    </div>
  );
}

/** @deprecated Use `MatchConfigHeader`. */
export const SoloConfigHeader = MatchConfigHeader;
