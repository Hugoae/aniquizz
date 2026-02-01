import { useState } from 'react';
import { ArrowLeft, RotateCcw, ListMusic, Check, X, BrainCircuit, BarChart3, Medal, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar'; 
import { getRank } from '@aniquizz/shared';

interface StandardGameOverProps {
    players: any[];
    currentUserId: string;
    onLeave: () => void;
    onReplay: () => void;
    gameMode?: string;
    history?: any[];
    settings?: any;
    victoryData?: any; 
}

export function StandardGameOver({ 
    players, 
    currentUserId, 
    onLeave, 
    onReplay, 
    gameMode, 
    history, 
    settings, 
    victoryData 
}: StandardGameOverProps) {
  
  const [showMultiDetail, setShowMultiDetail] = useState(false);
  
  const myPlayer = players.find((p:any) => String(p.id) === String(currentUserId)) || players[0];
  const score = myPlayer?.score || 0;
  const totalRounds = history && history.length > 0 ? history.length : (settings?.soundCount || 10);
  const maxPossibleScore = victoryData?.totalMaxScore || (totalRounds * 5);
  const rankData = getRank(score, maxPossibleScore);

  // ===========================================================================
  // MODE SOLO
  // ===========================================================================
  if (gameMode === 'solo') {
      const targetScore = victoryData?.soloTargetScore || Math.ceil(maxPossibleScore * 0.5);
      const isSuccess = score >= targetScore;
      const progressPercent = Math.min(100, (score / maxPossibleScore) * 100);
      const targetPercent = Math.min(100, (targetScore / maxPossibleScore) * 100);
      const correctCount = history ? history.filter((r: any) => r.isCorrect).length : 0;
      const accuracy = Math.round((correctCount / (history?.length || 1)) * 100);

      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background animate-fade-in overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-5xl flex flex-col gap-6 p-4 md:p-8 min-h-screen md:min-h-0">
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground bg-secondary/30 p-3 rounded-full border border-white/5 mx-auto">
                    <Badge variant="outline" className="gap-1 border-primary/30 text-primary"><BrainCircuit className="h-3 w-3" /> Solo</Badge>
                    <div className="flex items-center gap-1"><ListMusic className="h-3 w-3" /> {settings?.soundCount} sons</div>
                    <div className="w-px h-3 bg-border" />
                    <div className="flex items-center gap-1 uppercase font-bold text-xs">{victoryData?.soloDifficulty || "Normal"}</div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* GAUCHE : RÉSULTAT */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className={cn("glass-card p-6 flex flex-col items-center gap-6 border-2 relative overflow-hidden transition-colors duration-500", isSuccess ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5")}>
                            <div className="text-center z-10">
                                <h1 className={cn("text-4xl font-black italic tracking-tighter uppercase", isSuccess ? "text-green-400 drop-shadow-glow" : "text-red-500")}>{isSuccess ? "VICTOIRE" : "DÉFAITE"}</h1>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Précision : {accuracy}%</p>
                            </div>
                            <div className="relative z-10">
                                <UserAvatar avatar={myPlayer?.avatar} username={myPlayer?.name || myPlayer?.username} className={cn("h-32 w-32 border-4 shadow-2xl", isSuccess ? "border-green-500" : "border-red-500/50 grayscale-[0.5]")} />
                                <div className={cn("absolute -bottom-2 -right-2 px-3 py-1 bg-card border border-border rounded-lg font-black text-2xl shadow-lg", rankData.color)}>{rankData.label}</div>
                            </div>
                            <div className="text-center space-y-1 z-10">
                                <h2 className="text-5xl font-black tracking-tighter">{score} <span className="text-lg text-muted-foreground font-medium">/ {maxPossibleScore}</span></h2>
                            </div>
                            <div className="w-full space-y-2 z-10">
                                <div className="h-4 w-full bg-black/40 rounded-full relative overflow-hidden border border-white/5">
                                    <div className={cn("h-full transition-all duration-1000 ease-out rounded-full", isSuccess ? "bg-green-500" : "bg-primary")} style={{ width: `${progressPercent}%` }} />
                                    <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] z-20" style={{ left: `${targetPercent}%` }} />
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase"><span>0</span><span className={isSuccess ? "text-green-400" : "text-red-400"}>Requis: {targetScore}</span><span>Max: {maxPossibleScore}</span></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {/* ✅ FIX: Changement texte bouton Accueil -> Retour Lobby */}
                            <Button onClick={onLeave} variant="outline" className="h-12 gap-2 border-white/10 hover:bg-white/5"><ArrowLeft className="h-4 w-4" /> Retour Lobby</Button>
                            <Button onClick={onReplay} variant="glow" className="h-12 gap-2"><RotateCcw className="h-4 w-4" /> Rejouer</Button>
                        </div>
                    </div>

                    {/* DROITE : HISTORIQUE */}
                    <div className="lg:col-span-2 glass-card bg-card/30 flex flex-col overflow-hidden max-h-[600px]">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between"><h3 className="font-bold flex items-center gap-2"><ListMusic className="h-4 w-4 text-primary" /> Détail de la partie</h3><span className="text-xs text-muted-foreground">{history?.length} rounds</span></div>
                        <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar flex-1">
                            {history?.map((round: any, i: number) => (
                                <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-background/60 border border-white/5 hover:border-primary/30 hover:bg-secondary/40 transition-all cursor-pointer">
                                    <div className="flex flex-col items-center justify-center w-10 gap-1"><span className="text-[10px] text-muted-foreground font-mono">#{round.round}</span><div className={cn("p-1.5 rounded-full", round.isCorrect ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500")}>{round.isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}</div></div>
                                    <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5"><span className="font-bold text-base truncate">{round.song.anime}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">{round.song.type}</span></div><div className="text-sm text-muted-foreground truncate">{round.song.title}</div></div>
                                    <div className="text-right min-w-[60px]"><div className={cn("font-bold text-lg", round.isCorrect ? "text-green-400" : "text-muted-foreground/50")}>{round.isCorrect ? `+${round.points}` : "0"}</div></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // ===========================================================================
  // MODE MULTI STANDARD (Reste inchangé)
  // ===========================================================================
  const sortedPlayers = [...players].sort((a:any, b:any) => b.score - a.score);
  const [winner, second, third] = sortedPlayers;
  const winnerCount = victoryData?.multiWinnerCount || 1;
  const myRank = sortedPlayers.findIndex(p => String(p.id) === String(currentUserId));
  const isPlayerWinner = myRank < winnerCount;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md animate-fade-in p-4 lg:p-10 overflow-hidden">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 h-full max-h-[800px]">
        
        {/* PODIUM */}
        <div className="flex flex-col h-full">
            <div className="text-center mb-6">
                <h1 className="text-4xl md:text-6xl font-black mb-2 italic uppercase tracking-tighter">
                    {isPlayerWinner ? <span className="text-yellow-400 drop-shadow-glow">Victoire !</span> : <span className="text-muted-foreground">Terminé !</span>}
                </h1>
                <p className="text-muted-foreground text-lg">{isPlayerWinner ? "Bravo, belle performance !" : `Vous avez fini ${myRank + 1}ème.`}</p>
            </div>
            
            {/* Ma carte perso */}
            <div onClick={() => setShowMultiDetail(true)} className="mx-auto w-full max-w-md mb-8 cursor-pointer hover:scale-105 transition-transform duration-200">
                <div className="glass-card bg-card/60 border border-white/10 p-4 rounded-2xl flex items-center justify-between shadow-lg hover:border-primary/50 group">
                    <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black border", rankData.color, "bg-background")}>{rankData.label}</div>
                        <div><div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Votre Score</div><div className="text-2xl font-black text-foreground">{score} <span className="text-sm text-muted-foreground font-normal">pts</span></div></div>
                    </div>
                    <BarChart3 className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
            </div>

            {/* Podium Visuel */}
            <div className="flex items-end justify-center gap-4 h-64 w-full px-4 mb-8 mt-auto">
                {second && ( <div className="flex flex-col items-center gap-2 animate-slide-up" style={{ animationDelay: '0.2s' }}> <div className="relative"> <UserAvatar avatar={second.avatar} username={second.name} className="h-16 w-16 border-4 border-gray-400 shadow-lg" /> {winnerCount >= 2 && <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">WIN</div>} </div> <div className="flex flex-col items-center w-24 bg-gray-400/20 border-t-4 border-gray-400 rounded-t-lg h-32 justify-end pb-4"> <span className="font-bold text-2xl">{second.score}</span> <span className="text-xs font-bold uppercase text-gray-400">2ème</span> </div> </div> )}
                {winner && ( <div className="flex flex-col items-center gap-2 z-10 animate-slide-up"> <Crown className="h-8 w-8 text-yellow-400 mb-1 animate-bounce" /> <UserAvatar avatar={winner.avatar} username={winner.name} className="h-24 w-24 border-4 border-yellow-400 shadow-glow" /> <div className="flex flex-col items-center w-28 bg-yellow-400/20 border-t-4 border-yellow-400 rounded-t-lg h-44 justify-end pb-4 relative overflow-hidden"> <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/10 to-transparent" /> <span className="font-bold text-3xl text-yellow-400">{winner.score}</span> <span className="text-sm font-bold uppercase text-yellow-500">1er</span> </div> </div> )}
                {third && ( <div className="flex flex-col items-center gap-2 animate-slide-up" style={{ animationDelay: '0.4s' }}> <div className="relative"> <UserAvatar avatar={third.avatar} username={third.name} className="h-16 w-16 border-4 border-orange-700 shadow-lg" /> {winnerCount >= 3 && <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">WIN</div>} </div> <div className="flex flex-col items-center w-24 bg-orange-700/20 border-t-4 border-orange-700 rounded-t-lg h-24 justify-end pb-4"> <span className="font-bold text-2xl">{third.score}</span> <span className="text-xs font-bold uppercase text-orange-700">3ème</span> </div> </div> )}
            </div>
        </div>

        {/* CLASSEMENT LISTE */}
        <div className="bg-card/50 border border-white/5 rounded-3xl p-6 flex flex-col h-full overflow-hidden backdrop-blur-sm shadow-2xl">
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2"><Medal className="h-5 w-5 text-primary" /> Classement complet</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {sortedPlayers.map((p: any, index: number) => {
                    const isMe = String(p.id) === String(currentUserId);
                    const rank = index + 1;
                    const isRowWinner = index < winnerCount;
                    return (
                        <div key={p.id} className={cn("flex items-center gap-4 p-3 rounded-xl transition-all border", isMe ? "bg-primary/20 border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.3)]" : "bg-secondary/30 border-transparent hover:bg-secondary/50")}>
                            <div className="flex items-center gap-4 flex-1">
                                <div className="font-mono font-bold text-muted-foreground">#{rank}</div>
                                <UserAvatar avatar={p.avatar} username={p.name} className="h-10 w-10 border border-white/10" />
                                <div className="flex flex-col">
                                    <span className={cn("font-bold text-lg leading-none flex items-center gap-2", isMe ? "text-primary" : "text-foreground")}>
                                        {p.name} {isMe && "(Moi)"}
                                        {isRowWinner && <Crown className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right"><span className="font-mono font-bold text-xl">{p.score}</span><span className="text-xs text-muted-foreground ml-1">pts</span></div>
                        </div>
                    );
                })}
            </div>
            <div className="pt-6 mt-auto"><Button onClick={onLeave} size="lg" variant="outline" className="w-full gap-2 border-white/10 hover:bg-white/5 h-14 text-lg hover:text-primary transition-colors"><ArrowLeft className="h-5 w-5" /> Retour au Lobby</Button></div>
        </div>
      </div>

      {/* MODALE DÉTAIL PERFORMANCE */}
      <Dialog open={showMultiDetail} onOpenChange={setShowMultiDetail}>
        <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[85vh] flex flex-col overflow-y-auto custom-scrollbar">
             <DialogHeader><DialogTitle className="flex items-center gap-3 text-xl"><BrainCircuit className="h-5 w-5 text-primary" /> Détail de votre performance</DialogTitle></DialogHeader>
            <div className="flex-1 space-y-3 pt-4">
                {history?.map((round: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-background/50 border border-white/5">
                         <div className="flex flex-col items-center justify-center w-8 gap-1"><span className="text-[10px] text-muted-foreground font-mono">#{round.round}</span><div className={cn("p-1 rounded-full", round.isCorrect ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500")}>{round.isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}</div></div>
                        <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5"><span className="font-bold text-sm truncate">{round.song.anime}</span></div><div className="text-xs text-muted-foreground truncate">{round.song.title}</div></div>
                        <div className="text-right font-bold text-sm">{round.isCorrect ? <span className="text-green-400">+{round.points}</span> : <span className="text-muted-foreground">0</span>}</div>
                    </div>
                ))}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}