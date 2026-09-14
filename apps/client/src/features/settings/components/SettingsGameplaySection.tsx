import { usePlayerPrefs } from '@/features/settings/context/PlayerPrefsContext';
import { SettingsToggleRow } from '@/features/settings/components/SettingsField';
import { SETTINGS_COPY } from '@/features/settings/copy/settingsCopy';

export function SettingsGameplaySection() {
  const { autofocusAnswer, submitOnEnter, soloAutoReveal, showShortcutReminder, patchPrefs } =
    usePlayerPrefs();

  return (
    <section aria-labelledby="settings-gameplay-heading">
      <h3 id="settings-gameplay-heading" className="text-sm font-bold text-foreground">
        {SETTINGS_COPY.gameplayHeading}
      </h3>
      <div className="mt-3 space-y-3">
        <SettingsToggleRow
          id="settings-autofocus"
          label={SETTINGS_COPY.autofocusLabel}
          hint={SETTINGS_COPY.autofocusHint}
          checked={autofocusAnswer}
          onCheckedChange={(checked) => patchPrefs({ autofocusAnswer: checked })}
        />
        <SettingsToggleRow
          id="settings-submit-enter"
          label={SETTINGS_COPY.submitOnEnterLabel}
          hint={SETTINGS_COPY.submitOnEnterHint}
          checked={submitOnEnter}
          onCheckedChange={(checked) => patchPrefs({ submitOnEnter: checked })}
        />
        <SettingsToggleRow
          id="settings-solo-reveal"
          label={SETTINGS_COPY.soloAutoRevealLabel}
          hint={SETTINGS_COPY.soloAutoRevealHint}
          checked={soloAutoReveal}
          onCheckedChange={(checked) => patchPrefs({ soloAutoReveal: checked })}
        />
        <SettingsToggleRow
          id="settings-shortcut-reminder"
          label={SETTINGS_COPY.shortcutReminderLabel}
          hint={SETTINGS_COPY.shortcutReminderHint}
          checked={showShortcutReminder}
          onCheckedChange={(checked) => patchPrefs({ showShortcutReminder: checked })}
        />
      </div>
    </section>
  );
}
