import { ArrowLeft, Copy, Eye, EyeOff, Settings } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InviteFriendsButton } from '@/features/friends/InviteFriendsButton';
import { FOCUS_RING } from '@/features/hub/components/config/ConfigPrimitives';
import { SettingChipItem, SettingChipList } from '@/features/hub/components/SettingChip';
import { LobbyRulesTrigger } from '@/features/hub/components/lobby/LobbyRulesDialog';
import { GameModeBadge } from '@/features/hub/components/GameModeBadge';
import type { SettingChipSpec } from '@/features/hub/components/roomSettings';

interface MultiplayerLobbyHeaderProps {
  roomName: string;
  gameType: RoomConfig['gameType'] | undefined;
  roomCode: string;
  showCode: boolean;
  onToggleCode: () => void;
  onCopyCode: () => void;
  isHost: boolean;
  playerIds: Array<string | number>;
  onLeaveClick: () => void;
  onOpenSettings: () => void;
  settingChips: SettingChipSpec[];
  gameSettings?: RoomConfig;
  humanCount: number;
  playlistName?: string;
}

export function MultiplayerLobbyHeader({
  roomName,
  gameType,
  roomCode,
  showCode,
  onToggleCode,
  onCopyCode,
  isHost,
  playerIds,
  onLeaveClick,
  onOpenSettings,
  settingChips,
  gameSettings,
  humanCount,
  playlistName,
}: MultiplayerLobbyHeaderProps) {
  return (
    <div className="glass-card flex shrink-0 flex-col gap-4 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onLeaveClick}
            aria-label="Quitter le salon"
            className="h-10 w-10 shrink-0 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="mb-1 flex items-center gap-3">
              <GameModeBadge gameType={gameType} />
            </div>

            <h1 className="flex flex-wrap items-center gap-3 text-3xl font-black uppercase tracking-tight">
              {roomName}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-md border border-border/50 bg-secondary/40 px-3 py-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Code :
                </span>
                <span className="min-w-[80px] text-center font-mono text-lg font-bold tracking-widest text-foreground">
                  {showCode ? roomCode : '••••••'}
                </span>
                <button
                  type="button"
                  onClick={onToggleCode}
                  aria-label={showCode ? 'Masquer le code' : 'Afficher le code'}
                  aria-pressed={showCode}
                  className={cn(
                    'ml-1 rounded text-muted-foreground transition-colors hover:text-foreground',
                    FOCUS_RING,
                  )}
                >
                  {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={onCopyCode}
                  aria-label="Copier le code du salon"
                  className={cn(
                    'ml-1 rounded text-muted-foreground transition-colors hover:text-primary',
                    FOCUS_RING,
                  )}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isHost && <InviteFriendsButton excludeIds={playerIds} />}
          {isHost && (
            <Button variant="secondary" onClick={onOpenSettings} className="gap-2">
              <Settings className="h-4 w-4" />
              Paramètres
            </Button>
          )}
        </div>
      </div>

      {gameSettings && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
          <SettingChipList>
            {settingChips.map((spec) => (
              <SettingChipItem key={spec.key} spec={spec} />
            ))}
          </SettingChipList>
          <LobbyRulesTrigger
            config={gameSettings}
            context={{
              lobbyMode: 'multi',
              playerCount: humanCount,
              playlistName,
            }}
            className="ml-auto"
          />
        </div>
      )}
    </div>
  );
}
