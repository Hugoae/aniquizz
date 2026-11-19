import type { MotionMode } from '@aniquizz/shared';
import { usePlayerPrefs } from '@/features/settings/context/PlayerPrefsContext';
import { SettingsChoiceRow } from '@/features/settings/components/SettingsField';
import { useSettingsCopy } from '@/features/settings/copy/settingsCopy';

export function SettingsMotionSection() {
  const { motionMode, setMotionMode } = usePlayerPrefs();
  const copy = useSettingsCopy();
  const motionOptions = [
    { value: 'auto' as const, label: copy.motionAuto },
    { value: 'reduced' as const, label: copy.motionReduced },
    { value: 'full' as const, label: copy.motionFull },
  ];

  return (
    <section aria-labelledby="settings-motion-heading">
      <h3 id="settings-motion-heading" className="text-sm font-bold text-foreground">
        {copy.motionHeading}
      </h3>
      <div className="mt-3">
        <SettingsChoiceRow<MotionMode>
          legend={copy.motionHeading}
          hint={copy.motionHint}
          value={motionMode}
          options={motionOptions}
          onChange={setMotionMode}
        />
      </div>
    </section>
  );
}
