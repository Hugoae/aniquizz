import { useState, useEffect } from 'react';
import { ArrowLeft, RotateCcw, ListMusic, Check, X, BrainCircuit, BarChart3, Medal, Crown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar'; 
import { getMedalMeta } from '@aniquizz/shared';
import { AddFriendButton } from '@/features/friends/AddFriendButton';

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
  
  const myPlayerLive = players.find((p:any) => String(p.id) === String(currentUserId)) || players[0];
  const score = myPlayerLive?.score || 0;
  const totalRounds = history && history.length > 0 ? history.length : (settings?.soundCount || 10);
  const maxPossibleScore = victoryData?.totalMaxScore || (totalRounds * 5);

  // ===========================================================================
  // MODE SOLO
  // ===========================================================================
  if (gameMode === 'solo') {
      const me = victoryData?.rankings?.find((p: any) => String(p.id) === String(currentUserId));
      const soloMedal = victoryData?.soloMedal ?? null;
      const medalMeta = getMedalMeta(soloMedal);
      const isSuccess = !!soloMedal;
      const correctCount = history ? history.filter((r: any) => r.isCorrect).length : 0;
      const accuracy = Math.round((correctCount / (history?.length || 1)) * 100);
      // Mastery ratio (earned score / best obtainable) drives the medal + bar.
      const scoreRatio = maxPossibleScore > 0 ? score / maxPossibleScore : 0;
      const targetRatio = typeof victoryData?.soloTargetRatio === 'number' ? victoryData.soloTargetRatio : 0.5;
      const progressPercent = Math.min(100, scoreRatio * 100);
      const targetPercent = Math.min(100, targetRatio * 100);
      const myXpEarned = me?.xpEarned;

      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background animate-fade-in overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-5xl flex flex-col gap-6 p-4 md:p-8 min-h-screen md:min-h-0">
                {/* ✅ rounded-md pour le bandeau d'info */}
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground bg-secondary/30 p-3 rounded-md border border-white/5 mx-auto">
                    <Badge variant="outline" className="gap-1 border-primary/30 text-primary"><BrainCircuit className="h-3 w-3" /> Solo</Badge>
                    <div className="flex items-center gap-1"><ListMusic className="h-3 w-3" /> {settings?.soundCount} sons</div>
                    <div className="w-px h-3 bg-border" />
                    <div className="flex items-center gap-1 uppercase font-bold text-xs">{victoryData?.soloDifficulty || "Normal"}</div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* GAUCHE : RÉSULTAT */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* ✅ glass-card (rounded-xl) */}
                        <div className={cn("glass-card p-6 flex flex-col items-center gap-6 border-2 relative overflow-hidden transition-colors duration-500", isSuccess ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5")}>
                            <div className="text-center z-10">
                                <h1 className={cn("text-4xl font-black italic tracking-tighter uppercase", isSuccess ? "text-green-400 drop-shadow-glow" : "text-red-500")}>{isSuccess ? "VICTOIRE" : "DÉFAITE"}</h1>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Précision : {accuracy}%</p>
                            </div>
                            <div className="relative z-10">
                                <UserAvatar avatar={myPlayerLive?.avatar} username={myPlayerLive?.name || myPlayerLive?.username} className={cn("h-32 w-32 border-4 shadow-2xl", isSuccess ? "border-green-500" : "border-red-500/50 grayscale-[0.5]")} />
                                {/* Médaille de performance (précision), ou rien si non atteinte */}
                                {medalMeta && (
                                    <div className="absolute -bottom-2 -right-2 flex items-center gap-1 px-3 py-1 bg-card border border-border rounded-lg font-black text-sm shadow-lg" style={{ color: medalMeta.color }}>
                                        <Medal className="h-4 w-4" /> {medalMeta.label}
                                    </div>
                                )}
                            </div>
                            <div className="text-center space-y-1 z-10">
                                <h2 className="text-5xl font-black tracking-tighter">{score} <span className="text-lg text-muted-foreground font-medium">/ {maxPossibleScore}</span></h2>
                                {typeof myXpEarned === 'number' && (
                                    <div className="flex items-center justify-center gap-1.5 text-primary font-bold text-sm">
                                        <Sparkles className="h-4 w-4" /> +{myXpEarned} XP
                                    </div>
                                )}
                            </div>
                            <div className="w-full space-y-2 z-10">
                                {/* ✅ rounded-full conservé pour la barre de progression (standard) */}
                                <div className="h-4 w-full bg-black/40 rounded-full relative overflow-hidden border border-white/5">
                                    <div className={cn("h-full transition-all duration-1000 ease-out rounded-full", isSuccess ? "bg-green-500" : "bg-primary")} style={{ width: `${progressPercent}%` }} />
                                    <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] z-20" style={{ left: `${targetPercent}%` }} />
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase"><span>0</span><span className={isSuccess ? "text-green-400" : "text-red-400"}>Requis: {Math.round(targetRatio * maxPossibleScore)}</span><span>Max: {maxPossibleScore}</span></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Button onClick={onLeave} variant="outline" className="h-12 gap-2 border-white/10 hover:bg-white/5"><ArrowLeft className="h-4 w-4" /> Retour Lobby</Button>
                            <Button onClick={onReplay} variant="glow" className="h-12 gap-2"><RotateCcw className="h-4 w-4" /> Rejouer</Button>
                        </div>
                    </div>

                    {/* DROITE : HISTORIQUE */}
                    <div className="lg:col-span-2 glass-card bg-card/30 flex flex-col overflow-hidden max-h-[600px]">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between"><h3 className="font-bold flex items-center gap-2"><ListMusic className="h-4 w-4 text-primary" /> Détail de la partie</h3><span className="text-xs text-muted-foreground">{history?.length} rounds</span></div>
                        <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar flex-1">
                            {history?.map((round: any, i: number) => (
                                // ✅ rounded-lg pour les items d'historique
                                <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-background/60 border border-white/5 hover:border-primary/30 hover:bg-secondary/40 transition-all cursor-pointer">
                                    <div className="flex flex-col items-center justify-center w-10 gap-1"><span className="text-[10px] text-muted-foreground font-mono">#{round.round}</span><div className={cn("p-1.5 rounded-full", round.isCorrect ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500")}>{round.isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}</div></div>
                                    <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5"><span className="font-bold text-base truncate">{round.song.anime}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">{round.song.type}</span></div><div className="text-sm text-muted-foreground truncate">{round.song.title}</div>{!round.isCorrect && (round.myAnswer && round.myAnswer.trim() ? (<div className="text-[11px] text-red-400/80 truncate mt-0.5">Votre réponse : <span className="line-through">{round.myAnswer}</span></div>) : (<div className="text-[11px] text-muted-foreground/60 italic truncate mt-0.5">Aucune réponse</div>))}</div>
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
  // MODE MULTI STANDARD
  // ===========================================================================
  
  const sourcePlayers = victoryData?.rankings || players;
  const sortedPlayers = [...sourcePlayers].sort((a:any, b:any) => b.score - a.score);
  
  const [winner, second, third] = sortedPlayers;
  const winnerCount = victoryData?.multiWinnerCount || 1;
  const myRankIndex = sortedPlayers.findIndex(p => String(p.id) === String(currentUserId));
  const isPlayerWinner = myRankIndex < winnerCount;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-background to-background animate-fade-in p-4 lg:p-8 overflow-hidden">
      
      {isPlayerWinner && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[50vh] bg-gradient-to-b from-yellow-500/10 to-transparent blur-3xl" />
              <div className="absolute top-10 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-bounce delay-100" />
              <div className="absolute top-20 right-1/4 w-3 h-3 bg-primary rounded-full animate-bounce delay-300" />
              <div className="absolute top-1/3 left-1/3 w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-500" />
          </div>
      )}

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 h-full max-h-[850px] z-10">
        
        <div className="lg:col-span-7 flex flex-col h-full relative">
            <div className="text-center mb-4 lg:mb-10 pt-4">
                <h1 className="text-5xl md:text-7xl font-black mb-2 italic uppercase tracking-tighter drop-shadow-xl">
                    {isPlayerWinner ? <span className="text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-glow">Victoire !</span> : <span className="text-white/90">Terminé !</span>}
                </h1>
                <p className="text-white/60 text-xl font-medium">{isPlayerWinner ? "Incroyable performance !" : `Vous terminez à la ${myRankIndex + 1}ème place.`}</p>
            </div>
            
            <div className="flex items-end justify-center gap-4 md:gap-8 h-full pb-8 md:pb-12 px-4 mt-auto">
                {/* 2ème Place */}
                {second && ( 
                    <div className="flex flex-col items-center gap-3 w-1/3 max-w-[180px] animate-slide-up" style={{ animationDelay: '0.2s' }}> 
                        <div className="relative"> 
                            <UserAvatar avatar={second.avatar} username={second.username || second.name} className="h-16 w-16 md:h-20 md:w-20 border-4 border-slate-300 shadow-xl" /> 
                            {/* ✅ rounded-md pour le badge rang */}
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-700 text-slate-200 text-xs font-black px-2 py-0.5 rounded-md border border-slate-500">#2</div>
                        </div> 
                        {/* ✅ rounded-t-xl pour le podium */}
                        <div className="w-full bg-gradient-to-b from-slate-400/20 to-slate-400/5 border-t border-l border-r border-slate-400/30 rounded-t-xl h-40 md:h-52 flex flex-col justify-end pb-6 items-center backdrop-blur-sm relative overflow-hidden group"> 
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="font-black text-3xl md:text-4xl text-slate-300 drop-shadow-md">{second.score}</span> 
                            <span className="text-[10px] md:text-xs font-bold uppercase text-slate-500 tracking-widest">Points</span> 
                        </div> 
                    </div> 
                )}
                
                {/* 1ère Place */}
                {winner && ( 
                    <div className="flex flex-col items-center gap-3 w-1/3 max-w-[200px] z-10 animate-slide-up relative -top-6"> 
                        <Crown className="h-10 w-10 md:h-12 md:w-12 text-yellow-400 mb-1 animate-bounce drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" /> 
                        <div className="relative">
                            <UserAvatar avatar={winner.avatar} username={winner.username || winner.name} className="h-24 w-24 md:h-32 md:w-32 border-4 border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.4)]" /> 
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-sm font-black px-3 py-0.5 rounded-md border border-yellow-300 shadow-lg">#1</div>
                        </div>
                        <div className="w-full bg-gradient-to-b from-yellow-500/20 to-yellow-500/5 border-t border-l border-r border-yellow-500/30 rounded-t-xl h-56 md:h-72 flex flex-col justify-end pb-8 items-center backdrop-blur-md relative overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.1)] group"> 
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-50" />
                            <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="font-black text-5xl md:text-6xl text-yellow-400 drop-shadow-md">{winner.score}</span> 
                            <span className="text-xs font-bold uppercase text-yellow-600/80 tracking-[0.2em]">Points</span> 
                        </div> 
                    </div> 
                )}
                
                {/* 3ème Place */}
                {third && ( 
                    <div className="flex flex-col items-center gap-3 w-1/3 max-w-[180px] animate-slide-up" style={{ animationDelay: '0.4s' }}> 
                        <div className="relative"> 
                            <UserAvatar avatar={third.avatar} username={third.username || third.name} className="h-16 w-16 md:h-20 md:w-20 border-4 border-orange-700 shadow-xl" /> 
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-orange-900 text-orange-200 text-xs font-black px-2 py-0.5 rounded-md border border-orange-700">#3</div>
                        </div> 
                        <div className="w-full bg-gradient-to-b from-orange-700/20 to-orange-700/5 border-t border-l border-r border-orange-700/30 rounded-t-xl h-32 md:h-40 flex flex-col justify-end pb-6 items-center backdrop-blur-sm relative overflow-hidden group"> 
                            <div className="absolute inset-0 bg-gradient-to-t from-orange-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="font-black text-3xl md:text-4xl text-orange-600 drop-shadow-md">{third.score}</span> 
                            <span className="text-[10px] md:text-xs font-bold uppercase text-orange-800 tracking-widest">Points</span> 
                        </div> 
                    </div> 
                )}
            </div>
        </div>

        {/* COLONNE DROITE : CLASSEMENT */}
        <div className="lg:col-span-5 flex flex-col h-full overflow-hidden">
            {/* ✅ rounded-xl pour le conteneur principal */}
            <div className="glass-card bg-black/40 border border-white/10 rounded-xl flex flex-col h-full shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <h3 className="font-bold text-xl flex items-center gap-2 text-white"><Medal className="h-5 w-5 text-yellow-500" /> Classement Final</h3>
                    <div className="px-3 py-1 bg-black/40 rounded-md text-xs font-mono text-muted-foreground">{sortedPlayers.length} Joueurs</div>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 p-4 custom-scrollbar">
                    {sortedPlayers.map((p: any, index: number) => {
                        const isMe = String(p.id) === String(currentUserId);
                        const rank = index + 1;
                        const isPodium = rank <= 3;
                        
                        return (
                            // ✅ rounded-lg pour chaque ligne de joueur
                            <div key={p.id} className={cn(
                                "flex items-center gap-4 p-3 rounded-lg transition-all border relative overflow-hidden group",
                                isMe ? "bg-primary/20 border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.3)] ring-1 ring-primary/50" : "bg-white/5 border-transparent hover:bg-white/10"
                            )}>
                                {/* Indicateur Rang - rounded-md */}
                                <div className={cn(
                                    "w-8 h-8 flex items-center justify-center rounded-md font-black text-sm",
                                    rank === 1 ? "bg-yellow-500 text-black shadow-lg shadow-yellow-500/20" : 
                                    rank === 2 ? "bg-slate-300 text-black" :
                                    rank === 3 ? "bg-orange-700 text-white" : "bg-black/40 text-muted-foreground"
                                )}>
                                    {rank}
                                </div>

                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <UserAvatar avatar={p.avatar} username={p.username || p.name} className={cn("h-10 w-10 border border-white/10", isPodium && "ring-2 ring-white/20")} />
                                    <div className="flex flex-col min-w-0">
                                        <span className={cn("font-bold text-sm truncate flex items-center gap-2", isMe ? "text-white" : "text-white/80")}>
                                            {p.username || p.name}
                                            {isMe && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/20">Moi</span>}
                                        </span>
                                        {typeof p.matchCorrectCount === 'number' && typeof p.matchTotalCount === 'number' && p.matchTotalCount > 0 ? (
                                            <span className="text-xs text-muted-foreground/60 truncate flex items-center gap-1">
                                                <Check className="h-3 w-3 text-green-500/70" /> {p.matchCorrectCount}/{p.matchTotalCount} bonnes réponses
                                            </span>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div>
                                        <span className={cn("font-mono font-black text-xl", isPodium ? "text-white" : "text-white/60")}>{p.score}</span>
                                        <span className="text-[10px] text-muted-foreground ml-1">pts</span>
                                    </div>
                                    {typeof p.xpEarned === 'number' && p.xpEarned > 0 && (
                                        <div className="flex items-center justify-end gap-0.5 text-[10px] font-bold text-primary">
                                            <Sparkles className="h-2.5 w-2.5" /> +{p.xpEarned} XP
                                        </div>
                                    )}
                                </div>
                                {!isMe && (
                                    <AddFriendButton
                                        userId={String(p.id)}
                                        compact
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-white/5 bg-white/5 space-y-3">
                    <Button onClick={() => setShowMultiDetail(true)} variant="secondary" className="w-full gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 h-12">
                        <BrainCircuit className="h-4 w-4" /> Voir mes réponses
                    </Button>
                    <Button onClick={onLeave} size="lg" variant="outline" className="w-full gap-2 border-white/10 hover:bg-white/5 h-14 text-lg hover:text-white transition-colors text-white/60">
                        <ArrowLeft className="h-5 w-5" /> Retour au Lobby
                    </Button>
                </div>
            </div>
        </div>
      </div>

      <Dialog open={showMultiDetail} onOpenChange={setShowMultiDetail}>
        {/* ✅ rounded-xl pour la modale détail */}
        <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[85vh] flex flex-col overflow-y-auto custom-scrollbar sm:rounded-xl">
             <DialogHeader><DialogTitle className="flex items-center gap-3 text-xl"><BrainCircuit className="h-5 w-5 text-primary" /> Détail de votre performance</DialogTitle></DialogHeader>
            <div className="flex-1 space-y-3 pt-4">
                {history && history.length > 0 ? history.map((round: any, i: number) => (
                    // ✅ rounded-lg pour les items
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-background/50 border border-white/5">
                         <div className="flex flex-col items-center justify-center w-8 gap-1"><span className="text-[10px] text-muted-foreground font-mono">#{round.round}</span><div className={cn("p-1 rounded-full", round.isCorrect ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500")}>{round.isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}</div></div>
                        <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-0.5"><span className="font-bold text-sm truncate">{round.song.anime}</span></div><div className="text-xs text-muted-foreground truncate">{round.song.title}</div>{!round.isCorrect && (round.myAnswer && round.myAnswer.trim() ? (<div className="text-[11px] text-red-400/80 truncate mt-0.5">Votre réponse : <span className="line-through">{round.myAnswer}</span></div>) : (<div className="text-[11px] text-muted-foreground/60 italic truncate mt-0.5">Aucune réponse</div>))}</div>
                        <div className="text-right font-bold text-sm">{round.isCorrect ? <span className="text-green-400">+{round.points}</span> : <span className="text-muted-foreground">0</span>}</div>
                    </div>
                )) : (
                    <p className="text-center text-muted-foreground text-sm py-8">
                        Aucun détail de round disponible pour cette partie.
                    </p>
                )}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}