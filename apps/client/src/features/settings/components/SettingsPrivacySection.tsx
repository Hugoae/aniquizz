import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { AccountPrivacy, LobbyInviteAudience, PrivacyAudience } from '@aniquizz/shared';
import { ACCOUNT_PRIVACY_DEFAULTS } from '@aniquizz/shared';
import { socket } from '@/lib/socket';
import { useAuth } from '@/features/auth/context/AuthContext';
import { SettingsChoiceRow, SettingsToggleRow } from '@/features/settings/components/SettingsField';
import { useSettingsCopy } from '@/features/settings/copy/settingsCopy';

const PRIVACY_ACK_MS = 8_000;
const PRIVACY_SYNC_ERROR = 'Impossible de mettre à jour la confidentialité.';
const RATE_LIMIT_ERROR = 'Trop de requêtes, veuillez patienter un instant.';

export function SettingsPrivacySection() {
  const { profile, refreshProfile } = useAuth();
  const copy = useSettingsCopy();
  const [privacy, setPrivacy] = useState<AccountPrivacy>(() => ACCOUNT_PRIVACY_DEFAULTS);
  const statusOptions = [
    { value: 'everyone' as const, label: copy.audienceEveryone },
    { value: 'friends' as const, label: copy.audienceFriends },
    { value: 'nobody' as const, label: copy.audienceNobody },
  ];
  const inviteOptions = [
    { value: 'friends' as const, label: copy.audienceFriends },
    { value: 'nobody' as const, label: copy.audienceNobody },
  ];

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
      if (!ok) toast.error(copy.privacySyncError);
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
        {copy.privacyHeading}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{copy.privacyHint}</p>

      <div className="mt-4 space-y-3">
        <SettingsChoiceRow<PrivacyAudience>
          legend={copy.statusAudience}
          value={privacy.onlineStatusAudience}
          options={statusOptions}
          onChange={(onlineStatusAudience) => patch({ onlineStatusAudience })}
        />
        <SettingsChoiceRow<PrivacyAudience>
          legend={copy.historyAudience}
          hint={copy.historyAudienceHint}
          value={privacy.matchHistoryAudience}
          options={statusOptions}
          onChange={(matchHistoryAudience) => patch({ matchHistoryAudience })}
        />
        <SettingsChoiceRow<LobbyInviteAudience>
          legend={copy.inviteAudience}
          value={privacy.lobbyInviteAudience}
          options={inviteOptions}
          onChange={(lobbyInviteAudience) => patch({ lobbyInviteAudience })}
        />
        <SettingsToggleRow
          id="settings-show-favorites"
          label={copy.showFavorites}
          checked={privacy.showFavoriteSongs}
          onCheckedChange={(showFavoriteSongs) => patch({ showFavoriteSongs })}
        />
        <SettingsToggleRow
          id="settings-friend-requests"
          label={copy.allowFriendRequests}
          checked={privacy.allowFriendRequests}
          onCheckedChange={(allowFriendRequests) => patch({ allowFriendRequests })}
        />
      </div>
    </section>
  );
}
