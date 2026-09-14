import { useMemo, useRef } from 'react';
import {
  LogOut, Loader2, Camera, Check, X, Edit2, CalendarDays,
  Clock, UserPlus, UserMinus, Ban, MoreVertical, KeyRound, Sword, Gavel, Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { levelProgress, type WatchedListProvider } from '@aniquizz/shared';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { presenceLabel, formatLastSeen, PRESENCE_DOT } from '@/features/friends/presence';
import type { Relation } from '@/features/friends/FriendsContext';
import type { ProfileVM } from '@/features/profile/types';
import { openSettings } from '@/features/settings/lib/openSettings';
import { SETTINGS_COPY } from '@/features/settings/copy/settingsCopy';
import { useLists } from '@/features/settings/integrations/listsContextValue';

const ANILIST_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/6/61/AniList_logo.svg';
const MAL_LOGO = '/logos/mal.png';

const PROVIDER_LABEL: Record<WatchedListProvider, string> = {
  anilist: 'AniList',
  mal: 'MyAnimeList',
};

const ROLE_META: Record<string, { label: string; className: string; icon: LucideIcon }> = {
  ADMIN: { label: 'Admin', className: 'text-destructive border-destructive/40 bg-destructive/10', icon: Sword },
  MODERATOR: { label: 'Modérateur', className: 'text-info border-info/40 bg-info/10', icon: Gavel },
};

const getAvatarSrc = (avatar: string) => (avatar.startsWith('http') ? avatar : undefined);

function ProviderLogo({ provider, className }: { provider: WatchedListProvider; className?: string }) {
  const src = provider === 'anilist' ? ANILIST_LOGO : MAL_LOGO;
  return (
    <img
      src={src}
      alt=""
      className={cn('h-3.5 w-3.5', provider === 'mal' && 'rounded-sm', className)}
    />
  );
}

function ListProviderBadge({ provider, username }: { provider: WatchedListProvider; username: string }) {
  return (
    <>
      <ProviderLogo provider={provider} />
      <span className="max-w-[120px] truncate font-semibold">{username}</span>
    </>
  );
}

interface ProfileHeaderProps {
  vm: ProfileVM;
  isOwn: boolean;
  relation: Relation;
  isEditingUsername: boolean;
  newUsername: string;
  isSaving: boolean;
  onStartEditUsername: () => void;
  onChangeNewUsername: (value: string) => void;
  onSaveUsername: () => void;
  onCancelEditUsername: () => void;
  onPickAvatarFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenPasswordModal: () => void;
  onOpenDeleteAccountModal: () => void;
  onSignOut: () => void;
  onAddFriend: (id: string) => void;
  onBlock: (id: string) => void;
  onRemoveFriend: (id: string) => void;
  onUnblock: (id: string) => void;
}

export function ProfileHeader({
  vm, isOwn, relation,
  isEditingUsername, newUsername, isSaving,
  onStartEditUsername, onChangeNewUsername, onSaveUsername, onCancelEditUsername,
  onPickAvatarFile,
  onOpenPasswordModal, onOpenDeleteAccountModal, onSignOut,
  onAddFriend, onBlock, onRemoveFriend, onUnblock,
}: ProfileHeaderProps) {
  const { status: listsStatus } = useLists();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lvl = useMemo(() => levelProgress(vm.xp), [vm.xp]);
  const roleMeta = ROLE_META[vm.role];
  const anilistUsername = listsStatus.anilist.username;
  const malUsername = listsStatus.mal.username;
  const activeListProvider = listsStatus.active;
  const anilistLinked = listsStatus.anilist.linked;
  const malLinked = listsStatus.mal.linked;

  const memberSince = useMemo(() => {
    if (!vm.createdAt) return null;
    try {
      return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(vm.createdAt));
    } catch {
      return null;
    }
  }, [vm.createdAt]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-card border border-border p-8 shadow-elevated animate-fade-in">
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />

      {isOwn && (
        <div className="absolute top-4 right-4 z-20">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" aria-label="Actions du profil">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onOpenPasswordModal} className="gap-2">
                <KeyRound className="h-4 w-4" /> Changer de mot de passe
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onSignOut}
                className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="h-4 w-4" /> Déconnexion
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onOpenDeleteAccountModal}
                className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" /> Supprimer mon compte
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">

        <div className="flex flex-col items-center gap-2 shrink-0">
          {isOwn ? (
            <button
              type="button"
              className="relative group cursor-pointer rounded-full border-0 bg-transparent p-0"
              aria-label={`Modifier l'avatar de ${vm.username}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div
                className="rounded-full p-[3px]"
                style={{
                  background: `conic-gradient(hsl(var(--primary)), hsl(var(--accent)) ${lvl.percent}%, hsl(var(--secondary)) ${lvl.percent}%)`,
                }}
              >
                <div className="rounded-full bg-background p-[3px]">
                  <Avatar className="h-28 w-28 relative">
                    <AvatarImage
                      src={getAvatarSrc(vm.avatar)}
                      alt={`Avatar de ${vm.username}`}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-secondary text-4xl font-bold text-secondary-foreground">{vm.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <div className="absolute inset-[3px] rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-8 w-8 text-foreground" aria-hidden />
              </div>
              <span className="absolute bottom-0 right-0 flex h-8 min-w-[32px] items-center justify-center rounded-full border-4 border-card bg-accent px-1.5 font-mono text-sm font-bold text-accent-foreground">
                {lvl.level}
              </span>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onPickAvatarFile} aria-hidden tabIndex={-1} />
            </button>
          ) : (
            <div className="relative">
              <div
                className="rounded-full p-[3px]"
                style={{
                  background: `conic-gradient(hsl(var(--primary)), hsl(var(--accent)) ${lvl.percent}%, hsl(var(--secondary)) ${lvl.percent}%)`,
                }}
              >
                <div className="rounded-full bg-background p-[3px]">
                  <UserAvatar avatar={vm.avatar} username={vm.username} className="h-28 w-28" loading="eager" />
                </div>
              </div>
              <span className="absolute bottom-0 right-0 flex h-8 min-w-[32px] items-center justify-center rounded-full border-4 border-card bg-accent px-1.5 font-mono text-sm font-bold text-accent-foreground">
                {lvl.level}
              </span>
            </div>
          )}
          <span className="font-mono text-xs text-muted-foreground">
            {lvl.xpForNextLevel > 0 ? `${lvl.xpIntoLevel} / ${lvl.xpForNextLevel} XP` : 'Niveau max'}
          </span>
        </div>

        <div className="flex-1 space-y-3 py-1 w-full min-w-0">
          <div className="flex flex-col md:flex-row items-center md:items-center gap-3 min-h-[48px]">
            {isOwn && isEditingUsername ? (
              <div className="flex items-center gap-2 animate-fade-in w-full md:w-auto">
                <Input value={newUsername} onChange={(e) => onChangeNewUsername(e.target.value)} className="text-2xl font-bold h-10 w-full md:w-64" maxLength={15} autoFocus />
                <Button size="icon" onClick={onSaveUsername} disabled={isSaving} aria-label="Enregistrer le pseudo" className="h-10 w-10 shrink-0 bg-success text-success-foreground hover:bg-success/90">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-5 w-5" aria-hidden />}
                </Button>
                <Button size="icon" variant="ghost" onClick={onCancelEditUsername} aria-label="Annuler la modification du pseudo" className="h-10 w-10 shrink-0"><X className="h-5 w-5" aria-hidden /></Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black tracking-tight">{vm.username}</h1>
                {roleMeta && (
                  <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md border', roleMeta.className)}>
                    <roleMeta.icon className="h-3.5 w-3.5" />
                    {roleMeta.label}
                  </span>
                )}
                {isOwn && (
                  <Button variant="ghost" size="icon" aria-label="Modifier le pseudo" className="h-8 w-8 text-muted-foreground/50 hover:text-primary transition-colors" onClick={onStartEditUsername}><Edit2 className="h-4 w-4" aria-hidden /></Button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            {memberSince && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" /> Membre depuis {memberSince}
              </span>
            )}
            {isOwn && (
              <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                {anilistLinked ? (
                  <span
                    className={cn(
                      'inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs',
                      activeListProvider === 'anilist'
                        ? 'border-info/30 bg-info/10 text-info'
                        : 'border-border/50 bg-secondary/40 text-muted-foreground',
                    )}
                    title={PROVIDER_LABEL.anilist}
                  >
                    <ListProviderBadge provider="anilist" username={anilistUsername!.trim()} />
                    {activeListProvider === 'anilist' ? (
                      <span className="font-medium">{SETTINGS_COPY.listActive}</span>
                    ) : null}
                  </span>
                ) : null}
                {malLinked ? (
                  <span
                    className={cn(
                      'inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs',
                      activeListProvider === 'mal'
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-border/50 bg-secondary/40 text-muted-foreground',
                    )}
                    title={PROVIDER_LABEL.mal}
                  >
                    <ListProviderBadge provider="mal" username={malUsername!.trim()} />
                    {activeListProvider === 'mal' ? (
                      <span className="font-medium">{SETTINGS_COPY.listActive}</span>
                    ) : null}
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-xs"
                  onClick={() => openSettings('account')}
                >
                  {SETTINGS_COPY.integrationsManage}
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center md:justify-start gap-2 text-sm font-medium">
            {isOwn ? (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
                </span>
                <span className="text-success">En ligne</span>
              </>
            ) : (
              <>
                <span className={cn('h-2.5 w-2.5 rounded-full', PRESENCE_DOT[vm.status])} />
                <span className="text-muted-foreground">
                  {vm.status === 'offline' ? formatLastSeen(vm.lastSeenAt) : presenceLabel(vm.status)}
                </span>
              </>
            )}
          </div>

        </div>

        {!isOwn && (
          <div className="flex flex-col gap-2 md:min-w-[160px]">
            {relation === 'none' && (
              <>
                <Button variant="glow" className="gap-2" onClick={() => onAddFriend(vm.id)}>
                  <UserPlus className="h-4 w-4" /> Ajouter en ami
                </Button>
                <Button variant="outline" className="gap-2 text-muted-foreground hover:text-destructive" onClick={() => onBlock(vm.id)}>
                  <Ban className="h-4 w-4" /> Bloquer
                </Button>
              </>
            )}
            {relation === 'incoming' && (
              <Button variant="glow" className="gap-2" onClick={() => onAddFriend(vm.id)}>
                <Check className="h-4 w-4" /> Accepter la demande
              </Button>
            )}
            {relation === 'outgoing' && (
              <Button variant="outline" disabled className="gap-2">
                <Clock className="h-4 w-4" /> Demande envoyée
              </Button>
            )}
            {relation === 'friends' && (
              <Button variant="outline" className="gap-2 text-muted-foreground hover:text-destructive" onClick={() => onRemoveFriend(vm.id)}>
                <UserMinus className="h-4 w-4" /> Retirer
              </Button>
            )}
            {relation === 'blocked' && (
              <Button variant="outline" className="gap-2" onClick={() => onUnblock(vm.id)}>
                Débloquer
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
