import { Music2 } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import {
  TIME_ATTACK_MIN_CLIP_SECONDS,
  normalizeSongStartMode,
  type SongStartMode,
} from '@aniquizz/shared';
import { songStartHint, songStartLabel } from '@/features/hub/copy/hubCopy';
import { tx } from '@/lib/i18n/text';
import { SectionHeader, OptionButton } from './ConfigPrimitives';

const SONG_START_MODES: SongStartMode[] = ['random', 'beginning'];

interface SongStartSectionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
}

export function SongStartSection({ config, update }: SongStartSectionProps) {
  const mode = normalizeSongStartMode(config.songStartMode);

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/10 p-3">
      <SectionHeader
        icon={Music2}
        title={tx('hub', 'config.songStartTitle')}
        tooltip={tx('hub', 'config.songStartHint')}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SONG_START_MODES.map((id) => (
          <OptionButton
            key={id}
            active={mode === id}
            onClick={() => update({ songStartMode: id })}
            className="flex flex-col items-start gap-1 p-3 text-left"
          >
            <span className="text-[11px] font-bold uppercase">{songStartLabel(id)}</span>
            <span className="text-[10px] leading-snug text-muted-foreground">
              {songStartHint(id)}
            </span>
          </OptionButton>
        ))}
      </div>
      {config.gameType === 'timeAttack' && mode === 'random' ? (
        <p className="text-[10px] leading-snug text-muted-foreground">
          {tx('hub', 'config.lateStart', { seconds: TIME_ATTACK_MIN_CLIP_SECONDS })}
        </p>
      ) : null}
    </div>
  );
}
