import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { type Area } from 'react-easy-crop';
import type { PublicProfile as PublicProfileData } from '@aniquizz/shared';
import { getProfileFromAdminState } from '@/features/admin/adminNavigation';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useFriends, type Relation } from '@/features/friends/FriendsContext';
import {
  getLeaderboardReturnMetric,
  leaderboardPath,
} from '@/features/leaderboard/lib/leaderboardNavigation';
import { LEADERBOARD_COPY } from '@/features/leaderboard/copy/leaderboardCopy';
import { PROFILE_COPY } from '@/features/profile/copy/profileCopy';
import {
  PUBLIC_PROFILE_LOAD_ERROR_EVENT,
  PUBLIC_PROFILE_LOAD_TIMEOUT_MS,
  unavailablePublicProfileView,
} from '@/features/profile/publicProfileLoad';
import {
  INITIAL_OWN_PROFILE_STATS,
  isOwnProfileStats,
  type OwnProfileStats,
  type ProfileVM,
} from '@/features/profile/types';
import {
  buildOwnProfileViewModel,
  buildPublicProfileViewModel,
} from '@/features/profile/lib/profileViewModel';
import { supabase } from '@/lib/supabase';
import { socket } from '@/lib/socket';
import { subscribeWhenSocketReady } from '@/lib/socketReady';
import { getCroppedImg } from '@/lib/canvasUtils';

export function useProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut, authReady, refreshProfile, profileFailed, profileLoading } =
    useAuth();
  const {
    addById,
    remove,
    block,
    unblock,
    relationOf,
    openProfile,
    loading: friendsLoading,
  } = useFriends();

  const isOwn = !userId || (!!user && userId === user.id);
  const fromAdmin = getProfileFromAdminState(location.state);
  const leaderboardMetric = getLeaderboardReturnMetric(location.state, location.search);

  const handleBack = () => {
    if (leaderboardMetric) {
      navigate(leaderboardPath(leaderboardMetric), { replace: true });
      return;
    }
    if (!isOwn && fromAdmin) {
      navigate('/admin', { state: fromAdmin.admin });
      return;
    }
    navigate(isOwn ? '/' : '/profile');
  };

  const backLabel = leaderboardMetric
    ? LEADERBOARD_COPY.backToBoard
    : isOwn
      ? PROFILE_COPY.backHome
      : fromAdmin
        ? PROFILE_COPY.backToAdmin
        : PROFILE_COPY.backToOwnProfile;

  const unavailableBackLabel = leaderboardMetric
    ? LEADERBOARD_COPY.backToBoard
    : fromAdmin
      ? PROFILE_COPY.backToAdmin
      : PROFILE_COPY.backToOwnProfile;

  const [statsData, setStatsData] = useState<OwnProfileStats>(INITIAL_OWN_PROFILE_STATS);
  const [publicData, setPublicData] = useState<PublicProfileData | null>(null);

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  useEffect(() => {
    if (authReady && user && userId && userId === user.id) navigate('/profile', { replace: true });
  }, [authReady, user, userId, navigate]);

  useEffect(() => {
    if (!isOwn || !authReady || !user || location.hash !== '#amis') return;
    const t = setTimeout(() => {
      document.getElementById('amis')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => clearTimeout(t);
  }, [isOwn, authReady, user, location.hash]);

  useEffect(() => {
    if (profile) setNewUsername(profile.username);
  }, [profile]);

  useEffect(() => {
    if (isOwn) refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwn]);

  const refreshProfileRef = useRef(refreshProfile);
  refreshProfileRef.current = refreshProfile;

  useEffect(() => {
    if (!isOwn) return;

    const onStats = (data: unknown) => {
      if (isOwnProfileStats(data)) setStatsData(data);
    };
    const onProfileUpdate = () => {
      toast.success(PROFILE_COPY.updatedToast);
      setIsSaving(false);
      setIsEditingUsername(false);
      refreshProfileRef.current();
    };
    const onError = (err: { message?: string }) => {
      toast.error(err?.message || PROFILE_COPY.genericErrorToast);
      setIsSaving(false);
    };
    const requestStats = () => {
      if (socket.connected) socket.emit('profile:get_stats');
    };

    socket.on('profile:stats', onStats);
    socket.on('user_profile', onProfileUpdate);
    socket.on('profile:error', onError);
    socket.on('error', onError);
    const stopReady = subscribeWhenSocketReady(socket, requestStats);

    return () => {
      stopReady();
      socket.off('profile:stats', onStats);
      socket.off('user_profile', onProfileUpdate);
      socket.off('profile:error', onError);
      socket.off('error', onError);
    };
  }, [isOwn]);

  useEffect(() => {
    if (isOwn || !userId) return;
    if (userId.startsWith('bot-')) {
      toast.error('Profil introuvable.');
      navigate('/');
      return;
    }
    setPublicData(null);

    const onPublic = (p: PublicProfileData) => {
      if (p.id === userId) setPublicData(p);
    };
    const onLoadError = () => {
      setPublicData(unavailablePublicProfileView(userId));
    };
    const request = () => {
      if (socket.connected) socket.emit('profile:get_public', { userId });
    };

    socket.on('profile:public', onPublic);
    socket.on(PUBLIC_PROFILE_LOAD_ERROR_EVENT, onLoadError);
    const stopReady = subscribeWhenSocketReady(socket, request);
    const timeout = window.setTimeout(() => {
      setPublicData((current) => current ?? unavailablePublicProfileView(userId));
    }, PUBLIC_PROFILE_LOAD_TIMEOUT_MS);

    return () => {
      stopReady();
      window.clearTimeout(timeout);
      socket.off('profile:public', onPublic);
      socket.off(PUBLIC_PROFILE_LOAD_ERROR_EVENT, onLoadError);
    };
  }, [isOwn, userId]);

  const vm: ProfileVM | null = useMemo(() => {
    if (isOwn) {
      if (!profile || !user) return null;
      return buildOwnProfileViewModel({
        userId: user.id,
        username: profile.username,
        avatar: profile.avatar,
        role: profile.role,
        xp: profile.xp,
        stats: statsData,
      });
    }
    if (!publicData) return null;
    return buildPublicProfileViewModel(publicData);
  }, [isOwn, profile, user, statsData, publicData]);

  const relation: Relation = !isOwn
    ? friendsLoading && publicData
      ? publicData.relation
      : userId
        ? relationOf(userId)
        : 'none'
    : 'self';

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error(PROFILE_COPY.imageTooLarge);
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        if (typeof reader.result === 'string') {
          setSelectedFile(reader.result);
          setShowCropModal(true);
        }
      });
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (area: Area) => {
    if (!selectedFile || !user) return;
    setIsSaving(true);
    try {
      const croppedImageBlob = await getCroppedImg(selectedFile, area);
      if (!croppedImageBlob) throw new Error(PROFILE_COPY.cropError);

      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedImageBlob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);
      socket.emit('update_profile_data', { avatarUrl: `${publicUrl}?v=${Date.now()}` });
      setShowCropModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : PROFILE_COPY.uploadError);
      setIsSaving(false);
    }
  };

  const saveUsername = () => {
    const username = newUsername.trim();
    if (!username) return;
    socket.emit('update_profile_data', { username });
    setIsSaving(true);
  };

  return {
    isOwn,
    vm,
    publicData,
    relation,
    authReady,
    user,
    profile,
    profileFailed,
    profileLoading,
    isEditingUsername,
    setIsEditingUsername,
    newUsername,
    setNewUsername,
    isSaving,
    showPasswordModal,
    setShowPasswordModal,
    showDeleteAccountModal,
    setShowDeleteAccountModal,
    selectedFile,
    showCropModal,
    setShowCropModal,
    handleBack,
    backLabel,
    unavailableBackLabel,
    onFileChange,
    uploadAvatar,
    saveUsername,
    addById,
    remove,
    block,
    unblock,
    openProfile,
    signOut,
    refreshProfile,
  };
}
