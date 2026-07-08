import { Keyboard, Target, Timer } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { SectionHeader, OptionButton } from './ConfigPrimitives';
import { RESPONSE_MODES, PRECISION_OPTIONS, estimateMatchMinutes } from './formOptions';

interface RulesSectionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
}

export function RulesSection({ config, update }: RulesSectionProps) {
  const estimatedMinutes = estimateMatchMinutes(config);

  return (
    <div className="space-y-4">
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

      {/* Response mode */}
      <div className="space-y-2">
        <SectionHeader icon={Keyboard} title="Mode de réponse" tooltip="Comment les joueurs saisissent leur réponse." />
        <div className="grid grid-cols-3 gap-2">
          {RESPONSE_MODES.map(({ id, label, description, icon: Icon }) => (
            <OptionButton
              key={id}
              active={config.responseType === id}
              onClick={() => update({ responseType: id })}
              className="flex flex-col items-center gap-1 p-2 text-center"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="text-[11px] font-bold uppercase">{label}</span>
              <span className="text-[9px] leading-tight text-muted-foreground">{description}</span>
            </OptionButton>
          ))}
        </div>
      </div>

      {/* Precision (only when typing is involved) */}
      {config.responseType !== 'qcm' && (
        <div className="space-y-2">
          <SectionHeader icon={Target} title="Précision" tooltip="À quel point la réponse doit correspondre au titre attendu." />
          <div className="grid grid-cols-2 gap-2">
            {PRECISION_OPTIONS.map(({ id, label, description, icon: Icon }) => (
              <OptionButton
                key={id}
                active={config.precision === id}
                activeClassName="border-accent bg-accent/15 text-accent"
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
    </div>
  );
}
