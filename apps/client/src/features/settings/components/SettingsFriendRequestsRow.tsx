import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useFriends } from '@/features/friends/FriendsContext';
import { SETTINGS_COPY } from '@/features/settings/copy/settingsCopy';

/** Isolated so Home can lazy-load FriendsContext instead of bundling it into the settings widget. */
export default function SettingsFriendRequestsRow() {
  const { allowFriendRequests, setPrivacy } = useFriends();

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border/50 bg-secondary/20 px-3 py-3">
      <Label htmlFor="settings-friend-requests" className="text-sm font-medium leading-snug">
        {SETTINGS_COPY.allowFriendRequests}
      </Label>
      <Switch
        id="settings-friend-requests"
        checked={allowFriendRequests}
        onCheckedChange={setPrivacy}
      />
    </div>
  );
}
