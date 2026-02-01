import { useState } from 'react';
import { Users, Search, Lock, Unlock, ListMusic, AlertTriangle, Clock, Target, Mic2, Shuffle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';

// Interface mise à jour pour inclure les settings
interface RoomSummary {
  id: string;
  name: string;
  host: string;
  hostAvatar: string;
  mode: string;
  players: number;
  maxPlayers: number;
  isPrivate: boolean;
  status: 'waiting' | 'playing' | 'finished';
  settings?: {
    difficulty?: string[];
    soundCount?: number;
    guessDuration?: number;
    precision?: string;
    responseType?: string;
    soundSelection?: string;
  };
}

interface RoomListProps {
  rooms: RoomSummary[];
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

  // Helper pour formater la difficulté (ex: "Easy", "Hard", "Mix")
  const formatDifficulty = (diffs?: string[]) => {
      if (!diffs || diffs.length === 0) return 'Mix';
      if (diffs.length > 1) return 'Mix';
      return diffs[0].charAt(0).toUpperCase() + diffs[0].slice(1);
  };

  // Helper pour la couleur de difficulté
  const getDiffColor = (diff?: string[]) => {
      if (!diff || diff.length > 1) return "text-blue-400 border-blue-500/20 bg-blue-500/10";
      if (diff[0] === 'easy') return "text-green-400 border-green-500/20 bg-green-500/10";
      if (diff[0] === 'hard') return "text-red-400 border-red-500/20 bg-red-500/10";
      return "text-blue-400 border-blue-500/20 bg-blue-500/10";
  };

  return (
    <div className="w-full max-w-5xl space-y-6">
      
      {/* FILTRES */}
      <div className="flex justify-center gap-2 animate-fade-in">
        <div className="bg-secondary/30 p-1 rounded-xl flex gap-1 border border-white/5">
            {filterButtons.map((btn) => (
                <button
                    key={btn.id}
                    onClick={() => setFilter(btn.id)}
                    className={cn(
                        "px-4 py-1.5 rounded-lg text-sm font-bold transition-all",
                        filter === btn.id 
                            ? "bg-background shadow-lg text-primary border border-white/5" 
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                >
                    {btn.label}
                </button>
            ))}
        </div>
      </div>

      {/* GRILLE DES SALONS */}
      <div className="grid grid-cols-1 gap-4">
        {filteredRooms.map((room) => {
            const isFull = room.players >= room.maxPlayers;
            const isPlaying = room.status === 'playing';
            const s = room.settings || {}; // Raccourci pour les settings

            return (
              <div 
                key={room.id} 
                className="group relative glass-card p-5 rounded-3xl border border-white/5 transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:translate-y-[-2px] overflow-hidden"
              >
                {/* Effet de fond au hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="relative flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                  
                  {/* GAUCHE : Info Principales */}
                  <div className="flex-1 min-w-0 flex flex-col gap-3">
                    <div className="flex items-center justify-between md:justify-start gap-4">
                        <h3 className="font-black text-xl truncate text-foreground group-hover:text-primary transition-colors tracking-tight">
                            {room.name}
                        </h3>
                        {room.isPrivate && (
                            <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-wider flex items-center gap-1">
                                <Lock className="w-3 h-3" /> Privé
                            </span>
                        )}
                        {isPlaying && (
                             <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-wider animate-pulse flex items-center gap-1">
                                <Play className="w-3 h-3 fill-current" /> En cours
                            </span>
                        )}
                    </div>

                    {/* BADGES DE CONFIGURATION (Style Screenshot) */}
                    <div className="flex flex-wrap gap-2">
                        {/* Sons */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/5 bg-secondary/30 text-xs font-bold text-muted-foreground">
                            <ListMusic className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-foreground">{s.soundCount || 10}</span>
                        </div>

                        {/* Difficulté */}
                        <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold", getDiffColor(s.difficulty))}>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{formatDifficulty(s.difficulty)}</span>
                        </div>

                        {/* Temps */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-orange-500/20 bg-orange-500/10 text-xs font-bold text-orange-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{s.guessDuration || 15}s</span>
                        </div>

                        {/* Mode (Franchise/Exact) */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-xs font-bold text-cyan-400">
                            <Target className="w-3.5 h-3.5" />
                            <span className="capitalize">{s.precision === 'exact' ? 'Exact' : 'Franchise'}</span>
                        </div>

                        {/* Type (QCM/Typing) */}
                        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-purple-500/20 bg-purple-500/10 text-xs font-bold text-purple-400">
                            <Mic2 className="w-3.5 h-3.5" />
                            <span className="capitalize">{s.responseType === 'mix' ? 'Typing & QCM' : s.responseType}</span>
                        </div>

                        {/* Source */}
                        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-pink-500/20 bg-pink-500/10 text-xs font-bold text-pink-400">
                            <Shuffle className="w-3.5 h-3.5" />
                            <span className="capitalize">
                                {s.soundSelection === 'watched' ? 'Watched List' : s.soundSelection === 'playlist' ? 'Playlist' : 'Aléatoire'}
                            </span>
                        </div>
                    </div>
                  </div>

                  {/* DROITE : Hôte et Action */}
                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/5 pt-4 md:pt-0">
                    
                    {/* Hôte */}
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden md:block">
                            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Hébergé par</div>
                            <div className="text-sm font-bold">{room.host}</div>
                        </div>
                        <UserAvatar avatar={room.hostAvatar} username={room.host} className="h-10 w-10 border-2 border-white/10" />
                        <div className="text-left md:hidden">
                            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Hôte</div>
                            <div className="text-sm font-bold">{room.host}</div>
                        </div>
                    </div>

                    {/* Bouton */}
                    <div className="flex flex-col items-end gap-1 min-w-[100px]">
                        <div className={cn(
                            "flex items-center gap-1.5 text-xs font-bold mb-1",
                            isFull ? "text-destructive" : "text-green-400"
                        )}>
                            <Users className="h-3.5 w-3.5" />
                            {room.players} / {room.maxPlayers}
                        </div>
                        <Button 
                            variant="glow"
                            size="sm"
                            className={cn("w-full transition-all font-bold", isFull && "opacity-50")}
                            disabled={isFull}
                            onClick={() => onJoin(room.id)}
                        >
                            {isFull ? 'COMPLET' : isPlaying ? 'REGARDER' : 'REJOINDRE'}
                        </Button>
                    </div>

                  </div>
                </div>
              </div>
            );
        })}
      </div>

      {filteredRooms.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground bg-secondary/5 rounded-3xl border border-white/5 border-dashed animate-fade-in">
          <div className="bg-secondary/20 p-4 rounded-full mb-4">
             <Search className="h-8 w-8 opacity-50" />
          </div>
          <p className="text-lg font-bold">Aucun salon trouvé</p>
          <p className="text-sm opacity-50">Essayez de modifier les filtres ou créez votre propre partie !</p>
        </div>
      )}
    </div>
  );
}