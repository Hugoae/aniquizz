import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/UserAvatar'; 
import { 
    Trophy, Crown, Check, Settings, ArrowLeft, Copy, Play, 
    Eye, EyeOff, Mic2, AlertTriangle, ListMusic, Target, Clock, Shuffle, Users
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
import { AddFriendButton } from '@/features/friends/AddFriendButton';
import { InviteFriendsButton } from '@/features/friends/InviteFriendsButton';

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
  
  const minPlayersRequired = isSolo ? 1 : 2;
  const hasEnoughPlayers = players.length >= minPlayersRequired;

  const canStart = isHost && hasEnoughPlayers && (isSolo || allGuestsReady) && !isGameRunning;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    toast.success("Code copié dans le presse-papier !");
  };

  const handleLeaveClick = () => setShowLeaveDialog(true);
  const handleLeaveConfirm = () => { setShowLeaveDialog(false); onLeave(); };
  const handleTransferClick = (playerId: string | number) => { setHostTransferTarget(playerId); };
  const handleConfirmTransfer = () => { if (hostTransferTarget) { onTransferHost(hostTransferTarget); setHostTransferTarget(null); } };

  const getDifficultyBadge = (diffs: string[] = []) => {
      const hasEasy = diffs.includes('easy');
      const hasMedium = diffs.includes('medium');
      const hasHard = diffs.includes('hard');
      const count = diffs.length;

      if (count === 0) return { label: 'Mixte', className: 'bg-secondary/30 text-muted-foreground border-white/5' };

      if (hasEasy && hasMedium && hasHard) return { 
          label: 'Tout', 
          className: 'bg-gradient-to-r from-green-500/80 via-blue-500/80 to-red-500/80 text-white border-transparent shadow-sm' 
      };
      if (hasEasy && hasMedium) return { 
          label: 'Facile & Moyen', 
          className: 'bg-gradient-to-r from-green-500/80 to-blue-500/80 text-white border-transparent shadow-sm' 
      };
      if (hasMedium && hasHard) return { 
          label: 'Moyen & Diff.', 
          className: 'bg-gradient-to-r from-blue-500/80 to-red-500/80 text-white border-transparent shadow-sm' 
      };
      if (hasEasy && hasHard) return { 
          label: 'Facile & Diff.', 
          className: 'bg-gradient-to-r from-green-500/80 to-red-500/80 text-white border-transparent shadow-sm' 
      };

      if (hasEasy) return { label: 'Facile', className: 'bg-green-500/20 text-green-400 border-green-500/20' };
      if (hasMedium) return { label: 'Moyen', className: 'bg-blue-500/20 text-blue-400 border-blue-500/20' };
      if (hasHard) return { label: 'Difficile', className: 'bg-red-500/20 text-red-400 border-red-500/20' };

      return { label: 'Inconnu', className: 'bg-secondary' };
  };

  const difficultyBadge = getDifficultyBadge(gameSettings?.difficulty || []);

  const getModeBadge = () => (
      <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-1.5 rounded-lg font-black uppercase tracking-wider shadow-lg shadow-primary/20 animate-in zoom-in">
          <Trophy className="h-5 w-5 fill-current" />
          STANDARD
      </div>
  );

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 h-[calc(100vh-140px)] animate-fade-in">
      
      {/* HEADER */}
      <div className="flex flex-col gap-4 bg-card/50 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-lg shrink-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={handleLeaveClick} className="hover:bg-white/10 rounded-full h-10 w-10 shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        {getModeBadge()}
                        {isSolo && <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest bg-secondary/30 px-2 py-0.5 rounded">Solo</span>}
                    </div>
                    
                    <h1 className="text-3xl font-black italic tracking-tighter uppercase flex flex-wrap items-center gap-3">
                        {roomName}
                    </h1>
                    
                    {!isSolo && (
                        <div className="flex items-center gap-3 mt-2">
                             <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-md border border-white/5">
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
                             <div className={cn("text-sm font-medium", hasEnoughPlayers ? "text-muted-foreground" : "text-red-400 font-bold animate-pulse")}>
                                <span className="text-white font-bold">{players.length}</span> / {maxPlayers} Joueurs
                             </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2">
                {!isSolo && <InviteFriendsButton />}
                {isHost && (
                    <Button variant="secondary" onClick={onOpenSettings} className="gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg">
                        <Settings className="h-4 w-4" />
                        Paramètres
                    </Button>
                )}
            </div>
        </div>
        
        {/* Settings Badges */}
        {gameSettings && (
            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2 pt-2 border-t border-white/5">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/30 border border-white/5">
                    <ListMusic className="h-4 w-4 text-primary" />
                    <span className="text-xs font-bold text-muted-foreground uppercase">Sons :</span>
                    <span className="text-sm font-bold">{gameSettings.soundCount}</span>
                </div>
                
                <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-md border", difficultyBadge.className)}>
                    <AlertTriangle className="h-4 w-4 fill-current/10" />
                    <span className="text-xs font-bold uppercase opacity-70">Diff :</span>
                    <span className="text-sm font-bold capitalize">{difficultyBadge.label}</span>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/30 border border-white/5">
                    <Clock className="h-4 w-4 text-orange-400" />
                    <span className="text-xs font-bold text-muted-foreground uppercase">Temps :</span>
                    <span className="text-sm font-bold">{gameSettings.guessDuration}s</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/30 border border-white/5">
                    <Target className="h-4 w-4 text-cyan-400" />
                    <span className="text-xs font-bold text-muted-foreground uppercase">Mode :</span>
                    <span className="text-sm font-bold capitalize">{gameSettings.precision === 'exact' ? 'Nom Exact' : 'Franchise'}</span>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/30 border border-white/5">
                    <Mic2 className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-bold text-muted-foreground uppercase">Type :</span>
                    <span className="text-sm font-bold capitalize">{gameSettings.responseType === 'mix' ? 'Typing & QCM' : gameSettings.responseType}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/30 border border-white/5">
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
      <div className="flex-1 bg-secondary/10 border-2 border-dashed border-white/5 rounded-xl p-6 overflow-y-auto custom-scrollbar">
        <div className={cn(
            "gap-4",
            isSolo ? "flex justify-center items-center h-full" : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        )}>
            {players.map((player) => {
                const isMe = String(player.id) === String(currentUserId);
                const isPlayerInGame = player.isInGame; 

                return (
                    <div 
                        key={player.id} 
                        className={cn(
                            "relative group flex flex-col items-center p-6 rounded-xl border transition-all duration-300 w-full",
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

                        {!isMe && typeof player.id === 'string' && !player.id.startsWith('bot-') && (
                            <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <AddFriendButton userId={player.id} compact />
                            </div>
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

                        {!player.isHost && (
                            <div className={cn(
                                "mt-4 w-full py-1.5 text-center text-xs font-bold uppercase rounded-md border transition-colors",
                                isPlayerInGame
                                    ? "bg-orange-500 text-black border-orange-600 animate-pulse shadow-lg" 
                                    : player.isReady 
                                        ? "bg-green-500/20 text-green-400 border-green-500/20" 
                                        : "bg-white/5 text-muted-foreground border-transparent"
                            )}>
                                {isPlayerInGame ? "EN JEU" : (player.isReady ? "PRÊT" : "EN ATTENTE...")}
                            </div>
                        )}
                        {player.isHost && (
                             <div className={cn("mt-4 w-full py-1.5 text-center text-xs font-bold uppercase rounded-md border border-transparent opacity-50",
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

      <div className="h-20 shrink-0 flex items-center justify-center gap-4 bg-gradient-to-t from-background to-transparent pt-4">
        {isHost ? (
            <div className="flex flex-col items-center gap-2 w-full">
                <Button 
                    onClick={onStartGame} 
                    variant={hasEnoughPlayers ? "glow" : "secondary"} 
                    size="xxl" 
                    disabled={!canStart} 
                    className={cn(
                        "w-full max-w-md text-xl gap-3 shadow-2xl transition-all rounded-lg",
                        canStart ? "animate-pulse-glow" : "opacity-70 grayscale"
                    )}
                >
                    {!hasEnoughPlayers ? (
                        <>
                            <Users className="h-6 w-6" /> EN ATTENTE DE JOUEURS ({players.length}/{minPlayersRequired})
                        </>
                    ) : (
                        <>
                            <Play className="h-6 w-6 fill-current" /> LANCER LA PARTIE
                        </>
                    )}
                </Button>
                {!canStart && hasEnoughPlayers && !isSolo && !isGameRunning && (
                    <span className="text-xs text-muted-foreground animate-pulse">Tous les joueurs doivent être "PRÊT"</span>
                )}
            </div>
        ) : (
            <Button 
                onClick={onToggleReady} 
                variant={me?.isReady ? "secondary" : "glow"}
                size="xxl"
                disabled={isGameRunning && me?.isInGame}
                className="w-full max-w-md text-xl gap-3 shadow-2xl rounded-lg"
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