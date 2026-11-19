import { Globe2 } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { pick, tx } from '@/lib/i18n/text';
import { SectionHeader } from './ConfigPrimitives';

interface RoomSettingsSectionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
  /** Players currently in the room — capacity can't be set below this. */
  minPlayers?: number;
  /** Sidebar stack above category nav (multi create/edit). */
  variant?: 'panel' | 'sidebar';
  /** Largest allowed capacity (a Chrono versus race caps at 8). */
  maxPlayersCap?: number;
}

export function RoomSettingsSection({
  config,
  update,
  minPlayers = 0,
  variant = 'panel',
  maxPlayersCap = 50,
}: RoomSettingsSectionProps) {
  const floor = Math.min(maxPlayersCap, Math.max(2, minPlayers));
  const isSidebar = variant === 'sidebar';

  if (isSidebar) {
    return (
      <section
        aria-label={pick('Paramètres du salon', 'Room settings')}
        className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Globe2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {pick('Salon', 'Room')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Switch
              id="private-room-sidebar"
              checked={config.isPrivate}
              onCheckedChange={(c) => update({ isPrivate: c })}
              className="scale-90"
            />
            <Label htmlFor="private-room-sidebar" className="text-[11px] font-medium">
              {pick('Privé', 'Private')}
            </Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="room-name-sidebar" className="text-xs">
            {pick('Nom', 'Name')}
          </Label>
          <Input
            id="room-name-sidebar"
            value={config.roomName}
            onChange={(e) => update({ roomName: e.target.value })}
            placeholder={pick('Nom du salon', 'Room name')}
            maxLength={20}
            className="h-9 text-sm"
          />
        </div>

        {config.isPrivate && (
          <div className="space-y-2">
            <Label htmlFor="room-password-sidebar" className="text-xs">
              {pick('Mot de passe', 'Password')}
            </Label>
            <Input
              id="room-password-sidebar"
              type="password"
              value={config.password || ''}
              onChange={(e) => update({ password: e.target.value })}
              placeholder={pick('Mot de passe...', 'Password...')}
              className="h-9 text-sm"
              aria-invalid={!config.password?.trim()}
            />
            {!config.password?.trim() && (
              <p className="text-[11px] font-medium text-destructive" role="alert">
                {pick(
                  'Mot de passe requis pour un salon privé.',
                  'A private room needs a password.',
                )}
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="max-players-sidebar" className="text-xs">
            {pick('Joueurs max', 'Max players')} · {config.maxPlayers}
          </Label>
          <Slider
            id="max-players-sidebar"
            aria-label={pick('Nombre de joueurs maximum', 'Maximum players')}
            value={[Math.min(maxPlayersCap, Math.max(config.maxPlayers, floor))]}
            min={floor}
            max={maxPlayersCap}
            step={1}
            onValueChange={(v) => update({ maxPlayers: v[0] })}
            className="py-1"
          />
          {minPlayers > 2 && (
            <p className="text-[10px] leading-snug text-muted-foreground">
              {pick(
                `Min. ${floor} (${minPlayers} déjà présents)`,
                `Min. ${floor} (${minPlayers} already in)`,
              )}
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-secondary/10 p-3">
      <div className="flex items-center justify-between gap-4">
        <SectionHeader
          icon={Globe2}
          title={tx('hub', 'config.roomTitle')}
          tooltip={tx('hub', 'config.roomHint')}
        />
        <div className="mb-2 flex items-center gap-2">
          <Switch
            id="private-room"
            checked={config.isPrivate}
            onCheckedChange={(c) => update({ isPrivate: c })}
          />
          <Label htmlFor="private-room">{pick('Salon privé', 'Private room')}</Label>
        </div>
      </div>

      <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-2')}>
        <div className="space-y-2">
          <Label htmlFor="room-name">{pick('Nom du salon', 'Room name')}</Label>
          <Input
            id="room-name"
            value={config.roomName}
            onChange={(e) => update({ roomName: e.target.value })}
            placeholder={pick('Nom de votre salon', 'Your room name')}
            maxLength={20}
          />
          {config.isPrivate && (
            <div className="space-y-2 pt-1">
              <Label htmlFor="room-password">{pick('Mot de passe', 'Password')}</Label>
              <Input
                id="room-password"
                type="password"
                value={config.password || ''}
                onChange={(e) => update({ password: e.target.value })}
                placeholder={pick('Mot de passe...', 'Password...')}
              />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="max-players">
            {pick('Joueurs max', 'Max players')} ({config.maxPlayers})
          </Label>
          <Slider
            aria-label={pick('Nombre de joueurs maximum', 'Maximum players')}
            value={[Math.min(maxPlayersCap, Math.max(config.maxPlayers, floor))]}
            min={floor}
            max={maxPlayersCap}
            step={1}
            onValueChange={(v) => update({ maxPlayers: v[0] })}
            className="py-2"
          />
          {minPlayers > 2 && (
            <p className="text-[11px] text-muted-foreground">
              {pick(
                `Minimum ${floor} : ${minPlayers} joueur(s) déjà dans le salon.`,
                `Minimum ${floor}: ${minPlayers} player(s) already in the room.`,
              )}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
