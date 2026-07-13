import { Keyboard, Target, Timer } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { SectionHeader, OptionButton } from './ConfigPrimitives';
import { RESPONSE_MODES, PRECISION_OPTIONS, estimateMatchMinutes } from './formOptions';
import { FiltersSection } from './FiltersSection';

interface RulesSectionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
  toggleSoundType: (type: string) => void;
  toggleDifficulty: (id: string) => void;
}

export function RulesSection({ config, update, toggleSoundType, toggleDifficulty }: RulesSectionProps) {
  const estimatedMinutes = estimateMatchMinutes(config);
  const isSprint = config.gameType === 'sprint';
  const responseModes = isSprint ? RESPONSE_MODES.filter((mode) => mode.id === 'typing') : RESPONSE_MODES;

  return (
    <div className="space-y-3">
      {/* Sliders + estimated duration */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <Label>Sons</Label>
              <span className="font-mono font-bold text-primary">{config.soundCount}</span>
            </div>
            <Slider
              aria-label="Nombre de sons"
              value={[config.soundCount]}
              min={5}
              max={100}
              step={5}
              onValueChange={(v) => update({ soundCount: v[0] })}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <Label>Durée</Label>
              <span className="font-mono font-bold text-primary">{config.guessDuration}s</span>
            </div>
            <Slider
              aria-label="Durée de réponse en secondes"
              value={[config.guessDuration]}
              min={5}
              max={60}
              step={5}
              onValueChange={(v) => update({ guessDuration: v[0] })}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-accent">
          <Timer className="h-3.5 w-3.5" aria-hidden="true" />
          <span>≈ {estimatedMinutes} min de partie</span>
        </div>
      </div>

      <div className="space-y-2">
        <SectionHeader icon={Keyboard} title="Mode de réponse" tooltip="Comment les joueurs saisissent leur réponse." />
        <div className={cn('grid gap-2', isSprint ? 'grid-cols-1 max-w-[11rem]' : 'grid-cols-3')}>
          {responseModes.map(({ id, label, description, icon: Icon }) => (
            <OptionButton
              key={id}
              active={isSprint ? true : config.responseType === id}
              onClick={isSprint ? undefined : () => update({ responseType: id })}
              className={cn('flex flex-col items-center gap-1 p-2 text-center', isSprint && 'cursor-default')}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="text-[11px] font-bold uppercase">{label}</span>
              <span className="text-[9px] leading-tight text-muted-foreground">{description}</span>
            </OptionButton>
          ))}
        </div>
      </div>

      {/* Precision (only when typing is involved) */}
      {(isSprint || config.responseType !== 'qcm') && (
        <div className="space-y-2">
          <SectionHeader icon={Target} title="Précision" tooltip="Franchise = la saga suffit. Anime = la saison précise de l'anime est requise." />
          <div className="grid grid-cols-2 gap-2">
            {PRECISION_OPTIONS.map(({ id, label, description, icon: Icon }) => (
              <OptionButton
                key={id}
                active={config.precision === id}
                onClick={() => update({ precision: id })}
                className="p-2.5 text-left"
              >
                <div className="flex items-center gap-2 text-xs font-bold">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
                </div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{description}</div>
              </OptionButton>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-border/80 pt-4">
        <FiltersSection
          config={config}
          toggleSoundType={toggleSoundType}
          toggleDifficulty={toggleDifficulty}
        />
      </div>
    </div>
  );
}
