import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  SETTINGS_SEGMENTED_OPTION,
  SETTINGS_SEGMENTED_TRACK,
  settingsSegmentedOptionState,
} from '@/features/settings/components/settingsSegmented';

interface SettingsToggleRowProps {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function SettingsToggleRow({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
}: SettingsToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-secondary/20 px-3 py-3">
      <Label htmlFor={id} className="text-sm font-medium leading-snug">
        {label}
        {hint ? (
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{hint}</span>
        ) : null}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

interface SettingsChoiceOption<T extends string> {
  value: T;
  label: string;
}

interface SettingsChoiceRowProps<T extends string> {
  legend: string;
  hint?: string;
  value: T;
  options: readonly SettingsChoiceOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function SettingsChoiceRow<T extends string>({
  legend,
  hint,
  value,
  options,
  onChange,
  disabled = false,
}: SettingsChoiceRowProps<T>) {
  return (
    <fieldset className="rounded-lg border border-border/50 bg-secondary/20 px-3 py-3">
      <legend className="px-1 text-sm font-medium text-foreground">{legend}</legend>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      <div
        className={cn(SETTINGS_SEGMENTED_TRACK, 'mt-3')}
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
        role="radiogroup"
        aria-label={legend}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={cn(
                SETTINGS_SEGMENTED_OPTION,
                settingsSegmentedOptionState(selected),
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
