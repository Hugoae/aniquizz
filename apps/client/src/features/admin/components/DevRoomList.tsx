import { Bot, Eye, LogIn, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AdminRoom } from '@/lib/adminApi';
import { SectionTitle } from './devToolsUi';

export function DevRoomList({
  rooms,
  addBots,
  removeBots,
  onGoToRoom,
  joinRoom,
}: {
  rooms: AdminRoom[];
  addBots: (roomId: string, count: number) => void;
  removeBots: (roomId: string, count?: number) => void;
  onGoToRoom?: (roomId: string) => void;
  joinRoom: (roomId: string) => void;
}) {
  return (
    <div className="glass-card p-4 space-y-3">
      <SectionTitle
        icon={Users}
        title="Salons & bots"
        hint="Ajoute/retire des bots dans un salon existant, ou saute directement dedans."
      />
      {!rooms.length && <p className="text-sm text-muted-foreground">Aucun salon actif.</p>}
      {rooms.map((room) => {
        const botCount = room.playerCount - room.humanCount;
        return (
          <div
            key={room.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2"
          >
            <div className="text-sm">
              <span className="font-medium">{room.name}</span>{' '}
              <span className="text-muted-foreground">
                #{room.id} — {room.playerCount}/{room.maxPlayers}
              </span>{' '}
              <Badge className="bg-secondary">{room.status}</Badge>{' '}
              {botCount > 0 && (
                <Badge className="gap-1 bg-accent/15 text-accent">
                  <Bot className="h-3 w-3" /> {botCount}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {[1, 3].map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant="outline"
                  onClick={() => void addBots(room.id, n)}
                >
                  +{n}
                </Button>
              ))}
              <Button
                size="sm"
                variant="outline"
                disabled={botCount === 0}
                onClick={() => void removeBots(room.id, 1)}
              >
                −1
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={botCount === 0}
                className="gap-1 text-destructive"
                onClick={() => void removeBots(room.id)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Vider
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1"
                onClick={() => onGoToRoom?.(room.id)}
              >
                <Eye className="h-3.5 w-3.5" /> Salons
              </Button>
              <Button size="sm" variant="ghost" className="gap-1" onClick={() => joinRoom(room.id)}>
                <LogIn className="h-3.5 w-3.5" /> Rejoindre
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
