import { usePlayerPrefs } from '@/features/settings/context/PlayerPrefsContext';
import { SettingsToggleRow } from '@/features/settings/components/SettingsField';
import { useSettingsCopy } from '@/features/settings/copy/settingsCopy';

export function SettingsGameplaySection() {
  const {
    autofocusAnswer,
    submitOnEnter,
    answerSounds,
    showShortcutReminder,
    configWalkthrough,
    patchPrefs,
  } = usePlayerPrefs();
  const copy = useSettingsCopy();

  return (
    <section aria-labelledby="settings-gameplay-heading">
      <h3 id="settings-gameplay-heading" className="text-sm font-bold text-foreground">
        {copy.gameplayHeading}
      </h3>
      <div className="mt-3 space-y-3">
        <SettingsToggleRow
          id="settings-config-walkthrough"
          label={copy.configWalkthroughLabel}
          hint={copy.configWalkthroughHint}
          checked={configWalkthrough}
          onCheckedChange={(checked) => patchPrefs({ configWalkthrough: checked })}
        />
        <SettingsToggleRow
          id="settings-autofocus"
          label={copy.autofocusLabel}
          hint={copy.autofocusHint}
          checked={autofocusAnswer}
          onCheckedChange={(checked) => patchPrefs({ autofocusAnswer: checked })}
        />
        <SettingsToggleRow
          id="settings-submit-enter"
          label={copy.submitOnEnterLabel}
          hint={copy.submitOnEnterHint}
          checked={submitOnEnter}
          onCheckedChange={(checked) => patchPrefs({ submitOnEnter: checked })}
        />
        <SettingsToggleRow
          id="settings-answer-sounds"
          label={copy.answerSoundsLabel}
          hint={copy.answerSoundsHint}
          checked={answerSounds}
          onCheckedChange={(checked) => patchPrefs({ answerSounds: checked })}
        />
        <SettingsToggleRow
          id="settings-shortcut-reminder"
          label={copy.shortcutReminderLabel}
          hint={copy.shortcutReminderHint}
          checked={showShortcutReminder}
          onCheckedChange={(checked) => patchPrefs({ showShortcutReminder: checked })}
        />
      </div>
    </section>
  );
}
