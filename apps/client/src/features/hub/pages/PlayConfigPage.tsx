/** Full-screen room / solo configuration — replaces the former modal flow. */
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

import { SeoHead } from '@/components/seo/SeoHead';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { PAGE_TITLES } from '@/lib/site';
import type { GameType, RoomConfig } from '@aniquizz/shared';

import { GameConfigForm } from '@/features/hub/components/GameConfigForm';
import { GameTypeSelector } from '@/features/hub/components/GameTypeSelector';
import { createSoundTypeToggler } from '@/features/hub/components/config/formOptions';
import { defaultConfig, defaultRoomConfig } from '@/features/hub/hooks/useLobbyController';
import { useLobbyControllerContext } from '@/features/hub/context/LobbyControllerContext';
import { resolvePlayConfigIntent, type PlayConfigIntent } from '@/features/hub/playConfigSearch';
import { HUB_COPY } from '@/features/hub/copy/hubCopy';

export type { PlayConfigIntent };

export interface PlayConfigLocationState {
  intent?: PlayConfigIntent;
  draft?: RoomConfig;
  /** Where Retour navigates (e.g. lobby at /play when editing from openLobbySettings). */
  returnTo?: string;
}

function intentCopy(intent: PlayConfigIntent) {
  switch (intent) {
    case 'solo':
      return { backTo: '/play' };
    case 'edit':
      return { backTo: '/play' };
    default:
      return { backTo: '/play/join' };
  }
}

function intentTitle(
  intent: PlayConfigIntent,
  isSoloEdit: boolean,
): { lead: string; accent: string } {
  switch (intent) {
    case 'solo':
      return HUB_COPY.configTitle.solo;
    case 'edit':
      return isSoloEdit ? HUB_COPY.configTitle.editSolo : HUB_COPY.configTitle.editRoom;
    default:
      return HUB_COPY.configTitle.create;
  }
}

export function PlayConfigPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state ?? null) as PlayConfigLocationState | null;
  const intent: PlayConfigIntent = resolvePlayConfigIntent(location.search, locationState?.intent);

  const {
    user,
    profile,
    config,
    setConfig,
    roomConfig,
    setRoomConfig,
    createOrUpdateRoom,
    startSolo,
    currentRoomId,
    lobbyPlayers,
  } = useLobbyControllerContext();

  const isSolo = intent === 'solo';
  const isEdit = intent === 'edit';
  const isRoom = !isSolo;

  const [editDraft, setEditDraft] = useState<RoomConfig | null>(() => locationState?.draft ?? null);

  useEffect(() => {
    if (isEdit && locationState?.draft) {
      setEditDraft(locationState.draft);
    }
  }, [isEdit, locationState?.draft]);

  const formConfig: RoomConfig = isSolo
    ? (config as RoomConfig)
    : isEdit
      ? (editDraft ?? roomConfig)
      : roomConfig;
  const formSetter: Dispatch<SetStateAction<RoomConfig>> = isSolo
    ? (setConfig as Dispatch<SetStateAction<RoomConfig>>)
    : isEdit
      ? (action) =>
          setEditDraft((prev) => {
            const base = prev ?? roomConfig;
            return typeof action === 'function' ? action(base) : action;
          })
      : setRoomConfig;

  const copy = intentCopy(intent);
  const formMaxPlayers = 'maxPlayers' in formConfig ? formConfig.maxPlayers : 1;
  const titleParts = intentTitle(intent, isEdit && formMaxPlayers === 1);
  const hideRoomSettings = isEdit && formMaxPlayers === 1;
  const soloOnlyModes = isSolo || hideRoomSettings;

  const watchedKey = useMemo(
    () =>
      lobbyPlayers
        .filter((p) => !p.isBot)
        .map((p) => `${String(p.id)}:${p.watchedListKey ?? ''}`)
        .sort()
        .join(','),
    [lobbyPlayers],
  );

  const handleBack = () => navigate(locationState?.returnTo ?? copy.backTo);
  const handleReset = () => {
    if (isSolo) setConfig(defaultConfig);
    else if (isEdit) setEditDraft({ ...roomConfig });
    else setRoomConfig({ ...defaultRoomConfig });
  };
  const handleSubmit = () => {
    if (isSolo) startSolo();
    else if (isEdit) createOrUpdateRoom(editDraft ?? roomConfig);
    else createOrUpdateRoom();
  };

  const handleGameTypeChange = (gameType: GameType) => {
    formSetter((prev) => ({
      ...prev,
      gameType,
      responseType: gameType === 'sprint' ? 'typing' : prev.responseType,
    }));
  };

  return (
    <>
      <SeoHead title={PAGE_TITLES.playCreate} noindex path="/play/create" />
      <div className="relative flex min-h-[100dvh] flex-col bg-background">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -10%, hsl(var(--primary) / 0.22), transparent 60%), radial-gradient(ellipse 60% 40% at 100% 100%, hsl(var(--aqua) / 0.12), transparent 55%)',
          }}
        />

        <Header />

        <main id="main-content" className="relative flex flex-1 flex-col">
          <div className="container flex min-h-0 flex-1 flex-col px-4 pb-6 pt-20 md:px-6 md:pb-8 md:pt-24">
            <div className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col gap-4">
              <header className="shrink-0 space-y-3">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="gap-2 pl-0 text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  {HUB_COPY.back}
                </Button>

                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {HUB_COPY.configSection}
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                    {titleParts.lead} <span className="gradient-text">{titleParts.accent}</span>
                  </h1>
                </div>

                <GameTypeSelector
                  value={formConfig.gameType ?? 'standard'}
                  onChange={handleGameTypeChange}
                  soloOnly={soloOnlyModes}
                />
              </header>

              <GameConfigForm
                config={formConfig}
                setConfig={formSetter}
                toggleSoundType={createSoundTypeToggler(formSetter)}
                onReset={handleReset}
                onSubmit={handleSubmit}
                isRoom={isRoom}
                hideRoomSettings={hideRoomSettings}
                currentPlayersCount={isEdit ? lobbyPlayers.length : 0}
                user={user}
                profile={profile}
                roomId={isEdit ? currentRoomId : undefined}
                watchedPlayersKey={isEdit ? watchedKey : undefined}
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
