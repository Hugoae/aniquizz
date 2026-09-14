import type { MotionMode } from '@aniquizz/shared';
import { usePlayerPrefs } from '@/features/settings/context/PlayerPrefsContext';
import { SettingsChoiceRow } from '@/features/settings/components/SettingsField';
import { SETTINGS_COPY } from '@/features/settings/copy/settingsCopy';

const MOTION_OPTIONS = [
  { value: 'auto' as const, label: SETTINGS_COPY.motionAuto },
  { value: 'reduced' as const, label: SETTINGS_COPY.motionReduced },
  { value: 'full' as const, label: SETTINGS_COPY.motionFull },
];

export function SettingsMotionSection() {
  const { motionMode, setMotionMode } = usePlayerPrefs();

  return (
    <section aria-labelledby="settings-motion-heading">
      <h3 id="settings-motion-heading" className="text-sm font-bold text-foreground">
        {SETTINGS_COPY.motionHeading}
      </h3>
      <div className="mt-3">
        <SettingsChoiceRow<MotionMode>
          legend={SETTINGS_COPY.motionHeading}
          hint={SETTINGS_COPY.motionHint}
          value={motionMode}
          options={MOTION_OPTIONS}
          onChange={setMotionMode}
        />
      </div>
    </section>
  );
}
