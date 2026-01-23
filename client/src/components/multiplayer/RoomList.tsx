import { useState } from 'react';
import { Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// Structure de données correspondant à ce que le serveur envoie
interface Room {
  id: string;
  name: string;
  host: string;
  hostAvatar: string;
  mode: string;
  players: number;
  maxPlayers: number;
  isPrivate: boolean;
  status: string;
}

interface RoomListProps {
  rooms: Room[]; // Données réelles
  onJoin: (roomId: string) => void;
}

type FilterType = 'all' | 'public' | 'private';

export function RoomList({ rooms, onJoin }: RoomListProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredRooms = rooms.filter(room => {
    if (filter === 'public') return !room.isPrivate;
    if (filter === 'private') return room.isPrivate;
    return true;
  });

  const filterButtons: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tous' },
    { id: 'public', label: 'Publics' },
    { id: 'private', label: 'Privés' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {filterButtons.map((btn) => (
            <Button
              key={btn.id}
              variant={filter === btn.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(btn.id)}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid of rooms */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRooms.map((room) => (
          <div
            key={room.id}
            className={cn(
              "relative overflow-hidden rounded-2xl border border-border bg-card transition-all hover-lift cursor-pointer group",
              room.players >= room.maxPlayers && "opacity-60 cursor-not-allowed"
            )}
            onClick={() => room.players < room.maxPlayers && onJoin(room.id)}
          >
            {/* Background host avatar */}
            <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity">
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${room.hostAvatar}`}
                alt=""
                className="w-full h-full object-cover blur-sm scale-110"
              />
            </div>

            {/* Content */}
            <div className="relative p-5 space-y-4">
              {/* Header: Room name & status */}
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg truncate">{room.name}</h3>
                    {room.isPrivate && (
                      <Lock className="h-4 w-4 text-yellow-500 shrink-0" />
                    )}
                  </div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary">
                    {room.mode}
                  </span>
                </div>
                {/* Player count badge */}
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium",
                  room.players >= room.maxPlayers 
                    ? "bg-destructive/20 text-destructive" 
                    : "bg-secondary text-foreground"
                )}>
                  <Users className="h-3.5 w-3.5" />
                  {room.players}/{room.maxPlayers}
                </div>
              </div>

              {/* Host info */}
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-border">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${room.hostAvatar}`} />
                  <AvatarFallback>{room.host[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-xs text-muted-foreground">Hébergé par</div>
                  <div className="font-medium">{room.host}</div>
                </div>
              </div>

              {/* Join button */}
              <Button 
                variant="glow" 
                className="w-full"
                disabled={room.players >= room.maxPlayers}
              >
                {room.players >= room.maxPlayers ? 'Complet' : 'Rejoindre'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredRooms.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Aucun salon disponible. Créez-en un !
        </div>
      )}
    </div>
  );
}