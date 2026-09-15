import { useState } from 'react';
import { Navigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { SeoHead } from '@/components/seo/SeoHead';
import { PAGE_TITLES } from '@/lib/site';
import { toast } from 'sonner';
import { hasRole } from '@aniquizz/shared';
import { Header } from '@/components/layout/Header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { ProfileRouteSkeleton } from '@/components/layout/RouteSkeletonFallback';
import { adminApi, AdminApiError } from '@/lib/adminApi';
import { UsersPanel } from '@/features/admin/components/UsersPanel';
import { RoomsPanel } from '@/features/admin/components/RoomsPanel';
import { CataloguePanel } from '@/features/admin/components/CataloguePanel';
import { DevToolsPanel } from '@/features/admin/components/DevToolsPanel';
import { StatsPanel } from '@/features/admin/components/StatsPanel';
import { SuggestionsPanel } from '@/features/admin/components/SuggestionsPanel';
import { PlaylistsPanel } from '@/features/admin/components/PlaylistsPanel';
import { DailyAdminPanel } from '@/features/admin/components/DailyAdminPanel';
import { AuditPanel } from '@/features/admin/components/AuditPanel';
import { getAdminPanelState, parseAdminTab } from '@/features/admin/adminNavigation';
import { ADMIN_COPY } from '@/features/admin/copy/adminCopy';

const IS_DEV = import.meta.env.DEV;

export default function Admin() {
  const { session, authReady, profile, refreshProfile } = useAuth();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const restored = getAdminPanelState(location.state);
  const [claiming, setClaiming] = useState(false);
  const [highlightRoomId, setHighlightRoomId] = useState<string | null>(
    restored?.highlightRoomId ?? null,
  );

  if (!authReady) return <ProfileRouteSkeleton />;
  if (!session) return <Navigate to="/" replace />;
  if (!profile) return <ProfileRouteSkeleton />;

  const role = profile?.role;
  const isStaff = hasRole(role, 'MODERATOR');
  const canManage = hasRole(role, 'ADMIN');
  const tab = parseAdminTab(params.get('tab') ?? restored?.tab ?? null, {
    canManage,
    isDev: IS_DEV,
  });
  const songRaw = params.get('song');
  const focusSongId = songRaw && /^\d+$/.test(songRaw) ? Number(songRaw) : null;
  const lookupUserId = params.get('user');

  const setTab = (next: string) => {
    setParams(
      (current) => {
        const nextParams = new URLSearchParams(current);
        nextParams.set('tab', next);
        return nextParams;
      },
      { replace: true },
    );
  };

  const goToRoom = (roomId: string) => {
    setHighlightRoomId(roomId);
    setTab('rooms');
  };

  const goToSong = (songId: number) => {
    setParams(
      (current) => {
        const nextParams = new URLSearchParams(current);
        nextParams.set('tab', 'catalogue');
        nextParams.set('song', String(songId));
        nextParams.delete('user');
        return nextParams;
      },
      { replace: true },
    );
  };

  const goToUser = (userId: string) => {
    setParams(
      (current) => {
        const nextParams = new URLSearchParams(current);
        nextParams.set('tab', 'users');
        nextParams.set('user', userId);
        nextParams.delete('song');
        return nextParams;
      },
      { replace: true },
    );
  };

  const clearSongFocus = () => {
    setParams(
      (current) => {
        const nextParams = new URLSearchParams(current);
        nextParams.delete('song');
        return nextParams;
      },
      { replace: true },
    );
  };

  const claimAdmin = async () => {
    setClaiming(true);
    try {
      await adminApi.claimAdmin();
      await refreshProfile();
      toast.success(ADMIN_COPY.claimSuccess);
    } catch (e) {
      toast.error(e instanceof AdminApiError ? e.message : ADMIN_COPY.claimFail);
    } finally {
      setClaiming(false);
    }
  };

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-background">
        <SeoHead
          title={PAGE_TITLES.admin}
          description={ADMIN_COPY.seoDescription}
          noindex
          path="/admin"
        />
        <Header />
        <main id="main-content" className="container pt-24 pb-12">
          <div className="max-w-md mx-auto glass-card p-8 text-center space-y-4">
            <Shield className="h-10 w-10 mx-auto text-muted-foreground" />
            <h1 className="text-xl font-bold">{ADMIN_COPY.reservedTitle}</h1>
            <p className="text-muted-foreground text-sm">{ADMIN_COPY.reservedBody}</p>
            {IS_DEV && (
              <Button onClick={() => void claimAdmin()} disabled={claiming}>
                {ADMIN_COPY.claimDev}
              </Button>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title={PAGE_TITLES.admin}
        description={ADMIN_COPY.seoDescription}
        noindex
        path="/admin"
      />
      <Header />
      <main id="main-content" className="container pt-24 pb-12">
        <div className="max-w-6xl mx-auto">
          <Button
            asChild
            variant="ghost"
            className="mb-6 min-h-9 gap-2 pl-0 text-muted-foreground hover:text-foreground"
          >
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              {ADMIN_COPY.backHome}
            </Link>
          </Button>

          <div className="mb-8 flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold">
              <span className="gradient-text">{ADMIN_COPY.title}</span>
            </h1>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-6 h-auto min-h-9 flex-wrap">
              <TabsTrigger className="min-h-9" value="users">
                {ADMIN_COPY.tabs.users}
              </TabsTrigger>
              <TabsTrigger className="min-h-9" value="rooms">
                {ADMIN_COPY.tabs.rooms}
              </TabsTrigger>
              <TabsTrigger className="min-h-9" value="catalogue">
                {ADMIN_COPY.tabs.catalogue}
              </TabsTrigger>
              {canManage && (
                <TabsTrigger className="min-h-9" value="playlists">
                  {ADMIN_COPY.tabs.playlists}
                </TabsTrigger>
              )}
              {canManage && (
                <TabsTrigger className="min-h-9" value="daily">
                  {ADMIN_COPY.tabs.daily}
                </TabsTrigger>
              )}
              <TabsTrigger className="min-h-9" value="suggestions">
                {ADMIN_COPY.tabs.suggestions}
              </TabsTrigger>
              <TabsTrigger className="min-h-9" value="audit">
                {ADMIN_COPY.tabs.audit}
              </TabsTrigger>
              <TabsTrigger className="min-h-9" value="stats">
                {ADMIN_COPY.tabs.stats}
              </TabsTrigger>
              {IS_DEV && canManage && (
                <TabsTrigger className="min-h-9" value="dev">
                  {ADMIN_COPY.tabs.dev}
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="users">
              <UsersPanel
                canManage={canManage}
                onGoToRoom={goToRoom}
                initialListState={restored?.users}
                lookupUserId={lookupUserId}
              />
            </TabsContent>
            <TabsContent value="rooms">
              <RoomsPanel highlightRoomId={highlightRoomId} />
            </TabsContent>
            <TabsContent value="catalogue">
              <CataloguePanel
                canManage={canManage}
                focusSongId={focusSongId}
                onOpenSong={goToSong}
                onClearFocus={clearSongFocus}
              />
            </TabsContent>
            {canManage && (
              <TabsContent value="playlists">
                <PlaylistsPanel />
              </TabsContent>
            )}
            {canManage && (
              <TabsContent value="daily">
                <DailyAdminPanel />
              </TabsContent>
            )}
            <TabsContent value="suggestions">
              <SuggestionsPanel canManage={canManage} />
            </TabsContent>
            <TabsContent value="audit">
              <AuditPanel onOpenUser={goToUser} />
            </TabsContent>
            <TabsContent value="stats">
              <StatsPanel />
            </TabsContent>
            {IS_DEV && canManage && (
              <TabsContent value="dev">
                <DevToolsPanel onGoToRoom={goToRoom} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
    </div>
  );
}
