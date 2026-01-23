import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Crown, Check, Settings, Moon, Sun, ArrowLeft, Eye, EyeOff, Copy, Check as CheckIcon, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
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
// --- SOCKET ---
import { socket } from '@/services/socket';

export interface LobbyPlayer {
  id: string | number;
  name: string;
  avatar: string;
  level: number;
  rank: string;
  rankTier: number;
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
  gameSettings?: {
    gameType: string;
    soundCount: number;
    guessDuration: number;
    difficulty: string;
  };
  roomCode?: string;
  onStartGame: () => void;
  onToggleReady: () => void;
  onLeave: () => void;
  onOpenSettings?: () => void;
  onTransferHost?: (targetId: string | number) => void;
}

const rankColors: Record<string, string> = {
  bronze: 'text-amber-600',
  silver: 'text-gray-400',
  gold: 'text-yellow-500',
  platine: 'text-cyan-400',
  diamond: 'text-blue-400',
  masterweeb: 'text-purple-500',
};

export function MultiplayerLobby({ 
  roomName, 
  players, 
  maxPlayers, 
  isHost,
  currentUserId,
  gameSettings,
  roomCode,
  onStartGame,
  onToggleReady,
  onLeave,
  onOpenSettings,
  onTransferHost
}: MultiplayerLobbyProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);

  const [myProfile, setMyProfile] = useState({ username: 'Moi', avatar: 'player1' });

  useEffect(() => {
    if(socket.connected) socket.emit('get_profile');
    const handleProfile = (data: any) => {
        if (data) setMyProfile(data);
    };
    socket.on('user_profile', handleProfile);
    return () => { socket.off('user_profile', handleProfile); }
  }, []);

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      toast.success('Code copié !');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Vérification de l'état prêt
  // IMPORTANT: conversion string pour comparaison sûre
  const isCurrentUserReady = players.find(p => String(p.id) === String(currentUserId))?.isReady;
  const readyCount = players.filter(p => p.isReady).length;
  const hasMinPlayers = players.length >= 2;
  const isGameRunning = players.some(p => p.isInGame);
  
  // TOUT LE MONDE doit être prêt pour lancer (y compris le host)
  const allReady = readyCount === players.length && players.length > 0;
  
  const canStart = isHost && allReady && hasMinPlayers && !isGameRunning;

  const handleLeaveConfirm = () => {
    setShowLeaveDialog(false);
    onLeave();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setShowLeaveDialog(true)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Quitter le salon
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full">
            <span className="font-bold text-primary">{roomName}</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-xs font-medium uppercase">
              {gameSettings?.gameType}
            </span>
            <span>{gameSettings?.soundCount} sons</span>
            <span>{gameSettings?.guessDuration}s</span>
            <span>{gameSettings?.difficulty}</span>
            <span className="w-1 h-1 rounded-full bg-border" />
            <span className={cn(hasMinPlayers ? "" : "text-orange-500 font-bold")}>
                {players.length}/{maxPlayers} joueurs
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          <Button 
            variant="ghost" 
            className="flex items-center gap-3 pl-2 pr-4 py-1 h-auto rounded-full hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
            onClick={() => navigate('/profile')}
          >
            <Avatar className="h-8 w-8 border border-primary/20">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${myProfile.avatar}`} />
                <AvatarFallback>{myProfile.username[0]}</AvatarFallback>
            </Avatar>
            <span className="font-semibold text-sm hidden sm:block">
                {myProfile.username}
            </span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container max-w-6xl mx-auto py-4 px-4 flex flex-col overflow-hidden">
        {isHost && (
            <div className="flex justify-center mb-4">
                <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-2 border-primary/50 hover:bg-primary/10"
                    onClick={onOpenSettings}
                >
                    <Settings className="h-4 w-4" />
                    Configurer la partie
                </Button>
            </div>
        )}

        {/* STATUS BAR */}
        <div className="flex justify-center mb-6 shrink-0">
          <div className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full border transition-colors",
              canStart ? "bg-secondary/50 border-border" : "bg-orange-500/10 border-orange-500/30 text-orange-500"
          )}>
            <div className={cn(
                "w-2 h-2 rounded-full",
                canStart ? "bg-success animate-pulse" : (hasMinPlayers ? "bg-yellow-500" : "bg-orange-500")
            )} />
            <span className="text-sm font-medium">
              {!hasMinPlayers 
                ? "En attente d'au moins 2 joueurs..." 
                : (isGameRunning ? "Une partie est en cours..." : (allReady ? "Tout le monde est prêt !" : `En attente... ${readyCount}/${players.length} prêts`))
              }
            </span>
          </div>
        </div>

        {/* Grid Joueurs - Modification ici : Ajout de padding p-4 pour éviter de couper les cartes */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 custom-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-fr pb-4">
            {players.map((player) => (
                <div 
                key={player.id}
                className={cn(
                    "relative group p-4 rounded-xl border transition-all duration-300 flex flex-col items-center justify-between gap-3 bg-card/50 h-full min-h-[160px] shadow-sm",
                    player.isInGame 
                    ? "border-purple-500/50 bg-purple-500/10" 
                    : (player.isReady 
                        ? "border-success/50 bg-success/5 shadow-[0_0_15px_-3px_rgba(34,197,94,0.3)] scale-[1.02]" 
                        : "border-border hover:border-primary/50"),
                    String(player.id) === String(currentUserId) && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
                >
                {player.isHost && (
                    <div className="absolute top-2 left-2 text-yellow-500" title="Hôte">
                    <Crown className="h-4 w-4 fill-current" />
                    </div>
                )}
                
                {isHost && !player.isHost && onTransferHost && (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 text-muted-foreground hover:text-yellow-500"
                            title="Donner le lead"
                            onClick={() => onTransferHost(player.id)}
                        >
                            <Crown className="h-3 w-3" />
                        </Button>
                    </div>
                )}
                
                {/* BADGE EN JEU */}
                {player.isInGame && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-purple-500 text-white text-[9px] font-bold animate-pulse">
                        EN JEU
                    </div>
                )}
                
                {/* CHECK MARK PRET */}
                {!player.isInGame && player.isReady && (
                    <div className="absolute -top-1 -right-1 bg-success text-success-foreground p-0.5 rounded-full shadow-lg animate-in zoom-in spin-in-12">
                    <Check className="h-3 w-3" />
                    </div>
                )}

                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <Avatar className={cn("h-16 w-16 border-4 shadow-lg transition-colors", player.isReady ? "border-success" : "border-background")}>
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatar}`} />
                        <AvatarFallback>{player.name?.[0] || "?"}</AvatarFallback>
                    </Avatar>

                    <div className="text-center w-full">
                        <div className="font-bold text-sm truncate px-2">{player.name || "Joueur"}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                        <span>Niv. {player.level}</span>
                        <span className={cn("font-medium", rankColors[player.rank?.toLowerCase()] || "text-muted-foreground")}>
                            {player.rank} {player.rankTier}
                        </span>
                        </div>
                    </div>
                </div>
                
                <div className="mt-auto pt-2 border-t border-white/5 w-full text-center">
                    <div className="text-[10px] font-medium text-yellow-500 flex items-center justify-center gap-1">
                        <Trophy className="h-3 w-3" />
                        {player.totalWins} victoires
                    </div>
                </div>
                </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, maxPlayers - players.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="p-4 rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-3 opacity-40 min-h-[160px] h-full hover:opacity-60 transition-opacity">
                <div className="w-12 h-12 rounded-full bg-secondary/30 flex items-center justify-center">
                    <span className="text-xl text-muted-foreground">?</span>
                </div>
                <span className="text-xs text-muted-foreground">En attente...</span>
                </div>
            ))}
            </div>
        </div>

        {/* Action Bar */}
        <div className="mt-4 shrink-0 flex flex-col items-center gap-4 pb-2">
          
          <div className="flex items-center gap-2 bg-secondary/30 p-1 pl-4 rounded-full border border-white/10">
            <span className="text-sm text-muted-foreground mr-2">Code:</span>
            <div className="font-mono font-bold tracking-widest text-lg min-w-[80px] text-center">
              {showCode ? roomCode : '••••••'}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-white/10 w-8 h-8"
              onClick={() => setShowCode(!showCode)}
            >
              {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              variant={copied ? "default" : "secondary"}
              size="icon"
              className="rounded-full w-8 h-8"
              onClick={handleCopyCode}
            >
              {copied ? <CheckIcon className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="w-full max-w-md flex flex-col items-center gap-3">
            
            {/* BOUTON PRÊT POUR TOUT LE MONDE (Même le Host) */}
            <Button
                variant={isCurrentUserReady ? "outline" : "glow"}
                size="lg"
                onClick={onToggleReady}
                disabled={isGameRunning} 
                className={cn("w-full md:w-auto min-w-[200px]", isCurrentUserReady && "bg-secondary/50 border-success/50 text-success")}
            >
                {isGameRunning ? "PARTIE EN COURS" : (isCurrentUserReady ? "ANNULER (PRÊT)" : "PRÊT !")}
            </Button>

            {/* BOUTON LANCER (Seulement pour Host et si tout le monde est prêt) */}
            {isHost && (
              <Button
                variant="default"
                size="lg"
                onClick={onStartGame}
                disabled={!canStart} 
                className={cn(
                    "w-full md:w-auto min-w-[200px] transition-all gap-2", 
                    !canStart && "opacity-50 grayscale cursor-not-allowed"
                )}
              >
                <Play className={cn("h-4 w-4", !canStart && "hidden")} fill="currentColor" />
                {isGameRunning 
                    ? "Partie en cours..." 
                    : (hasMinPlayers 
                        ? (allReady ? "LANCER LA PARTIE" : "Attente joueurs prêts...") 
                        : "Attente joueurs...")
                }
              </Button>
            )}
          </div>
        </div>
      </main>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter le salon ?</AlertDialogTitle>
            <AlertDialogDescription>
              {isHost 
                ? "En tant qu'hôte, si vous quittez, le salon sera dissous pour tout le monde (sauf si d'autres joueurs sont présents, un nouvel hôte sera désigné)." 
                : "Vous allez être déconnecté de ce salon."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Quitter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}