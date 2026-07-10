import { Eye } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import { VIDEO_MODE_DESCRIPTIONS, VIDEO_MODE_LABELS, type VideoMode } from '@aniquizz/shared';
import { SectionHeader, OptionButton } from './ConfigPrimitives';

const VIDEO_MODES: VideoMode[] = ['hidden', 'blurred', 'peek'];

interface VideoDisplaySectionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
}

export function VideoDisplaySection({ config, update }: VideoDisplaySectionProps) {
  const mode = config.videoMode ?? 'hidden';

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/10 p-3">
      <SectionHeader
        icon={Eye}
        title="Affichage vidéo"
        tooltip="Pendant le guess : comment l'extrait est présenté. La révélation montre toujours la vidéo complète. Les points ne changent pas."
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {VIDEO_MODES.map((id) => (
          <OptionButton
            key={id}
            active={mode === id}
            onClick={() => update({ videoMode: id })}
            className="flex flex-col items-start gap-1 p-3 text-left"
          >
            <span className="text-[11px] font-bold uppercase">{VIDEO_MODE_LABELS[id]}</span>
            <span className="text-[10px] leading-snug text-muted-foreground">{VIDEO_MODE_DESCRIPTIONS[id]}</span>
          </OptionButton>
        ))}
      </div>
    </div>
  );
}
