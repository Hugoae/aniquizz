import { useState, type Dispatch, type SetStateAction } from 'react';
import { SeoHead } from '@/components/seo/SeoHead';
import { PAGE_TITLES } from '@/lib/site';
import type { RoomConfig } from '@aniquizz/shared';

import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

import { Header } from '@/components/layout/Header';
import { FloatingSettingsButton } from '@/features/settings/components/FloatingSettingsButton';
import { GameConfigForm } from '@/features/hub/components/GameConfigForm';
import { MultiplayerLobby } from '@/features/hub/components/MultiplayerLobby';
import { SoloReady } from '@/features/hub/components/SoloReady';
import { ModeSelectView } from '@/features/hub/components/ModeSelectView';
import { RoomListView } from '@/features/hub/components/RoomListView';

import { useLobbyController, defaultConfig, defaultRoomConfig } from '@/features/hub/hooks/useLobbyController';
import { createSoundTypeToggler } from '@/features/hub/components/config/formOptions';

export default function GameHub() {
  const {
    user, profile,
    view, setView, navigate,
    lobbyPlayers, currentRoomId, isAmIHost, mySocketId, gameStatus, isLaunchStarting, availableRooms,
    multiplayerCount,
    config, setConfig, roomConfig, setRoomConfig,
    showConfig, setShowConfig,
    showCreateModal, setShowCreateModal,
    showPasswordModal, setShowPasswordModal,
    passwordInput, setPasswordInput,
    joinCode, setJoinCode,
    selectMode, openCreateRoom, startSolo, createOrUpdateRoom,
    startLobbyGame, toggleReady, transferHost, kickPlayer, addBots, joinRoom, submitPassword, goBack, refreshRooms,
  } = useLobbyController();

  const isSoloLobby = roomConfig.maxPlayers === 1;

  // Settings modal edits a local DRAFT of the room config. Changes are only
  // committed (to the server AND the live lobby) when the host clicks "Mettre à
  // jour" — moving a slider no longer mutates the running room.
  const [draftConfig, setDraftConfig] = useState<RoomConfig | null>(null);
  const draft = draftConfig ?? roomConfig;
  const draftSetter: Dispatch<SetStateAction<RoomConfig>> = (action) =>
    setDraftConfig((prev) => {
      const base = prev ?? roomConfig;
      return typeof action === 'function' ? action(base) : action;
    });
  const openLobbySettings = () => { setDraftConfig(roomConfig); setShowCreateModal(true); };
  const handleSettingsOpenChange = (open: boolean) => {
    setShowCreateModal(open);
    if (!open) setDraftConfig(null);
  };

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
              canAddBots={import.meta.env.DEV}
              onStartGame={startLobbyGame}
            onToggleReady={toggleReady}
            onLeave={goBack}
            onOpenSettings={openLobbySettings}
            onTransferHost={transferHost}
            onKickPlayer={kickPlayer}
            onAddBots={addBots}
          />
        )}
        <Dialog open={showCreateModal} onOpenChange={handleSettingsOpenChange}>
          <DialogContent className="sm:max-w-3xl bg-card border-border" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="text-xl flex items-center gap-3">
                {isSoloLobby ? 'Paramètres de la partie' : 'Paramètres du salon'}
              </DialogTitle>
              <DialogDescription>Ajustez les règles puis validez avec « Mettre à jour ».</DialogDescription>
            </DialogHeader>
            <GameConfigForm
              config={draft}
              setConfig={draftSetter}
              toggleSoundType={createSoundTypeToggler(draftSetter)}
              onReset={() => setDraftConfig({ ...defaultRoomConfig })}
              onSubmit={() => createOrUpdateRoom(draft)}
              isRoom={true}
              hideRoomSettings={draft.maxPlayers === 1}
              currentPlayersCount={lobbyPlayers.length}
              user={user}
              profile={profile}
            />
          </DialogContent>
        </Dialog>
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
        <main id="main-content" className="container pt-24 pb-12 px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            {view === 'modes' && (
              <ModeSelectView
                onSelectMode={selectMode}
                onBack={() => navigate('/')}
                multiplayerCount={multiplayerCount}
              />
            )}
            {view === 'roomList' && (
              <RoomListView
                rooms={availableRooms}
                joinCode={joinCode}
                onJoinCodeChange={setJoinCode}
                onJoin={joinRoom}
                onCreate={openCreateRoom}
                onBack={() => setView('modes')}
                onRefresh={refreshRooms}
              />
            )}
          </div>
        </main>

        <Dialog open={showConfig} onOpenChange={setShowConfig}>
          <DialogContent className="sm:max-w-3xl bg-card border-border" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader><DialogTitle>Configuration</DialogTitle><DialogDescription>Mode Solo</DialogDescription></DialogHeader>
            <GameConfigForm
              config={config}
              setConfig={setConfig}
              toggleSoundType={createSoundTypeToggler(setConfig)}
              onReset={() => setConfig(defaultConfig)}
              onSubmit={startSolo}
              isRoom={false}
              currentPlayersCount={0}
              user={user}
              profile={profile}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="sm:max-w-3xl bg-card border-border" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader><DialogTitle>Créer un salon</DialogTitle><DialogDescription>Invitez vos amis.</DialogDescription></DialogHeader>
            <GameConfigForm
              config={roomConfig}
              setConfig={setRoomConfig}
              toggleSoundType={createSoundTypeToggler(setRoomConfig)}
              onReset={() => setRoomConfig(defaultRoomConfig)}
              onSubmit={() => createOrUpdateRoom()}
              isRoom={true}
              currentPlayersCount={0}
              user={user}
              profile={profile}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
          <DialogContent className="sm:max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5 text-primary" /> Salon privé</DialogTitle>
              <DialogDescription>Mot de passe</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
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
              <Button variant="outline" onClick={() => setShowPasswordModal(false)}>Annuler</Button>
              <Button variant="glow" onClick={submitPassword} disabled={!passwordInput}>Valider</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <FloatingSettingsButton />
      </div>
    </>
  );
}
