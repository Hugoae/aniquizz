import { UserPlus, UserMinus, Ban, ShieldCheck, Check, Trophy, Gamepad2, Star } from 'lucide-react';
import type { PublicProfile } from '@aniquizz/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { cn } from '@/lib/utils';
import { presenceLabel, formatLastSeen } from './presence';

const ROLE_META: Record<string, { label: string; className: string }> = {
  ADMIN: { label: 'Admin', className: 'text-red-400 border-red-400/40' },
  MODERATOR: { label: 'Modérateur', className: 'text-blue-400 border-blue-400/40' },
};

function Stat({ icon, label, value }: { icon: ReactNodeIcon; label: string; value: string | number }) {
  const Icon = icon;
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-white/5 p-3">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-lg font-bold leading-none">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}

type ReactNodeIcon = typeof Trophy;

interface Props {
  open: boolean;
  profile: PublicProfile | null;
  onOpenChange: (open: boolean) => void;
  onAdd: (userId: string) => void;
  onRemove: (userId: string) => void;
  onBlock: (userId: string) => void;
  onUnblock: (userId: string) => void;
  onAccept: (userId: string) => void;
}

export function PublicProfileDialog({
  open,
  profile,
  onOpenChange,
  onAdd,
  onRemove,
  onBlock,
  onUnblock,
  onAccept,
}: Props) {
  const role = profile ? ROLE_META[profile.role] : undefined;
  const winRate =
    profile && profile.gamesPlayed > 0
      ? Math.round((profile.gamesWon / profile.gamesPlayed) * 100)
      : 0;
  const memberSince = profile
    ? new Date(profile.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '';

  const close = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Profil</DialogTitle>
        </DialogHeader>

        {!profile ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            Chargement…
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="relative">
                <UserAvatar avatar={profile.avatar} username={profile.username} className="h-20 w-20" />
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground border-2 border-card">
                  Niv. {profile.level}
                </span>
              </div>
              <div className="mt-1">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-lg font-bold">{profile.username}</h3>
                  {role && (
                    <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold', role.className)}>
                      {role.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {profile.status === 'offline'
                    ? formatLastSeen(profile.lastSeenAt)
                    : presenceLabel(profile.status)}
                  {' · '}Membre depuis {memberSince}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <Stat icon={Gamepad2} label="Parties" value={profile.gamesPlayed} />
              <Stat icon={Trophy} label="Victoires" value={profile.gamesWon} />
              <Stat icon={Check} label="% Victoire" value={`${winRate}%`} />
              <Stat icon={Star} label="Record" value={profile.bestScore} />
            </div>

            {profile.relation !== 'self' && (
              <div className="flex flex-wrap gap-2 justify-center">
                {profile.relation === 'none' && (
                  <>
                    <Button size="sm" variant="glow" className="gap-1.5" onClick={() => { onAdd(profile.id); close(); }}>
                      <UserPlus className="h-4 w-4" /> Ajouter
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-red-400" onClick={() => { onBlock(profile.id); close(); }}>
                      <Ban className="h-4 w-4" /> Bloquer
                    </Button>
                  </>
                )}
                {profile.relation === 'incoming' && (
                  <Button size="sm" variant="glow" className="gap-1.5" onClick={() => { onAccept(profile.id); close(); }}>
                    <Check className="h-4 w-4" /> Accepter la demande
                  </Button>
                )}
                {profile.relation === 'outgoing' && (
                  <Button size="sm" variant="outline" disabled className="gap-1.5">
                    Demande envoyée
                  </Button>
                )}
                {profile.relation === 'friends' && (
                  <>
                    <span className="flex items-center gap-1.5 text-sm text-green-400">
                      <ShieldCheck className="h-4 w-4" /> Amis
                    </span>
                    <Button size="sm" variant="outline" className="gap-1.5 text-red-400" onClick={() => { onRemove(profile.id); close(); }}>
                      <UserMinus className="h-4 w-4" /> Retirer
                    </Button>
                  </>
                )}
                {profile.relation === 'blocked' && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { onUnblock(profile.id); close(); }}>
                    Débloquer
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
