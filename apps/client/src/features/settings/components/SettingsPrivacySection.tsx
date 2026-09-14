import { useEffect, useState } from 'react';
import type { AccountPrivacy, LobbyInviteAudience, PrivacyAudience } from '@aniquizz/shared';
import { ACCOUNT_PRIVACY_DEFAULTS } from '@aniquizz/shared';
import { socket } from '@/lib/socket';
import { useAuth } from '@/features/auth/context/AuthContext';
import { SettingsChoiceRow, SettingsToggleRow } from '@/features/settings/components/SettingsField';
import { SETTINGS_COPY } from '@/features/settings/copy/settingsCopy';
import { lazy, Suspense } from 'react';

const SettingsFriendRequestsRow = lazy(() => import('./SettingsFriendRequestsRow'));

const STATUS_OPTIONS = [
  { value: 'everyone' as const, label: SETTINGS_COPY.audienceEveryone },
  { value: 'friends' as const, label: SETTINGS_COPY.audienceFriends },
  { value: 'nobody' as const, label: SETTINGS_COPY.audienceNobody },
];

const INVITE_OPTIONS = [
  { value: 'friends' as const, label: SETTINGS_COPY.audienceFriends },
  { value: 'nobody' as const, label: SETTINGS_COPY.audienceNobody },
];

export function SettingsPrivacySection() {
  const { profile, refreshProfile } = useAuth();
  const [privacy, setPrivacy] = useState<AccountPrivacy>(() =>
    ACCOUNT_PRIVACY_DEFAULTS,
  );

  useEffect(() => {
    setPrivacy({
      onlineStatusAudience: profile?.onlineStatusAudience ?? ACCOUNT_PRIVACY_DEFAULTS.onlineStatusAudience,
      matchHistoryAudience: profile?.matchHistoryAudience ?? ACCOUNT_PRIVACY_DEFAULTS.matchHistoryAudience,
      lobbyInviteAudience: profile?.lobbyInviteAudience ?? ACCOUNT_PRIVACY_DEFAULTS.lobbyInviteAudience,
      showFavoriteSongs: profile?.showFavoriteSongs !== false,
      allowFriendRequests: profile?.allowFriendRequests !== false,
    });
  }, [
    profile?.onlineStatusAudience,
    profile?.matchHistoryAudience,
    profile?.lobbyInviteAudience,
    profile?.showFavoriteSongs,
    profile?.allowFriendRequests,
  ]);

  const patch = (next: Partial<AccountPrivacy>) => {
    setPrivacy((prev) => ({ ...prev, ...next }));
    socket.emit('profile:update_privacy', next);
    const onOk = () => {
      socket.off('profile:privacy', onOk);
      void refreshProfile();
    };
    socket.once('profile:privacy', onOk);
  };

  return (
    <section aria-labelledby="settings-privacy-heading">
      <h3 id="settings-privacy-heading" className="text-sm font-bold text-foreground">
        {SETTINGS_COPY.privacyHeading}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{SETTINGS_COPY.privacyHint}</p>

      <div className="mt-4 space-y-3">
        <SettingsChoiceRow<PrivacyAudience>
          legend={SETTINGS_COPY.statusAudience}
          value={privacy.onlineStatusAudience}
          options={STATUS_OPTIONS}
          onChange={(onlineStatusAudience) => patch({ onlineStatusAudience })}
        />
        <SettingsChoiceRow<PrivacyAudience>
          legend={SETTINGS_COPY.historyAudience}
          hint={SETTINGS_COPY.historyAudienceHint}
          value={privacy.matchHistoryAudience}
          options={STATUS_OPTIONS}
          onChange={(matchHistoryAudience) => patch({ matchHistoryAudience })}
        />
        <SettingsChoiceRow<LobbyInviteAudience>
          legend={SETTINGS_COPY.inviteAudience}
          value={privacy.lobbyInviteAudience}
          options={INVITE_OPTIONS}
          onChange={(lobbyInviteAudience) => patch({ lobbyInviteAudience })}
        />
        <SettingsToggleRow
          id="settings-show-favorites"
          label={SETTINGS_COPY.showFavorites}
          checked={privacy.showFavoriteSongs}
          onCheckedChange={(showFavoriteSongs) => patch({ showFavoriteSongs })}
        />
        <Suspense fallback={null}>
          <SettingsFriendRequestsRow />
        </Suspense>
      </div>
    </section>
  );
}
