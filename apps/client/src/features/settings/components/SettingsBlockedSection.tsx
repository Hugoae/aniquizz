import { useState } from 'react';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useFriends } from '@/features/friends/FriendsContext';
import { useSettingsCopy } from '@/features/settings/copy/settingsCopy';

export function SettingsBlockedSection() {
  const { blocked, unblock } = useFriends();
  const copy = useSettingsCopy();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const pending = blocked.find((u) => u.id === pendingId) ?? null;

  return (
    <section aria-labelledby="settings-blocked-heading" className="border-t border-border/60 pt-5">
      <h3 id="settings-blocked-heading" className="text-sm font-bold text-foreground">
        {copy.blockedHeading}
      </h3>
      {blocked.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">{copy.blockedEmpty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {blocked.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-secondary/20 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <UserAvatar avatar={user.avatar} username={user.username} className="h-8 w-8" />
                <span className="truncate text-sm font-medium">{user.username}</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPendingId(user.id)}
              >
                {copy.blockedUnblock}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={Boolean(pending)} onOpenChange={(open) => !open && setPendingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.blockedConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending ? copy.blockedConfirmBody(pending.username) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) unblock(pending.id);
                setPendingId(null);
              }}
            >
              {copy.blockedUnblock}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
