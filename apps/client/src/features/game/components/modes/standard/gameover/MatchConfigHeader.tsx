import type { GameConfig } from '@aniquizz/shared';
import { playlistSourceDisplayName } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { buildLobbySettingChips } from '@/features/hub/components/roomSettings';
import { SettingChipItem, SettingChipList } from '@/features/hub/components/SettingChip';
import { GameModeBadge } from '@/features/hub/components/GameModeBadge';
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
      <div className="flex shrink-0 items-center self-stretch bg-primary px-3 text-primary-foreground shadow-sm">
        <GameModeBadge
          gameType={gameType}
          speedBonusEnabled={Boolean(settings.speedBonusEnabled)}
          compact
          className="bg-transparent px-0 py-0 shadow-none"
        />
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
