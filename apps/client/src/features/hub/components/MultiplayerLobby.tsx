import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/UserAvatar'; 
import { 
    Trophy, Crown, Check, Settings, ArrowLeft, Copy, Play, 
    Eye, EyeOff, Mic2, AlertTriangle, ListMusic, Target, Clock, Shuffle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export interface LobbyPlayer {
  id: string | number;
  name: string;
  avatar: string;
  level: number;
  totalWins: number;
  isReady: boolean;
  isHost: boolean;
  isInGame?: boolean;
}

interface MultiplayerLobbyProps {
  roomName: string;
  players: LobbyPlayer[];
  maxPlayers: number;
  isHost: boolean;
  currentUserId: string | number;
  gameSettings?: any;
  roomCode: string;
  gameStatus?: 'waiting' | 'playing' | 'paused' | 'finished';
  onStartGame: () => void;
  onToggleReady: () => void;
  onLeave: () => void;
  onOpenSettings: () => void;
  onTransferHost: (targetId: string | number) => void;
}

export function MultiplayerLobby({
  roomName,
  players,
  maxPlayers,
  isHost,
  currentUserId,
  gameSettings,
  roomCode,
  gameStatus = 'waiting',
  onStartGame,
  onToggleReady,
  onLeave,
  onOpenSettings,
  onTransferHost
}: MultiplayerLobbyProps) {
  
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [hostTransferTarget, setHostTransferTarget] = useState<string | number | null>(null);
  const [showCode, setShowCode] = useState(false);

  const me = players.find(p => String(p.id) === String(currentUserId));
  const isSolo = maxPlayers === 1;
  const isGameRunning = gameStatus === 'playing' || gameStatus === 'paused';

  const guests = players.filter(p => !p.isHost);
  const allGuestsReady = guests.every(p => p.isReady);
  
  // ✅ FIX: Le bouton est désactivé si la game tourne, mais on ne change pas le texte.
  const canStart = isHost && players.length > 0 && (isSolo || allGuestsReady) && !isGameRunning;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success("Code copié dans le presse-papier !");
  };

  const handleLeaveClick = () => setShowLeaveDialog(true);
  const handleLeaveConfirm = () => { setShowLeaveDialog(false); onLeave(); };
  const handleTransferClick = (playerId: string | number) => { setHostTransferTarget(playerId); };
  const handleConfirmTransfer = () => { if (hostTransferTarget) { onTransferHost(hostTransferTarget); setHostTransferTarget(null); } };

  const getDifficultyColor = (d: string) => {
      if (d === 'easy') return 'bg-green-500/20 text-green-400 border-green-500/20';
      if (d === 'hard') return 'bg-red-500/20 text-red-400 border-red-500/20';
      return 'bg-blue-500/20 text-blue-400 border-blue-500/20';
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 h-[calc(100vh-140px)] animate-fade-in">
      
      {/* HEADER */}
      <div className="flex flex-col gap-4 bg-card/50 backdrop-blur-md border border-white/10 p-6 rounded-3xl shadow-lg shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleLeaveClick} className="hover:bg-white/10 rounded-full h-10 w-10 shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter uppercase flex flex-wrap items-center gap-3">
                        {roomName}
                        <span className="text-sm font-bold normal-case bg-primary/20 text-primary px-3 py-1 rounded-full border border-primary/20">
                            {isSolo ? 'Mode Solo' : 'Multijoueur'}
                        </span>
                    </h1>
                    
                    {!isSolo && (
                        <div className="flex items-center gap-3 mt-2">
                             <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Code :</span>
                                <span className="font-mono font-bold text-white text-lg min-w-[80px] text-center tracking-widest">
                                    {showCode ? roomCode : '••••••'}
                                </span>
                                <button onClick={() => setShowCode(!showCode)} className="text-muted-foreground hover:text-white ml-1">
                                    {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                                <button onClick={copyRoomCode} className="text-muted-foreground hover:text-primary ml-1" title="Copier">
                                    <Copy className="h-4 w-4" />
                                </button>
                             </div>
                             <div className="text-sm font-medium text-muted-foreground">
                                <span className="text-white font-bold">{players.length}</span> / {maxPlayers} Joueurs
                             </div>
                        </div>
                    )}
                </div>
            </div>

            {isHost && (
                <Button variant="secondary" onClick={onOpenSettings} className="gap-2 bg-white/5 hover:bg-white/10 border border-white/10">
                    <Settings className="h-4 w-4" />
                    Paramètres
                </Button>
            )}
        </div>
        
        {/* Settings Badges */}
        {gameSettings && (
            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/30 border border-white/5">
                    <ListMusic className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-muted-foreground uppercase">Sons :</span>
                    <span className="text-sm font-bold">{gameSettings.soundCount}</span>
                </div>
                <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border", getDifficultyColor(gameSettings.difficulty?.[0] || 'medium'))}>
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase opacity-70">Diff :</span>
                    <span className="text-sm font-bold capitalize">{gameSettings.difficulty?.[0] || 'Mixte'}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/30 border border-white/5">
                    <Clock className="h-4 w-4 text-orange-400" />
                    <span className="text-xs font-bold text-muted-foreground uppercase">Temps :</span>
                    <span className="text-sm font-bold">{gameSettings.guessDuration}s</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/30 border border-white/5">
                    <Target className="h-4 w-4 text-cyan-400" />
                    <span className="text-xs font-bold text-muted-foreground uppercase">Mode :</span>
                    <span className="text-sm font-bold capitalize">{gameSettings.precision === 'exact' ? 'Nom Exact' : 'Franchise'}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/30 border border-white/5">
                    <Mic2 className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-bold text-muted-foreground uppercase">Type :</span>
                    <span className="text-sm font-bold capitalize">{gameSettings.responseType === 'mix' ? 'Typing & QCM' : gameSettings.responseType}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/30 border border-white/5">
                    <Shuffle className="h-4 w-4 text-pink-400" />
                    <span className="text-xs font-bold text-muted-foreground uppercase">Source :</span>
                    <span className="text-sm font-bold capitalize">
                        {gameSettings.soundSelection === 'random' ? 'Aléatoire' : gameSettings.soundSelection === 'watched' ? 'Ma Liste' : 'Playlist'}
                    </span>
                </div>
            </div>
        )}
      </div>

      {/* PLAYERS GRID */}
      <div className="flex-1 bg-secondary/10 border-2 border-dashed border-white/5 rounded-3xl p-6 overflow-y-auto custom-scrollbar">
        <div className={cn(
            "gap-4",
            isSolo ? "flex justify-center items-center h-full" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        )}>
            {players.map((player) => {
                const isMe = String(player.id) === String(currentUserId);
                
                // ✅ CORRECTION : Un joueur est en jeu uniquement si le serveur le dit
                const isPlayerInGame = player.isInGame; 

                return (
                    <div 
                        key={player.id} 
                        className={cn(
                            "relative group flex flex-col items-center p-6 rounded-2xl border transition-all duration-300 w-full",
                            isSolo ? "max-w-xs shadow-2xl scale-110" : "",
                            isPlayerInGame 
                                ? "bg-orange-950/20 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.15)] scale-[1.02]" 
                                : player.isReady 
                                    ? "bg-green-500/10 border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]" 
                                    : "bg-card/40 border-white/5 hover:border-white/10 hover:bg-card/60"
                        )}
                    >
                        {isHost && !player.isHost && (
                            <button 
                                onClick={() => handleTransferClick(player.id)}
                                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/10 rounded-full text-muted-foreground hover:text-yellow-400"
                                title="Nommer Hôte"
                            >
                                <Crown className="h-4 w-4" />
                            </button>
                        )}

                        {player.isHost && (
                            <div className="absolute -top-3 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-lg z-10">
                                <Crown className="h-3 w-3 fill-black" /> HÔTE
                            </div>
                        )}

                        <div className="relative mb-3">
                            <UserAvatar 
                                avatar={player.avatar} 
                                username={player.name} 
                                className={cn("h-20 w-20 border-4 shadow-xl", 
                                    isPlayerInGame ? "border-orange-500" :
                                    player.isReady ? "border-green-500" : "border-transparent"
                                )} 
                            />
                        </div>

                        <div className="text-center w-full">
                            <h3 className={cn("font-bold truncate text-lg", isMe && "text-primary")}>
                                {player.name} {isMe && "(Moi)"}
                            </h3>
                            <div className="flex items-center justify-center gap-2 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full">
                                    <Trophy className="h-3 w-3 text-yellow-500" /> {player.totalWins} Win{player.totalWins > 1 ? 's' : ''}
                                </span>
                            </div>
                        </div>

                        {/* STATUS BADGE */}
                        {!player.isHost && (
                            <div className={cn(
                                "mt-4 w-full py-1.5 text-center text-xs font-bold uppercase rounded-lg border transition-colors",
                                isPlayerInGame
                                    ? "bg-orange-500 text-black border-orange-600 animate-pulse shadow-lg" 
                                    : player.isReady 
                                        ? "bg-green-500/20 text-green-400 border-green-500/20" 
                                        : "bg-white/5 text-muted-foreground border-transparent"
                            )}>
                                {isPlayerInGame ? "EN JEU 🎮" : (player.isReady ? "PRÊT" : "EN ATTENTE...")}
                            </div>
                        )}
                        {player.isHost && (
                             <div className={cn("mt-4 w-full py-1.5 text-center text-xs font-bold uppercase rounded-lg border border-transparent opacity-50",
                                isPlayerInGame ? "text-orange-400" : "text-muted-foreground"
                             )}>
                                {isPlayerInGame ? "Joue..." : "ADMINISTRE"}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="h-20 shrink-0 flex items-center justify-center gap-4 bg-gradient-to-t from-background to-transparent pt-4">
        {isHost ? (
            <div className="flex flex-col items-center gap-2 w-full">
                <Button 
                    onClick={onStartGame} 
                    variant="glow" 
                    size="xxl" 
                    disabled={!canStart} // Bloqué si game running, mais texte inchangé
                    className={cn("w-full max-w-md text-xl gap-3 shadow-2xl transition-all", canStart ? "animate-pulse-glow" : "opacity-50 grayscale")}
                >
                    <Play className="h-6 w-6 fill-current" />
                    LANCER LA PARTIE
                </Button>
                {!canStart && !isSolo && players.length > 1 && !isGameRunning && (
                    <span className="text-xs text-muted-foreground animate-pulse">Tous les joueurs doivent être "PRÊT"</span>
                )}
            </div>
        ) : (
            // ✅ FIX: On permet toujours de se mettre prêt, même si game tourne
            <Button 
                onClick={onToggleReady} 
                variant={me?.isReady ? "secondary" : "glow"}
                size="xxl"
                disabled={isGameRunning && me?.isInGame} // Seulement bloqué si DÉJÀ en jeu
                className="w-full max-w-md text-xl gap-3 shadow-2xl"
            >
                {me?.isReady ? (
                    <>Annuler <span className="text-xs opacity-50 ml-1">(En attente de l'hôte)</span></>
                ) : (
                    <><Check className="h-6 w-6" /> JE SUIS PRÊT !</>
                )}
            </Button>
        )}
      </div>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter le salon ?</AlertDialogTitle>
            <AlertDialogDescription>
              {isHost && players.length > 1 
                ? "Vous êtes l'hôte. Si vous quittez, un nouvel hôte sera désigné automatiquement." 
                : "Vous allez être déconnecté de ce salon."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveConfirm} className="bg-destructive hover:bg-destructive/90">Quitter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!hostTransferTarget} onOpenChange={() => setHostTransferTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transférer le rôle d'hôte ?</AlertDialogTitle>
            <AlertDialogDescription>Voulez-vous donner l'admin à ce joueur ?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmTransfer}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}