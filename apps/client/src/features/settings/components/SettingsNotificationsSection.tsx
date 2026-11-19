import { usePlayerPrefs } from '@/features/settings/context/PlayerPrefsContext';
import { SettingsToggleRow } from '@/features/settings/components/SettingsField';
import { useSettingsCopy } from '@/features/settings/copy/settingsCopy';

export function SettingsNotificationsSection() {
  const {
    friendRequestVisual,
    friendRequestSound,
    lobbyInviteVisual,
    lobbyInviteSound,
    audioMuted,
    patchPrefs,
  } = usePlayerPrefs();
  const copy = useSettingsCopy();

  return (
    <section
      aria-labelledby="settings-notifications-heading"
      className="border-t border-border/60 pt-5"
    >
      <h3 id="settings-notifications-heading" className="text-sm font-bold text-foreground">
        {copy.notificationsHeading}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{copy.notificationsHint}</p>
      {audioMuted ? <p className="mt-2 text-xs text-warning">{copy.soundsMutedHint}</p> : null}
      <div className="mt-3 space-y-3">
        <SettingsToggleRow
          id="settings-fr-visual"
          label={copy.friendRequestVisual}
          checked={friendRequestVisual}
          onCheckedChange={(checked) => patchPrefs({ friendRequestVisual: checked })}
        />
        <SettingsToggleRow
          id="settings-fr-sound"
          label={copy.friendRequestSound}
          checked={friendRequestSound}
          onCheckedChange={(checked) => patchPrefs({ friendRequestSound: checked })}
        />
        <SettingsToggleRow
          id="settings-invite-visual"
          label={copy.lobbyInviteVisual}
          checked={lobbyInviteVisual}
          onCheckedChange={(checked) => patchPrefs({ lobbyInviteVisual: checked })}
        />
        <SettingsToggleRow
          id="settings-invite-sound"
          label={copy.lobbyInviteSound}
          checked={lobbyInviteSound}
          onCheckedChange={(checked) => patchPrefs({ lobbyInviteSound: checked })}
        />
      </div>
    </section>
  );
}
