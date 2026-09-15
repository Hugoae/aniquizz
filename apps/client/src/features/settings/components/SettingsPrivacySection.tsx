import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { AccountPrivacy, LobbyInviteAudience, PrivacyAudience } from '@aniquizz/shared';
import { ACCOUNT_PRIVACY_DEFAULTS } from '@aniquizz/shared';
import { socket } from '@/lib/socket';
import { useAuth } from '@/features/auth/context/AuthContext';
import { SettingsChoiceRow, SettingsToggleRow } from '@/features/settings/components/SettingsField';
import { SETTINGS_COPY } from '@/features/settings/copy/settingsCopy';

const PRIVACY_ACK_MS = 8_000;
const PRIVACY_SYNC_ERROR = 'Impossible de mettre à jour la confidentialité.';
const RATE_LIMIT_ERROR = 'Trop de requêtes, veuillez patienter un instant.';

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
  const [privacy, setPrivacy] = useState<AccountPrivacy>(() => ACCOUNT_PRIVACY_DEFAULTS);

  useEffect(() => {
    setPrivacy({
      onlineStatusAudience:
        profile?.onlineStatusAudience ?? ACCOUNT_PRIVACY_DEFAULTS.onlineStatusAudience,
      matchHistoryAudience:
        profile?.matchHistoryAudience ?? ACCOUNT_PRIVACY_DEFAULTS.matchHistoryAudience,
      lobbyInviteAudience:
        profile?.lobbyInviteAudience ?? ACCOUNT_PRIVACY_DEFAULTS.lobbyInviteAudience,
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
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      socket.off('profile:privacy', onOk);
      socket.off('error', onErr);
      if (!ok) toast.error(SETTINGS_COPY.privacySyncError);
      void refreshProfile();
    };
    const onOk = () => finish(true);
    const onErr = (payload: { message?: string }) => {
      if (payload?.message !== PRIVACY_SYNC_ERROR && payload?.message !== RATE_LIMIT_ERROR) return;
      finish(false);
    };
    const timer = window.setTimeout(() => finish(false), PRIVACY_ACK_MS);
    socket.once('profile:privacy', onOk);
    socket.on('error', onErr);
  };

  return (
    <section aria-labelledby="settings-privacy-heading">
      <h3 id="settings-privacy-heading" className="text-sm font-bold text-foreground">
        {SETTINGS_COPY.privacyHeading}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {SETTINGS_COPY.privacyHint}
      </p>

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
        <SettingsToggleRow
          id="settings-friend-requests"
          label={SETTINGS_COPY.allowFriendRequests}
          checked={privacy.allowFriendRequests}
          onCheckedChange={(allowFriendRequests) => patch({ allowFriendRequests })}
        />
      </div>
    </section>
  );
}
