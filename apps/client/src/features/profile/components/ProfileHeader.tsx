import { useMemo, useRef } from 'react';
import { CalendarDays, Gavel, Sword } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { levelProgress, type WatchedListProvider } from '@aniquizz/shared';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { presenceLabel, formatLastSeen, PRESENCE_DOT } from '@/features/friends/presence';
import type { Relation } from '@/features/friends/FriendsContext';
import type { ProfileVM } from '@/features/profile/types';
import { PROFILE_COPY } from '@/features/profile/copy/profileCopy';
import { openSettings } from '@/features/settings/lib/openSettings';
import { SETTINGS_COPY } from '@/features/settings/copy/settingsCopy';
import { useLists } from '@/features/settings/integrations/listsContextValue';
import { ProfileAvatarBlock } from '@/features/profile/components/ProfileAvatarBlock';
import { ProfileOwnMenu } from '@/features/profile/components/ProfileOwnMenu';
import { ProfileRelationActions } from '@/features/profile/components/ProfileRelationActions';
import { ProfileUsernameEditor } from '@/features/profile/components/ProfileUsernameEditor';

const ANILIST_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/6/61/AniList_logo.svg';
const MAL_LOGO = '/logos/mal.png';

const PROVIDER_LABEL: Record<WatchedListProvider, string> = {
  anilist: 'AniList',
  mal: 'MyAnimeList',
};

const ROLE_META: Record<string, { label: string; className: string; icon: LucideIcon }> = {
  ADMIN: {
    label: 'Admin',
    className: 'text-destructive border-destructive/40 bg-destructive/10',
    icon: Sword,
  },
  MODERATOR: { label: 'Modérateur', className: 'text-info border-info/40 bg-info/10', icon: Gavel },
};

function ProviderLogo({
  provider,
  className,
}: {
  provider: WatchedListProvider;
  className?: string;
}) {
  const src = provider === 'anilist' ? ANILIST_LOGO : MAL_LOGO;
  return (
    <img
      src={src}
      alt=""
      className={cn('h-3.5 w-3.5', provider === 'mal' && 'rounded-sm', className)}
    />
  );
}

function ListProviderBadge({
  provider,
  username,
}: {
  provider: WatchedListProvider;
  username: string;
}) {
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
  vm,
  isOwn,
  relation,
  isEditingUsername,
  newUsername,
  isSaving,
  onStartEditUsername,
  onChangeNewUsername,
  onSaveUsername,
  onCancelEditUsername,
  onPickAvatarFile,
  onOpenPasswordModal,
  onOpenDeleteAccountModal,
  onSignOut,
  onAddFriend,
  onBlock,
  onRemoveFriend,
  onUnblock,
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
      return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(
        new Date(vm.createdAt),
      );
    } catch {
      return null;
    }
  }, [vm.createdAt]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-card border border-border p-8 shadow-elevated animate-fade-in">
      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />

      {isOwn && (
        <ProfileOwnMenu
          onOpenPasswordModal={onOpenPasswordModal}
          onOpenDeleteAccountModal={onOpenDeleteAccountModal}
          onSignOut={onSignOut}
        />
      )}

      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <ProfileAvatarBlock
            username={vm.username}
            avatar={vm.avatar}
            level={lvl.level}
            percent={lvl.percent}
            isOwn={isOwn}
            fileInputRef={fileInputRef}
            onPickAvatarFile={onPickAvatarFile}
          />
          <span className="font-mono text-xs text-muted-foreground">
            {lvl.xpForNextLevel > 0
              ? PROFILE_COPY.xpIntoLevel(lvl.xpIntoLevel, lvl.xpForNextLevel)
              : PROFILE_COPY.levelMax}
          </span>
        </div>

        <div className="flex-1 space-y-3 py-1 w-full min-w-0">
          <div className="flex flex-col md:flex-row items-center md:items-center gap-3 min-h-[48px]">
            {isOwn && isEditingUsername ? (
              <ProfileUsernameEditor
                username={vm.username}
                newUsername={newUsername}
                isEditing
                isSaving={isSaving}
                onStartEdit={onStartEditUsername}
                onChange={onChangeNewUsername}
                onSave={onSaveUsername}
                onCancel={onCancelEditUsername}
              />
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-4xl font-black tracking-tight">{vm.username}</h1>
                {roleMeta && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md border',
                      roleMeta.className,
                    )}
                  >
                    <roleMeta.icon className="h-3.5 w-3.5" />
                    {roleMeta.label}
                  </span>
                )}
                {isOwn && (
                  <ProfileUsernameEditor
                    username={vm.username}
                    newUsername={newUsername}
                    isEditing={false}
                    isSaving={isSaving}
                    onStartEdit={onStartEditUsername}
                    onChange={onChangeNewUsername}
                    onSave={onSaveUsername}
                    onCancel={onCancelEditUsername}
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
            {memberSince && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" /> {PROFILE_COPY.memberSince(memberSince)}
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
                <span className="text-success">{PROFILE_COPY.online}</span>
              </>
            ) : (
              <>
                <span className={cn('h-2.5 w-2.5 rounded-full', PRESENCE_DOT[vm.status])} />
                <span className="text-muted-foreground">
                  {vm.status === 'offline'
                    ? formatLastSeen(vm.lastSeenAt)
                    : presenceLabel(vm.status)}
                </span>
              </>
            )}
          </div>
        </div>

        {!isOwn && (
          <ProfileRelationActions
            profileId={vm.id}
            relation={relation}
            onAddFriend={onAddFriend}
            onBlock={onBlock}
            onRemoveFriend={onRemoveFriend}
            onUnblock={onUnblock}
          />
        )}
      </div>
    </div>
  );
}
