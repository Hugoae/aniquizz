/**
 * Profile page — serves both routes:
 *   /profile          → own profile (edit avatar, friends panel, AniList, password)
 *   /profile/:userId  → public profile (read-only, PublicFriendsList, relation actions)
 *
 * Data: own stats via profile:get_stats socket; public card via profile:get_public.
 * The view-model (ProfileVM) normalises both sources for ProfileHeader / ProfileStatsSection.
 */
import { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'sonner';
import { type Area } from 'react-easy-crop';

import { ArrowLeft, Disc, Music2, Medal, Award } from 'lucide-react';
import type { MatchHistoryEntry, PublicProfile as PublicProfileData } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';

import { Header } from '@/components/layout/Header';
import { ProfileHeader } from '@/features/profile/components/ProfileHeader';
import { ProfileStatsSection } from '@/features/profile/components/ProfileStatsSection';
import { AvatarCropDialog } from '@/features/profile/components/AvatarCropDialog';
import { AniListDialog } from '@/features/profile/components/AniListDialog';
import { PasswordDialog } from '@/features/profile/components/PasswordDialog';
import { MatchHistory } from '@/features/profile/components/MatchHistory';
import { ProfileSkeleton } from '@/features/profile/components/ProfileSkeleton';
import { FriendsPanel } from '@/features/friends/FriendsPanel';
import { PublicFriendsList } from '@/features/friends/PublicFriendsList';
import { collectionMedal, COLLECTION_MEDALS } from '@/features/profile/collectionMedal';
import type { ProfileVM } from '@/features/profile/types';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useFriends, type Relation } from '@/features/friends/FriendsContext';
import { supabase } from '@/lib/supabase';
import { socket } from '@/lib/socket';
import { getCroppedImg } from '@/lib/canvasUtils';

/** Self-only stats payload from `profile:get_stats`. */
interface StatsData {
  totalSongs: number;
  discoveredSongs: number;
  progressPercent: number;
  createdAt: string;
  xp: number;
  level: number;
  bestScore: number;
  scoreTotal: number;
  avgXpPerGame: number;
  avgAnswerMs: number | null;
  fastestAnswerMs: number | null;
  roundsPlayed: number;
  multiCount: number;
  soloCount: number;
  playtimeMs: number;
  history: MatchHistoryEntry[];
  stats: { gamesPlayed: number; winRate: number; accuracy: number; maxStreak: number; correctGuesses: number };
}

function isStatsData(data: unknown): data is StatsData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return typeof d.totalSongs === 'number' && typeof d.stats === 'object' && d.stats !== null;
}

const INITIAL_STATS: StatsData = {
  totalSongs: 0,
  discoveredSongs: 0,
  progressPercent: 0,
  createdAt: '',
  xp: 0,
  level: 0,
  bestScore: 0,
  scoreTotal: 0,
  avgXpPerGame: 0,
  avgAnswerMs: null,
  fastestAnswerMs: null,
  roundsPlayed: 0,
  multiCount: 0,
  soloCount: 0,
  playtimeMs: 0,
  history: [],
  stats: { gamesPlayed: 0, winRate: 0, accuracy: 0, maxStreak: 0, correctGuesses: 0 },
};

export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, signOut, loading: authLoading, refreshProfile } = useAuth();
  const {
    addById, remove, block, unblock, relationOf, openProfile, loading: friendsLoading,
  } = useFriends();

  const isOwn = !userId || (!!user && userId === user.id);

  const [statsData, setStatsData] = useState<StatsData>(INITIAL_STATS);
  const [publicData, setPublicData] = useState<PublicProfileData | null>(null);

  const [showAniListModal, setShowAniListModal] = useState(false);
  const [anilistName, setAnilistName] = useState('');
  const pendingAnilistRef = useRef<'link' | 'unlink' | null>(null);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  // Own profile lives on /profile — collapse /profile/:selfId into it.
  useEffect(() => {
    if (!authLoading && user && userId && userId === user.id) navigate('/profile', { replace: true });
  }, [authLoading, user, userId, navigate]);

  // Deep-link to the friends section (own profile only).
  useEffect(() => {
    if (!isOwn || authLoading || !user || location.hash !== '#amis') return;
    const t = setTimeout(() => {
      document.getElementById('amis')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => clearTimeout(t);
  }, [isOwn, authLoading, user, location.hash]);

  useEffect(() => {
    if (profile) {
      setAnilistName(profile.anilistUsername || '');
      setNewUsername(profile.username);
    }
  }, [profile]);

  // Refresh XP/level from the DB when opening our own profile.
  useEffect(() => {
    if (isOwn) refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwn]);

  // Self stats stream.
  useEffect(() => {
    if (!isOwn) return;
    if (!socket.connected) socket.connect();
    socket.emit('profile:get_stats');

    const onStats = (data: unknown) => {
      if (isStatsData(data)) setStatsData(data);
    };
    const onProfileUpdate = () => {
      const action = pendingAnilistRef.current;
      pendingAnilistRef.current = null;
      if (action === 'link') toast.success('Compte AniList lié !');
      else if (action === 'unlink') toast.success('Compte AniList délié.');
      else toast.success('Profil mis à jour !');
      setIsSaving(false); setIsEditingUsername(false); refreshProfile();
    };
    const onError = (err: { message?: string }) => {
      pendingAnilistRef.current = null;
      toast.error(err?.message || 'Une erreur est survenue'); setIsSaving(false);
    };

    socket.on('profile:stats', onStats);
    socket.on('user_profile', onProfileUpdate);
    socket.on('profile:error', onError);
    socket.on('error', onError);

    return () => {
      socket.off('profile:stats', onStats);
      socket.off('user_profile', onProfileUpdate);
      socket.off('profile:error', onError);
      socket.off('error', onError);
    };
  }, [isOwn, refreshProfile]);

  // Public profile stream (guards against stale responses when userId changes).
  useEffect(() => {
    if (isOwn || !userId) return;
    if (userId.startsWith('bot-')) {
      toast.error('Profil introuvable.');
      navigate('/');
      return;
    }
    setPublicData(null);

    const onPublic = (p: PublicProfileData) => { if (p.id === userId) setPublicData(p); };
    const onFriendsError = (err: { message?: string }) => {
      toast.error(err?.message || 'Profil introuvable.');
      navigate('/');
    };
    const request = () => socket.connected && socket.emit('profile:get_public', { userId });

    socket.on('profile:public', onPublic);
    socket.on('friends:error', onFriendsError);
    socket.on('connect', request);
    if (!socket.connected) socket.connect();
    request();

    return () => {
      socket.off('profile:public', onPublic);
      socket.off('friends:error', onFriendsError);
      socket.off('connect', request);
    };
  }, [isOwn, userId, navigate]);

  const vm: ProfileVM | null = useMemo(() => {
    if (isOwn) {
      if (!profile || !user) return null;
      return {
        id: user.id,
        username: profile.username,
        avatar: profile.avatar,
        role: profile.role,
        xp: profile.xp,
        createdAt: statsData.createdAt,
        status: 'online',
        lastSeenAt: null,
        totalSongs: statsData.totalSongs,
        discoveredSongs: statsData.discoveredSongs,
        progressPercent: statsData.progressPercent,
        bestScore: statsData.bestScore,
        scoreTotal: statsData.scoreTotal,
        avgXpPerGame: statsData.avgXpPerGame,
        avgAnswerMs: statsData.avgAnswerMs,
        fastestAnswerMs: statsData.fastestAnswerMs,
        roundsPlayed: statsData.roundsPlayed,
        multiCount: statsData.multiCount,
        soloCount: statsData.soloCount,
        playtimeMs: statsData.playtimeMs,
        stats: statsData.stats,
        history: statsData.history,
        friends: [],
      };
    }
    if (!publicData) return null;
    return {
      id: publicData.id,
      username: publicData.username,
      avatar: publicData.avatar,
      role: publicData.role,
      xp: publicData.xp,
      createdAt: publicData.createdAt,
      status: publicData.status,
      lastSeenAt: publicData.lastSeenAt,
      totalSongs: publicData.totalSongs,
      discoveredSongs: publicData.discoveredSongs,
      progressPercent: publicData.progressPercent,
      bestScore: publicData.bestScore,
      scoreTotal: publicData.scoreTotal,
      avgXpPerGame: publicData.avgXpPerGame,
      avgAnswerMs: publicData.avgAnswerMs,
      fastestAnswerMs: publicData.fastestAnswerMs,
      roundsPlayed: publicData.roundsPlayed,
      multiCount: publicData.multiCount,
      soloCount: publicData.soloCount,
      playtimeMs: publicData.playtimeMs,
      stats: publicData.stats,
      history: publicData.history,
      friends: publicData.friends,
    };
  }, [isOwn, profile, user, statsData, publicData]);

  const currentMedal = useMemo(() => collectionMedal(vm?.progressPercent ?? 0), [vm?.progressPercent]);

  const relation: Relation = !isOwn
    ? (friendsLoading && publicData ? publicData.relation : userId ? relationOf(userId) : 'none')
    : 'self';

  // All Profile writes go through the server (socket) so the client never
  // touches the table directly — the Profile RLS update policy is locked down.
  const handleLinkAnilist = () => {
    const name = anilistName.trim();
    if (!name || !user) return;
    pendingAnilistRef.current = 'link';
    socket.emit('update_profile_data', { anilistUsername: name });
    setShowAniListModal(false);
  };

  const handleUnlinkAnilist = () => {
    if (!user) return;
    pendingAnilistRef.current = 'unlink';
    socket.emit('update_profile_data', { anilistUsername: null });
    setAnilistName('');
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { toast.error("L'image est trop volumineuse (Max 5 Mo)"); return; }
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
      if (!croppedImageBlob) throw new Error('Erreur lors du recadrage');

      // Stable path per user: a new upload overwrites the previous avatar, so
      // there is always exactly one file per user (no orphaned images).
      const filePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedImageBlob, { upsert: true, contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      // Cache-busting: the path is stable, so force clients/CDN to refetch.
      socket.emit('update_profile_data', { avatarUrl: `${publicUrl}?v=${Date.now()}` });
      setShowCropModal(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur upload');
      setIsSaving(false);
    }
  };

  const saveUsername = () => {
    if (!newUsername.trim()) return;
    socket.emit('update_profile_data', { username: newUsername });
    setIsSaving(true);
  };

  if (!vm) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 container max-w-[1400px] mx-auto px-4">
          <ProfileSkeleton />
        </main>
      </div>
    );
  }

  return (
    <>
      <Helmet><title>Profil de {vm.username} - AniQuizz</title></Helmet>

      <div className="min-h-screen bg-background pb-20">
        <Header />

        <main className="pt-24 container max-w-[1400px] mx-auto px-4 space-y-8">

          <Button
            variant="ghost"
            onClick={() => navigate(isOwn ? '/' : '/profile')}
            className="gap-2 mb-2 text-muted-foreground hover:text-foreground pl-0"
          >
            <ArrowLeft className="h-4 w-4" />
            {isOwn ? "Retour à l'accueil" : 'Retour à mon profil'}
          </Button>

          <ProfileHeader
            vm={vm}
            isOwn={isOwn}
            relation={relation}
            anilistUsername={profile?.anilistUsername}
            isEditingUsername={isEditingUsername}
            newUsername={newUsername}
            isSaving={isSaving}
            onStartEditUsername={() => setIsEditingUsername(true)}
            onChangeNewUsername={setNewUsername}
            onSaveUsername={saveUsername}
            onCancelEditUsername={() => { setIsEditingUsername(false); setNewUsername(vm.username); }}
            onPickAvatarFile={onFileChange}
            onOpenAniList={() => setShowAniListModal(true)}
            onUnlinkAniList={handleUnlinkAnilist}
            onOpenPasswordModal={() => setShowPasswordModal(true)}
            onSignOut={signOut}
            onAddFriend={addById}
            onBlock={block}
            onRemoveFriend={remove}
            onUnblock={unblock}
          />

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-9 space-y-8">

              <ProfileStatsSection vm={vm} />

              {/* POKÉDEX */}
              <section className="space-y-4 animate-fade-in" style={{ animationDelay: '160ms' }}>
                <div className="flex items-center gap-2">
                  <Disc className="h-5 w-5 text-accent" />
                  <h2 className="text-xl font-bold">Pokédex Musical</h2>
                </div>

                <div className="bg-card border border-border rounded-xl p-6 shadow-card relative overflow-hidden">
                  <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-6 z-10 relative">
                    <div>
                      <div className="text-4xl font-black gradient-text">{vm.discoveredSongs}</div>
                      <div className="text-sm text-muted-foreground font-medium">Sons uniques découverts</div>
                    </div>
                    <span
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-secondary rounded-md text-xs font-bold border border-border"
                      style={{ color: currentMedal?.color }}
                    >
                      <Medal className="h-4 w-4" />
                      {currentMedal ? currentMedal.label : 'Non classé'}
                    </span>
                  </div>

                  <div className="space-y-2 z-10 relative">
                    {/* Medal caps above the bar */}
                    <div className="relative h-5">
                      {COLLECTION_MEDALS.map((m) => {
                        const reached = vm.progressPercent >= m.min;
                        return (
                          <div
                            key={m.key}
                            className="absolute -translate-x-1/2 flex flex-col items-center"
                            style={{ left: `${m.min}%` }}
                            title={`${m.label} · ${m.min}%`}
                          >
                            <Medal
                              className={`h-4 w-4 transition-colors ${reached ? '' : 'text-muted-foreground/30'}`}
                              style={reached ? { color: m.color } : undefined}
                              strokeWidth={reached ? 2.25 : 2}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="h-4 bg-secondary rounded-full overflow-hidden border border-border/60 relative">
                      <div
                        className="h-full bg-gradient-stage transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(vm.progressPercent, 100)}%` }}
                      />
                      {/* Vertical cap markers */}
                      {COLLECTION_MEDALS.filter((m) => m.min < 100).map((m) => (
                        <div
                          key={m.key}
                          className="absolute top-0 bottom-0 w-0.5 bg-background/70"
                          style={{ left: `${m.min}%` }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-xs font-mono text-muted-foreground">
                      <span>{vm.progressPercent}%</span>
                      <span>Total disponible : {vm.totalSongs}</span>
                    </div>
                  </div>
                  <div className="absolute top-[-20%] right-[-5%] p-8 opacity-5 pointer-events-none">
                    <Music2 className="h-64 w-64" />
                  </div>
                </div>
              </section>

              {/* ACHIEVEMENTS (coming soon) */}
              <section className="space-y-4 animate-fade-in" style={{ animationDelay: '240ms' }}>
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">Succès</h2>
                </div>
                <div className="rounded-xl border border-dashed border-border/70 bg-card/30 p-8 text-center">
                  <Award className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-3 text-sm font-semibold text-foreground">Bientôt disponible</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Une collection de succès illustrés arrive prochainement.
                  </p>
                </div>
              </section>
            </div>

            <div id="amis" className="col-span-12 lg:col-span-3 space-y-8 scroll-mt-24 animate-fade-in" style={{ animationDelay: '120ms' }}>
              {isOwn ? <FriendsPanel /> : <PublicFriendsList friends={vm.friends} onOpen={openProfile} />}
              <MatchHistory entries={vm.history} />
            </div>
          </div>
        </main>
      </div>

      {isOwn && (
        <>
          <AvatarCropDialog
            open={showCropModal}
            onOpenChange={setShowCropModal}
            image={selectedFile}
            isSaving={isSaving}
            onConfirm={uploadAvatar}
          />

          <AniListDialog
            open={showAniListModal}
            onOpenChange={(open) => { setShowAniListModal(open); if (!open) setAnilistName(profile?.anilistUsername || ''); }}
            value={anilistName}
            onChange={setAnilistName}
            onSave={handleLinkAnilist}
          />

          <PasswordDialog
            open={showPasswordModal}
            onOpenChange={setShowPasswordModal}
            userEmail={user?.email}
          />
        </>
      )}
    </>
  );
}
