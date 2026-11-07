import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { ProfileView } from '@/features/profile/components/ProfileView';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { adminApi, type AdminUserProfile } from '@/lib/adminApi';
import { errorMessage } from './roomsPanelModel';

/** Fetches and shows the real profile of a room player (same as the profile page). */
export function PlayerProfileDialog({
  player,
  onClose,
}: {
  player: { userId: string; connected: boolean } | null;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<AdminUserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!player) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    adminApi
      .getUserProfile(player.userId)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((e) => toast.error(errorMessage(e)))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [player]);

  return (
    <Dialog open={!!player} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profil du joueur</DialogTitle>
        </DialogHeader>
        {loading || !profile || !player ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ProfileView
            username={profile.username}
            avatar={profile.avatar}
            role={profile.role}
            anilistUsername={profile.anilistUsername}
            malUsername={profile.malUsername}
            presenceLabel={player.connected ? 'Dans le salon' : 'Déconnecté'}
            presenceColor={player.connected ? 'bg-success' : 'bg-muted-foreground/30'}
            presenceOnline={player.connected}
            stats={profile.stats}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
