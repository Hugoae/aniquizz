import { Music2 } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import {
  SONG_START_MODE_DESCRIPTIONS,
  SONG_START_MODE_LABELS,
  normalizeSongStartMode,
  type SongStartMode,
} from '@aniquizz/shared';
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
        title="Départ de l'extrait"
        tooltip="Où commence la lecture pendant le guess. La révélation continue depuis ce point."
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SONG_START_MODES.map((id) => (
          <OptionButton
            key={id}
            active={mode === id}
            onClick={() => update({ songStartMode: id })}
            className="flex flex-col items-start gap-1 p-3 text-left"
          >
            <span className="text-[11px] font-bold uppercase">{SONG_START_MODE_LABELS[id]}</span>
            <span className="text-[10px] leading-snug text-muted-foreground">
              {SONG_START_MODE_DESCRIPTIONS[id]}
            </span>
          </OptionButton>
        ))}
      </div>
    </div>
  );
}
