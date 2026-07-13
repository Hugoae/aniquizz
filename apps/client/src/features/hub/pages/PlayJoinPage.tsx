/** Full-screen join flow — public room list + code entry. */
import { useEffect } from 'react';

import { SeoHead } from '@/components/seo/SeoHead';
import { Header } from '@/components/layout/Header';
import { FloatingSettingsButton } from '@/features/settings/components/FloatingSettingsButton';
import { RoomListView } from '@/features/hub/components/RoomListView';
import { PAGE_TITLES } from '@/lib/site';
import { prefetchGame } from '@/lib/routePrefetch';
import { useLobbyControllerContext } from '@/features/hub/context/LobbyControllerContext';

export function PlayJoinPage() {
  useEffect(() => {
    prefetchGame();
  }, []);

  const {
    navigate,
    availableRooms,
    joinCode,
    setJoinCode,
    joinRoom,
    openCreateRoom,
    refreshRooms,
  } = useLobbyControllerContext();

  return (
    <>
      <SeoHead title={PAGE_TITLES.playJoin} noindex path="/play/join" />
      <div className="min-h-[100dvh] bg-background">
        <Header />
        <main id="main-content" className="container px-4 pb-12 pt-24 md:px-6">
          <div className="mx-auto max-w-6xl">
            <RoomListView
              rooms={availableRooms}
              joinCode={joinCode}
              onJoinCodeChange={setJoinCode}
              onJoin={joinRoom}
              onCreate={openCreateRoom}
              onBack={() => navigate('/play')}
              onRefresh={refreshRooms}
            />
          </div>
        </main>
        <FloatingSettingsButton />
      </div>
    </>
  );
}
