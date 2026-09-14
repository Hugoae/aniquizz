/**
 * Profile page — serves both routes:
 *   /profile          → own profile (edit avatar, friends, password, list summary)
 *   /profile/:userId  → public profile (read-only, PublicFriendsList, relation actions)
 *
 * Data: own stats via profile:get_stats socket; public card via profile:get_public.
 */
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SeoHead } from '@/components/seo/SeoHead';
import { Button } from '@/components/ui/button';
import { FloatingSettingsButton } from '@/features/settings/components/FloatingSettingsButton';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { ProfileStatsSection } from '@/features/profile/components/ProfileStatsSection';
import { ProfileFavoriteSongsSection } from '@/features/profile/components/ProfileFavoriteSongsSection';
import { AvatarCropDialog } from '@/features/profile/components/AvatarCropDialog';
import { PasswordDialog } from '@/features/profile/components/PasswordDialog';
import { DeleteAccountDialog } from '@/features/profile/components/DeleteAccountDialog';
import { MatchHistory } from '@/features/profile/components/MatchHistory';
import { ProfileSkeleton } from '@/features/profile/components/ProfileSkeleton';
import { ProfilePokedexSection } from '@/features/profile/components/ProfilePokedexSection';
import { ProfileAchievementsSection } from '@/features/profile/components/ProfileAchievementsSection';
import { ProfilePageShell } from '@/features/profile/components/ProfilePageShell';
import {
  ProfileOwnLoadFailed,
  ProfilePublicUnavailable,
} from '@/features/profile/components/ProfileUnavailable';
import { FriendsPanel } from '@/features/friends/FriendsPanel';
import { PublicFriendsList } from '@/features/friends/PublicFriendsList';
import { useProfilePage } from '@/features/profile/hooks/useProfilePage';

export default function Profile() {
  const navigate = useNavigate();
  const p = useProfilePage();

  if (!p.isOwn && p.publicData?.unavailable) {
    return <ProfilePublicUnavailable backLabel={p.unavailableBackLabel} onBack={p.handleBack} />;
  }

  if (p.isOwn && p.authReady && p.user && !p.profile && p.profileFailed && !p.profileLoading) {
    return <ProfileOwnLoadFailed onRetry={() => void p.refreshProfile()} />;
  }

  if (!p.vm) {
    return (
      <ProfilePageShell>
        <ProfileSkeleton />
      </ProfilePageShell>
    );
  }

  return (
    <>
      <SeoHead title={`Profil ${p.vm.username}`} noindex />

      <ProfilePageShell mainClassName="space-y-8">
        <Button
          variant="ghost"
          onClick={p.handleBack}
          className="gap-2 mb-2 text-muted-foreground hover:text-foreground pl-0"
        >
          <ArrowLeft className="h-4 w-4" />
          {p.backLabel}
        </Button>

        <ProfileHeader
          vm={p.vm}
          isOwn={p.isOwn}
          relation={p.relation}
          isEditingUsername={p.isEditingUsername}
          newUsername={p.newUsername}
          isSaving={p.isSaving}
          onStartEditUsername={() => p.setIsEditingUsername(true)}
          onChangeNewUsername={p.setNewUsername}
          onSaveUsername={p.saveUsername}
          onCancelEditUsername={() => {
            p.setIsEditingUsername(false);
            p.setNewUsername(p.vm!.username);
          }}
          onPickAvatarFile={p.onFileChange}
          onOpenPasswordModal={() => p.setShowPasswordModal(true)}
          onOpenDeleteAccountModal={() => p.setShowDeleteAccountModal(true)}
          onSignOut={p.signOut}
          onAddFriend={p.addById}
          onBlock={p.block}
          onRemoveFriend={p.remove}
          onUnblock={p.unblock}
        />

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-9 space-y-8">
            <ProfileStatsSection vm={p.vm} />
            <ProfileFavoriteSongsSection
              profileId={p.vm.id}
              isOwn={p.isOwn}
              username={p.vm.username}
            />
            <ProfilePokedexSection
              discoveredSongs={p.vm.discoveredSongs}
              progressPercent={p.vm.progressPercent}
              totalSongs={p.vm.totalSongs}
            />
            <ProfileAchievementsSection />
          </div>

          <div
            id="amis"
            className="col-span-12 lg:col-span-3 space-y-8 scroll-mt-24 animate-fade-in"
            style={{ animationDelay: '120ms' }}
          >
            {p.isOwn ? (
              <FriendsPanel />
            ) : (
              <PublicFriendsList friends={p.vm.friends} onOpen={p.openProfile} />
            )}
            <MatchHistory entries={p.vm.history} redacted={Boolean(p.vm.historyRedacted)} />
          </div>
        </div>
      </ProfilePageShell>

      {p.isOwn && (
        <>
          <AvatarCropDialog
            open={p.showCropModal}
            onOpenChange={p.setShowCropModal}
            image={p.selectedFile}
            isSaving={p.isSaving}
            onConfirm={p.uploadAvatar}
          />

          <PasswordDialog
            open={p.showPasswordModal}
            onOpenChange={p.setShowPasswordModal}
            userEmail={p.user?.email}
          />

          <DeleteAccountDialog
            open={p.showDeleteAccountModal}
            onOpenChange={p.setShowDeleteAccountModal}
            username={p.vm.username}
            userEmail={p.user?.email}
            onDeleted={async () => {
              await p.signOut();
              navigate('/');
            }}
          />
        </>
      )}
      <FloatingSettingsButton />
    </>
  );
}
