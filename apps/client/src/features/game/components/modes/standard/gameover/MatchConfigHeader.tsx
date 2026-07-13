import { Trophy, Zap } from 'lucide-react';
import type { GameConfig, GameType } from '@aniquizz/shared';
import { GAME_TYPE_LABELS } from '@aniquizz/shared';
import { cn } from '@/lib/utils';
import { buildLobbySettingChips } from '@/features/hub/components/roomSettings';
import { SettingChip, SettingChipList } from '@/features/hub/components/SettingChip';

const COMPACT_MODE_LABELS: Record<GameType, string> = {
  standard: 'STD',
  sprint: 'SPR',
};

interface MatchConfigHeaderProps {
  settings: Partial<
    Pick<
      GameConfig,
      'gameType' | 'soundCount' | 'guessDuration' | 'difficulty' | 'precision' | 'responseType' | 'soundSelection'
    >
  >;
  className?: string;
}

/** Game-over settings strip — same chips as the room list / lobby (solo + multi). */
export function MatchConfigHeader({ settings, className }: MatchConfigHeaderProps) {
  const gameType = settings.gameType ?? 'standard';
  const isSprint = gameType === 'sprint';
  const ModeIcon = isSprint ? Zap : Trophy;

  const chips = buildLobbySettingChips({
    soundCount: settings.soundCount ?? 10,
    guessDuration: settings.guessDuration ?? 15,
    difficulty: settings.difficulty ?? [],
    precision: settings.precision ?? 'franchise',
    responseType: settings.responseType ?? 'typing',
    soundSelection: settings.soundSelection ?? 'random',
  });

  return (
    <div
      className={cn(
        'flex w-full overflow-hidden rounded-lg border border-border/60 bg-secondary/20',
        className,
      )}
    >
      <div
        className="flex shrink-0 flex-col items-center justify-center gap-0.5 self-stretch bg-primary px-3 text-primary-foreground shadow-sm"
        aria-label={`Mode ${GAME_TYPE_LABELS[gameType]}`}
      >
        <ModeIcon className={cn('h-4 w-4', !isSprint && 'fill-current')} aria-hidden />
        <span className="text-[10px] font-black uppercase tracking-wider">{COMPACT_MODE_LABELS[gameType]}</span>
      </div>
      <SettingChipList className="flex-1 px-4 py-3">
        {chips.map((spec) => (
          <SettingChip key={spec.key} {...spec} />
        ))}
      </SettingChipList>
    </div>
  );
}

/** @deprecated Use `MatchConfigHeader`. */
export const SoloConfigHeader = MatchConfigHeader;
