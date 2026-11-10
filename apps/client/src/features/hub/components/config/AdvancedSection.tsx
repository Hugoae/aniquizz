import type { RoomConfig } from '@aniquizz/shared';
import { VideoDisplaySection } from './VideoDisplaySection';
import { SongStartSection } from './SongStartSection';
import { SoloInstantRevealOption } from './SoloInstantRevealOption';
import { TimeAttackRevealOption } from './TimeAttackRevealOption';

interface AdvancedSectionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
}

/** Video display + song start — merged under the Avancée nav section. */
export function AdvancedSection({ config, update }: AdvancedSectionProps) {
  const timeAttack = config.gameType === 'timeAttack';
  const evolving = config.gameType === 'evolving';
  return (
    <div className="space-y-4">
      {evolving ? null : <VideoDisplaySection config={config} update={update} />}
      <SongStartSection config={config} update={update} />
      {timeAttack ? <TimeAttackRevealOption config={config} update={update} /> : null}
      {!timeAttack && !evolving && config.mode === 'solo' ? (
        <SoloInstantRevealOption config={config} update={update} />
      ) : null}
    </div>
  );
}
