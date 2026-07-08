import { Globe2 } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { SectionHeader } from './ConfigPrimitives';

interface RoomSettingsSectionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
  /** Players currently in the room — capacity can't be set below this. */
  minPlayers?: number;
}

export function RoomSettingsSection({ config, update, minPlayers = 0 }: RoomSettingsSectionProps) {
  const floor = Math.max(2, minPlayers);
  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-secondary/10 p-3">
      <div className="flex items-center justify-between gap-4">
        <SectionHeader
          icon={Globe2}
          title="Paramètres du salon"
          tooltip="Nom affiché dans la liste, taille du salon et accès public ou protégé par mot de passe."
        />
        <div className="mb-2 flex items-center gap-2">
          <Switch id="private-room" checked={config.isPrivate} onCheckedChange={(c) => update({ isPrivate: c })} />
          <Label htmlFor="private-room">Salon privé</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="room-name">Nom du salon</Label>
          <Input
            id="room-name"
            value={config.roomName}
            onChange={(e) => update({ roomName: e.target.value })}
            placeholder="Nom de votre salon"
            maxLength={20}
          />
          {config.isPrivate && (
            <div className="space-y-2 pt-1">
              <Label htmlFor="room-password">Mot de passe</Label>
              <Input
                id="room-password"
                type="password"
                value={config.password || ''}
                onChange={(e) => update({ password: e.target.value })}
                placeholder="Mot de passe..."
              />
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="max-players">Joueurs max ({config.maxPlayers})</Label>
          <Slider
            aria-label="Nombre de joueurs maximum"
            value={[Math.max(config.maxPlayers, floor)]}
            min={floor}
            max={50}
            step={1}
            onValueChange={(v) => update({ maxPlayers: v[0] })}
            className="py-2"
          />
          {minPlayers > 2 && (
            <p className="text-[11px] text-muted-foreground">
              Minimum {floor} : {minPlayers} joueur(s) déjà dans le salon.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
