import type { RoomConfig } from '@aniquizz/shared';
import { VideoDisplaySection } from './VideoDisplaySection';
import { SongStartSection } from './SongStartSection';

interface AdvancedSectionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
}

/** Video display + song start — merged under the Avancée nav section. */
export function AdvancedSection({ config, update }: AdvancedSectionProps) {
  return (
    <div className="space-y-4">
      <VideoDisplaySection config={config} update={update} />
      <SongStartSection config={config} update={update} />
    </div>
  );
}
