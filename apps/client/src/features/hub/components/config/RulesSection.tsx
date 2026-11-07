import { Keyboard, Target, Timer, Zap } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { SectionHeader, OptionButton } from './ConfigPrimitives';
import {
  RESPONSE_MODES,
  PRECISION_OPTIONS,
  PRECISION_HELP,
  estimateMatchMinutes,
} from './formOptions';
import { FiltersSection } from './FiltersSection';
import { TimeAttackRules } from './TimeAttackRules';

interface RulesSectionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
  toggleSoundType: (type: string) => void;
  toggleDifficulty: (id: string) => void;
  /** Multi create/edit — Vitesse is a Standard modifier, not shown in solo. */
  showSpeedBonus?: boolean;
}

export function RulesSection({
  config,
  update,
  toggleSoundType,
  toggleDifficulty,
  showSpeedBonus = false,
}: RulesSectionProps) {
  const estimatedMinutes = estimateMatchMinutes(config);
  const typingOk = config.responseType === 'typing';
  const speedBonusOn = Boolean(showSpeedBonus && typingOk && config.speedBonusEnabled);
  const timeAttack = config.gameType === 'timeAttack';

  return (
    <div className="space-y-3">
      {timeAttack ? (
        <TimeAttackRules config={config} update={update} />
      ) : (
        <>
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
            <SectionHeader
              icon={Keyboard}
              title="Mode de réponse"
              tooltip="Comment les joueurs saisissent leur réponse."
            />
            <div className="grid grid-cols-3 gap-2">
              {RESPONSE_MODES.map(({ id, label, description, icon: Icon }) => (
                <OptionButton
                  key={id}
                  active={config.responseType === id}
                  onClick={() =>
                    update({
                      responseType: id,
                      speedBonusEnabled: id === 'typing' ? config.speedBonusEnabled : false,
                    })
                  }
                  className="flex flex-col items-center gap-1 p-2 text-center"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span className="text-[11px] font-bold uppercase">{label}</span>
                  <span className="text-[9px] leading-tight text-muted-foreground">
                    {description}
                  </span>
                </OptionButton>
              ))}
            </div>
            {showSpeedBonus ? (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card/40 px-3 py-2.5">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                    <Label
                      htmlFor="speed-bonus"
                      className="text-xs font-bold uppercase tracking-wide"
                    >
                      Vitesse
                    </Label>
                  </div>
                  <p
                    id="speed-bonus-help"
                    className="text-[11px] leading-snug text-muted-foreground"
                  >
                    {typingOk
                      ? 'Bonus de points si vous répondez plus vite que les autres (parmi les bonnes réponses).'
                      : 'Disponible uniquement en typing.'}
                  </p>
                </div>
                <Switch
                  id="speed-bonus"
                  checked={speedBonusOn}
                  disabled={!typingOk}
                  onCheckedChange={(checked) => update({ speedBonusEnabled: checked })}
                  aria-describedby="speed-bonus-help"
                />
              </div>
            ) : null}
          </div>
        </>
      )}

      <div className="space-y-2">
        <SectionHeader icon={Target} title="Précision" tooltip={PRECISION_HELP} />
        <div className="grid grid-cols-3 gap-2">
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
