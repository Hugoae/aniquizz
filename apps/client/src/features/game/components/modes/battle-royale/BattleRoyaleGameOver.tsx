import { ArrowLeft, RotateCcw, ListMusic, Check, X, Crown, Skull } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar'; 

interface BattleRoyaleGameOverProps {
    players: any[];
    currentUserId: string;
    onLeave: () => void;
    onReplay: () => void;
    history?: any[];
}

export function BattleRoyaleGameOver({ 
    players, 
    currentUserId, 
    onLeave, 
    onReplay, 
    history = []
}: BattleRoyaleGameOverProps) {
    
    // Stats du joueur actuel
    const myPlayer = players.find((p: any) => String(p.id) === String(currentUserId)) || players[0];
    
    // Tri : Les survivants d'abord (non éliminés), puis par score décroissant
    // Note : Dans un vrai BR, on trierait par "ordre d'élimination inversé", 
    // mais ici on simplifie : le vainqueur est celui qui n'est pas éliminé.
    const sortedPlayers = [...players].sort((a: any, b: any) => {
        if (a.isEliminated === b.isEliminated) return b.score - a.score;
        return a.isEliminated ? 1 : -1; // Les éliminés à la fin
    });
    
    const myRank = sortedPlayers.findIndex((p: any) => String(p.id) === String(currentUserId)) + 1;
    const isWinner = myRank === 1; // En BR, le 1er est le vainqueur
    
    // Calcul des rounds survécus
    const roundsSurvived = !myPlayer.isEliminated 
        ? (history?.length || 0) 
        : (history?.filter((h: any) => h.userAnswer !== null).length || 0);

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md animate-fade-in p-4 lg:p-10 overflow-hidden">
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 h-full max-h-[800px]">
                
                {/* --- GAUCHE: RÉSULTAT DUEL --- */}
                <div className="flex flex-col justify-center items-center h-full space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className={cn(
                            "text-6xl md:text-8xl font-black italic tracking-tighter uppercase", 
                            isWinner ? "text-yellow-400 drop-shadow-glow" : "text-slate-500"
                        )}>
                            {isWinner ? "TOP 1" : `TOP ${myRank}`}
                        </h1>
                        <p className="text-xl md:text-2xl font-bold text-muted-foreground uppercase tracking-widest">
                            {isWinner ? "Champion de l'arène" : "Éliminé"}
                        </p>
                    </div>

                    <div className="relative">
                        <UserAvatar 
                            avatar={myPlayer?.avatar}
                            username={myPlayer?.name || myPlayer?.username}
                            className={cn(
                                "h-40 w-40 border-4 shadow-2xl",
                                isWinner ? "border-yellow-400 shadow-yellow-500/20" : "border-slate-700 grayscale"
                            )}
                        />
                        {isWinner && <Crown className="absolute -top-8 -right-4 h-16 w-16 text-yellow-400 animate-bounce" />}
                        {!isWinner && <Skull className="absolute -bottom-4 -right-4 h-12 w-12 text-slate-500" />}
                    </div>

                    <div className="bg-secondary/30 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-muted-foreground uppercase text-xs font-bold">Rounds Survécus</span>
                            <span className="text-2xl font-black text-white">{roundsSurvived}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground uppercase text-xs font-bold">Précision</span>
                            <span className="text-xl font-bold text-primary">
                                {Math.round((history?.filter((r: any) => r.isCorrect).length || 0) / (history?.length || 1) * 100)}%
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                        <Button onClick={onLeave} variant="outline" className="h-14 text-lg border-white/10 hover:bg-white/5">
                            <ArrowLeft className="h-5 w-5 mr-2" /> Quitter
                        </Button>
                        <Button onClick={onReplay} variant="glow" className="h-14 text-lg">
                            <RotateCcw className="h-5 w-5 mr-2" /> Rejouer
                        </Button>
                    </div>
                </div>

                {/* --- DROITE: HISTORIQUE BR (Simplifié, sans points) --- */}
                <div className="bg-card/50 border border-white/5 rounded-3xl p-6 flex flex-col h-full overflow-hidden backdrop-blur-sm shadow-2xl">
                    <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                        <ListMusic className="h-5 w-5 text-primary" />
                        Historique de la survie
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {history?.map((round: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-background/40 border border-white/5 hover:bg-white/5 transition-all">
                                <div className="flex flex-col items-center justify-center w-10 gap-1">
                                    <span className="text-[10px] text-muted-foreground font-mono">#{round.round}</span>
                                    <div className={cn("p-1.5 rounded-full", round.isCorrect ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500")}>
                                        {round.isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-bold text-sm truncate text-white">{round.song.anime}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">{round.song.title}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}