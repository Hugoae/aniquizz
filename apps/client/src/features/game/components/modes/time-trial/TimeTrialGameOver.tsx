import { useState } from 'react';
import { ArrowLeft, RotateCcw, ListMusic, Check, X, Timer, Eye, Shuffle, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar'; 

interface TimeTrialGameOverProps {
    players: any[];
    currentUserId: string;
    onLeave: () => void;
    onReplay: () => void;
    history?: any[];
    settings?: any; 
    victoryData?: any; 
}

export function TimeTrialGameOver({ 
    players, 
    currentUserId, 
    onLeave, 
    onReplay, 
    history,
    settings,
    victoryData
}: TimeTrialGameOverProps) {
  
  const [showDetail, setShowDetail] = useState(false);
  
  const myPlayer = players.find((p:any) => String(p.id) === String(currentUserId)) || players[0];
  const score = myPlayer?.score || 0;
  
  // Données Score vs Target
  const targetScore = victoryData?.targetScore || 10; 
  const isVictory = victoryData?.isVictory || false;
  const diffLabel = victoryData?.difficultyLabel || 'MOYEN';
  const survivalTime = victoryData?.survivalTime || 0;

  // Calcul Barre de progression (Basé sur le SCORE maintenant)
  // MaxScale : Si on explose le score, la barre s'adapte
  const maxScale = Math.max(score, targetScore * 1.2);
  const progressPercent = maxScale > 0 ? Math.min(100, (score / maxScale) * 100) : 0;
  const targetPercent = maxScale > 0 ? Math.min(100, (targetScore / maxScale) * 100) : 80;

  const sourceLabel = settings?.soundSelection === 'watched' ? 'Watched' : settings?.soundSelection === 'playlist' ? 'Playlist' : 'Aléatoire';

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background animate-fade-in overflow-y-auto custom-scrollbar">
        <div className="w-full max-w-5xl flex flex-col gap-6 p-4 md:p-8 min-h-screen md:min-h-0">
            
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground bg-secondary/30 p-3 rounded-md border border-white/5 mx-auto">
                <Badge variant="outline" className="gap-1 border-cyan-500/30 text-cyan-400 font-black tracking-wider">
                    <Timer className="h-3 w-3" /> TIME TRIAL
                </Badge>
                <div className="w-px h-3 bg-border" />
                <div className="flex items-center gap-1 uppercase font-bold text-xs text-white/80">
                    {diffLabel}
                </div>
                <div className="w-px h-3 bg-border" />
                <div className="flex items-center gap-1 text-xs">
                    {sourceLabel === 'Watched' ? <Eye className="h-3 w-3" /> : <Shuffle className="h-3 w-3" />} 
                    {sourceLabel}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* GAUCHE : SCORE & RÉSULTAT */}
                <div className="lg:col-span-1 space-y-6">
                    <div className={cn("glass-card p-6 flex flex-col items-center gap-6 border-2 relative overflow-hidden transition-colors duration-500", isVictory ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5")}>
                        <div className="text-center z-10">
                            <h1 className={cn("text-4xl font-black italic tracking-tighter uppercase", isVictory ? "text-green-400 drop-shadow-glow" : "text-red-500")}>
                                {isVictory ? "VICTOIRE" : "DÉFAITE"}
                            </h1>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                Temps Survécu : <span className="text-white">{survivalTime.toFixed(1)}s</span>
                            </p>
                        </div>
                        
                        <div className="relative z-10">
                            <UserAvatar avatar={myPlayer?.avatar} username={myPlayer?.username} className={cn("h-32 w-32 border-4 shadow-2xl", isVictory ? "border-green-500" : "border-red-500/50 grayscale-[0.5]")} />
                        </div>

                        <div className="text-center space-y-1 z-10">
                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Score Final</div>
                            <h2 className="text-5xl font-black tracking-tighter flex items-center justify-center gap-2">
                                {score} <span className="text-lg text-muted-foreground font-medium">pts</span>
                            </h2>
                        </div>

                        {/* ✅ BARRE DE PROGRESSION (SCORE / TARGET) */}
                        <div className="w-full space-y-2 z-10">
                            <div className="h-4 w-full bg-black/40 rounded-full relative overflow-hidden border border-white/5">
                                {/* Progression Joueur */}
                                <div 
                                    className={cn("h-full transition-all duration-1000 ease-out rounded-full", isVictory ? "bg-green-500" : "bg-cyan-500")} 
                                    style={{ width: `${progressPercent}%` }} 
                                />
                                {/* Ligne Objectif */}
                                <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,1)] z-20" style={{ left: `${targetPercent}%` }} />
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase">
                                <span>0</span>
                                <span className={isVictory ? "text-green-400" : "text-red-400"}>Objectif: {targetScore} pts</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Button onClick={onLeave} variant="outline" className="h-12 gap-2 border-white/10 hover:bg-white/5"><ArrowLeft className="h-4 w-4" /> Retour Lobby</Button>
                        <Button onClick={onReplay} variant="glow" className="h-12 gap-2"><RotateCcw className="h-4 w-4" /> Rejouer</Button>
                    </div>
                </div>

                {/* DROITE : HISTORIQUE DÉTAILLÉ (Inchangé) */}
                <div className="lg:col-span-2 glass-card bg-card/30 flex flex-col overflow-hidden max-h-[600px]">
                    <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                        <h3 className="font-bold flex items-center gap-2"><ListMusic className="h-4 w-4 text-cyan-400" /> Historique de la session</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowDetail(true)} className="text-xs h-7">Agrandir</Button>
                    </div>
                    
                    <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar flex-1">
                        {history?.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-background/60 border border-white/5 hover:border-cyan-500/30 transition-all">
                                <div className="flex flex-col items-center justify-center w-10 gap-1">
                                    <span className="text-[10px] text-muted-foreground font-mono">#{history.length - i}</span>
                                    <div className={cn("p-1.5 rounded-full", item.status === 'success' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500")}>
                                        {item.status === 'success' ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                    </div>
                                </div>
                                <div className="relative h-10 w-10 rounded overflow-hidden shrink-0 border border-white/10">
                                    <img src={item.cover} className="object-cover h-full w-full" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-bold text-sm truncate">{item.anime}</span>
                                        <span className="text-[9px] px-1 py-0.5 rounded bg-white/5 border border-white/5">{item.type}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">{item.title}</div>
                                </div>
                                <div className="text-right min-w-[50px]">
                                    <div className={cn("font-bold font-mono text-sm", item.status === 'success' ? "text-green-400" : "text-red-400")}>
                                        {item.status === 'success' ? '+5s' : item.status === 'skip' ? '-5s' : '0s'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <Dialog open={showDetail} onOpenChange={setShowDetail}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col bg-background/95 backdrop-blur-xl border-white/10 sm:rounded-xl">
                <DialogHeader><DialogTitle>Historique Complet</DialogTitle></DialogHeader>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-1 space-y-2">
                     {history?.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-2 rounded bg-white/5 border border-white/5">
                            <span className="font-bold w-6 text-center text-muted-foreground">{history.length - i}</span>
                            <span className={cn("text-xs font-bold px-2 py-1 rounded", item.status === 'success' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>{item.status === 'success' ? 'GAGNÉ' : 'PERDU'}</span>
                            <span className="truncate flex-1">{item.anime}</span>
                        </div>
                     ))}
                </div>
            </DialogContent>
        </Dialog>
    </div>
  );
}