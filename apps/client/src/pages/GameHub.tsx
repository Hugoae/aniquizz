import { useEffect, useMemo } from 'react';
import { Route, Routes } from 'react-router-dom';
import { SeoHead } from '@/components/seo/SeoHead';
import { PAGE_TITLES } from '@/lib/site';
import { prefetchGame } from '@/lib/routePrefetch';
import type { RoomConfig } from '@aniquizz/shared';
import { isAdmin } from '@aniquizz/shared';

import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

import { Header } from '@/components/layout/Header';
import { FloatingSettingsButton } from '@/features/settings/components/FloatingSettingsButton';
import { MultiplayerLobby } from '@/features/hub/components/MultiplayerLobby';
import { SoloReady } from '@/features/hub/components/SoloReady';
import { ModeSelectView } from '@/features/hub/components/ModeSelectView';

import { LobbyControllerProvider, useLobbyControllerContext } from '@/features/hub/context/LobbyControllerContext';
import { PlayConfigPage } from '@/features/hub/pages/PlayConfigPage';
import { PlayJoinPage } from '@/features/hub/pages/PlayJoinPage';

function PlayPasswordDialog() {
  const {
    showPasswordModal,
    setShowPasswordModal,
    passwordInput,
    setPasswordInput,
    submitPassword,
  } = useLobbyControllerContext();

  return (
    <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
      <DialogContent className="sm:max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
            Salon privé
          </DialogTitle>
          <DialogDescription>Mot de passe</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="room-join-password">Mot de passe</Label>
            <Input
              id="room-join-password"
              name="room-join-password"
              type="password"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
            Annuler
          </Button>
          <Button variant="glow" onClick={submitPassword} disabled={!passwordInput}>
            Valider
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlayHomePage() {
  useEffect(() => {
    prefetchGame();
  }, []);

  const {
    user,
    profile,
    view,
    navigate,
    lobbyPlayers,
    currentRoomId,
    isAmIHost,
    mySocketId,
    gameStatus,
    isLaunchStarting,
    multiplayerCount,
    roomConfig,
    patchRoomSettings,
    startLobbyGame,
    toggleReady,
    transferHost,
    kickPlayer,
    addBots,
    goBack,
    openLobbySettings,
    selectMode,
  } = useLobbyControllerContext();

  const isSoloLobby = roomConfig.maxPlayers === 1;

  const watchedPlayersKey = useMemo(
    () => lobbyPlayers.filter((p) => !p.isBot).map((p) => String(p.id)).sort().join(','),
    [lobbyPlayers],
  );

  const canAddLobbyBots = import.meta.env.DEV || isAdmin(profile?.role);

  if (view === 'lobby') {
    return (
      <>
        <SeoHead title={PAGE_TITLES.play} noindex path="/play" />
        {isSoloLobby ? (
          <SoloReady
            gameSettings={roomConfig}
            playerName={profile?.username || 'Joueur'}
            playerAvatar={profile?.avatar || 'player1'}
            user={user}
            profile={profile}
            roomId={currentRoomId}
            isLaunchStarting={isLaunchStarting}
            onStart={startLobbyGame}
            onLeave={goBack}
            onOpenSettings={openLobbySettings}
          />
        ) : (
          <MultiplayerLobby
            roomName={roomConfig.roomName || 'Salon de jeu'}
            players={lobbyPlayers}
            maxPlayers={roomConfig.maxPlayers}
            isHost={isAmIHost}
            currentUserId={user?.id || mySocketId}
            gameSettings={roomConfig}
            roomCode={currentRoomId}
            gameStatus={gameStatus}
            isLaunchStarting={isLaunchStarting}
            canAddBots={canAddLobbyBots}
            onStartGame={startLobbyGame}
            onToggleReady={toggleReady}
            onLeave={goBack}
            onOpenSettings={openLobbySettings}
            onTransferHost={transferHost}
            onKickPlayer={kickPlayer}
            onAddBots={addBots}
            watchedPlayersKey={watchedPlayersKey}
            onPatchRoomSettings={patchRoomSettings}
          />
        )}
      </>
    );
  }

  return (
    <>
      <SeoHead
        title={PAGE_TITLES.play}
        description="Configure ta partie solo ou multijoueur et lance un blindtest anime."
        path="/play"
        noindex
      />
      <div className="min-h-screen bg-background">
        <Header />
        <main id="main-content" className="container px-4 pb-12 pt-24 md:px-6">
          <div className="mx-auto max-w-6xl">
            <ModeSelectView
              onSelectMode={selectMode}
              onBack={() => navigate('/')}
              multiplayerCount={multiplayerCount}
              bannedUntil={profile?.bannedUntil}
            />
          </div>
        </main>
        <FloatingSettingsButton />
      </div>
    </>
  );
}

function GameHubRoutes() {
  return (
    <>
      <Routes>
        <Route index element={<PlayHomePage />} />
        <Route path="join" element={<PlayJoinPage />} />
        <Route path="create" element={<PlayConfigPage />} />
      </Routes>
      <PlayPasswordDialog />
    </>
  );
}

export default function GameHub() {
  return (
    <LobbyControllerProvider>
      <GameHubRoutes />
    </LobbyControllerProvider>
  );
}
