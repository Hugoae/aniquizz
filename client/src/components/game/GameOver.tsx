import { useState } from 'react';
import { Trophy, Medal, ArrowLeft, Check, X, RotateCcw, Clock, Music, ListMusic, BrainCircuit, Play, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// Interfaces simplifiées (plus de XpData)
interface GameOverProps {
  players: any[];
  currentUserId: string;
  onLeave: () => void;
  onReplay: () => void;
  gameMode?: string;
  history?: any[];
  settings?: any;
}

export function GameOver({ players, currentUserId, onLeave, onReplay, gameMode, history, settings }: GameOverProps) {
  const [selectedRound, setSelectedRound] = useState<any | null>(null);
  const [showMultiDetail, setShowMultiDetail] = useState(false);
  
  // Calcul des stats
  const myPlayer = players.find(p => String(p.id) === String(currentUserId)) || players[0];
  const score = myPlayer?.score || 0;
  const totalRounds = history && history.length > 0 ? history.length : (settings?.soundCount || 10);
  const correctCount = history ? history.filter((h: any) => h.isCorrect).length : 0;
  const accuracy = totalRounds > 0 ? Math.round((correctCount / totalRounds) * 100) : 0;

  let grade = 'D';
  let gradeColor = 'text-gray-500';
  if (accuracy >= 91) { grade = 'S+'; gradeColor = 'text-yellow-400 drop-shadow-glow'; }
  else if (accuracy >= 81) { grade = 'S'; gradeColor = 'text-yellow-500'; }
  else if (accuracy >= 71) { grade = 'A+'; gradeColor = 'text-green-400'; }
  else if (accuracy >= 61) { grade = 'A'; gradeColor = 'text-green-500'; }
  else if (accuracy >= 51) { grade = 'B+'; gradeColor = 'text-blue-400'; }
  else if (accuracy >= 41) { grade = 'B'; gradeColor = 'text-blue-500'; }
  else if (accuracy >= 31) { grade = 'C+'; gradeColor = 'text-orange-400'; }
  else if (accuracy >= 21) { grade = 'C'; gradeColor = 'text-orange-500'; }
  else if (accuracy >= 11) { grade = 'D+'; gradeColor = 'text-red-400'; }
  else { grade = 'D'; gradeColor = 'text-red-600'; }

  // --- MODE SOLO ---
  if (gameMode === 'solo') {
      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background animate-fade-in overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-5xl flex flex-col gap-6 p-4 md:p-8 min-h-screen md:min-h-0">
                
                {/* HEADER */}
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground bg-secondary/30 p-3 rounded-full border border-white/5 mx-auto">
                    <Badge variant="outline" className="gap-1 border-primary/30 text-primary">
                        <BrainCircuit className="h-3 w-3" /> Solo
                    </Badge>
                    <div className="flex items-center gap-1"><ListMusic className="h-3 w-3" /> {settings?.soundCount} sons</div>
                    <div className="w-px h-3 bg-border" />
                    <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {settings?.guessDuration}s</div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* GAUCHE: SCORE & RANK */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="glass-card p-6 flex flex-col items-center gap-6 border-2 border-primary/10 bg-card/40 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                            <div className="relative">
                                <Avatar className="h-32 w-32 border-4 border-background shadow-2xl">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${myPlayer?.avatar}`} />
                                    <AvatarFallback>{myPlayer?.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className={cn("absolute -bottom-2 -right-2 px-3 py-1 bg-card border border-border rounded-lg font-black text-2xl shadow-lg", gradeColor)}>
                                    {grade}
                                </div>
                            </div>
                            <div className="text-center space-y-1">
                                <h2 className="text-5xl font-black tracking-tighter">{score}</h2>
                                <p className="text-muted-foreground text-sm uppercase tracking-widest font-semibold">Points Totaux</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <div className="bg-secondary/50 p-3 rounded-xl text-center">
                                    <div className="text-2xl font-bold text-green-400">{correctCount}</div>
                                    <div className="text-[10px] text-muted-foreground uppercase">Corrects</div>
                                </div>
                                <div className="bg-secondary/50 p-3 rounded-xl text-center">
                                    <div className="text-2xl font-bold text-blue-400">{accuracy}%</div>
                                    <div className="text-[10px] text-muted-foreground uppercase">Précision</div>
                                </div>
                            </div>
                        </div>

                        {/* ACTIONS */}
                        <div className="grid grid-cols-2 gap-3">
                            <Button onClick={onLeave} variant="outline" className="h-12 gap-2 border-white/10 hover:bg-white/5">
                                <ArrowLeft className="h-4 w-4" /> Accueil
                            </Button>
                            <Button onClick={onReplay} variant="glow" className="h-12 gap-2">
                                <RotateCcw className="h-4 w-4" /> Rejouer
                            </Button>
                        </div>
                    </div>

                    {/* DROITE: DÉTAIL DES ROUNDS */}
                    <div className="lg:col-span-2 glass-card bg-card/30 flex flex-col overflow-hidden max-h-[600px]">
                        <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                            <h3 className="font-bold flex items-center gap-2">
                                <ListMusic className="h-4 w-4 text-primary" /> 
                                Détail de la partie
                            </h3>
                            <span className="text-xs text-muted-foreground">{history?.length} rounds</span>
                        </div>
                        
                        <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar flex-1">
                            {history?.map((round: any, i: number) => (
                                <div key={i} onClick={() => setSelectedRound(round)} className="flex items-center gap-4 p-3 rounded-xl bg-background/60 border border-white/5 hover:border-primary/30 hover:bg-secondary/40 transition-all">
                                    <div className="flex flex-col items-center justify-center w-10 gap-1">
                                        <span className="text-[10px] text-muted-foreground font-mono">#{round.round}</span>
                                        <div className={cn("p-1.5 rounded-full", round.isCorrect ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500")}>
                                            {round.isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="font-bold text-base truncate">{round.song.anime}</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                                                {round.song.type}
                                            </span>
                                        </div>
                                        <div className="text-sm text-muted-foreground truncate">{round.song.title}</div>
                                    </div>
                                    <div className="text-right min-w-[60px]">
                                        <div className={cn("font-bold text-lg", round.isCorrect ? "text-green-400" : "text-muted-foreground/50")}>
                                            {round.isCorrect ? `+${round.points}` : "0"}
                                        </div>
                                    </div>
                                    <Play className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // --- MODE MULTIJOUEUR ---
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const [winner, second, third] = sortedPlayers;
  const isWinner = String(winner?.id) === String(currentUserId);
  const myRank = sortedPlayers.findIndex(p => String(p.id) === String(currentUserId)) + 1;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md animate-fade-in p-4 lg:p-10 overflow-hidden">
      
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 h-full max-h-[800px]">
        {/* GAUCHE: PODIUM & BUTTONS */}
        <div className="flex flex-col h-full">
            <div className="text-center mb-6">
                <h1 className="text-4xl md:text-6xl font-black mb-2 italic uppercase tracking-tighter">
                    {isWinner ? <span className="text-yellow-400 drop-shadow-glow">Victoire !</span> : "Terminé !"}
                </h1>
                <p className="text-muted-foreground text-lg">La partie est finie. Voici les résultats.</p>
            </div>

            {/* Carte Stats Perso */}
            <div 
                onClick={() => setShowMultiDetail(true)}
                className="mx-auto w-full max-w-md mb-8 cursor-pointer hover:scale-105 transition-transform duration-200"
            >
                <div className="glass-card bg-card/60 border border-white/10 p-4 rounded-2xl flex items-center justify-between shadow-lg hover:border-primary/50 group">
                    <div className="flex items-center gap-4">
                        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black border", gradeColor, "bg-background")}>
                            {grade}
                        </div>
                        <div>
                            <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Vos Stats</div>
                            <div className="text-xs text-muted-foreground">Cliquez pour voir le détail</div>
                        </div>
                    </div>
                    
                    <div className="flex gap-4 text-right">
                        <div>
                            <div className="text-lg font-bold text-blue-400">{accuracy}%</div>
                            <div className="text-[10px] uppercase text-muted-foreground">Précision</div>
                        </div>
                    </div>
                    <BarChart3 className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
            </div>

            {/* Podium */}
            <div className="flex items-end justify-center gap-4 h-64 w-full px-4 mb-8 mt-auto">
                {second && (
                    <div className="flex flex-col items-center gap-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                        <Avatar className="h-16 w-16 border-4 border-gray-400 shadow-lg">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${second.avatar}`} />
                            <AvatarFallback>{second.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-center w-24 bg-gray-400/20 border-t-4 border-gray-400 rounded-t-lg h-32 justify-end pb-4">
                            <span className="font-bold text-2xl">{second.score}</span>
                            <span className="text-xs font-bold uppercase text-gray-400">2ème</span>
                        </div>
                    </div>
                )}
                {winner && (
                    <div className="flex flex-col items-center gap-2 z-10 animate-slide-up">
                        <Trophy className="h-8 w-8 text-yellow-400 mb-1 animate-bounce" />
                        <Avatar className="h-24 w-24 border-4 border-yellow-400 shadow-glow">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${winner.avatar}`} />
                            <AvatarFallback>{winner.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-center w-28 bg-yellow-400/20 border-t-4 border-yellow-400 rounded-t-lg h-44 justify-end pb-4 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-t from-yellow-400/10 to-transparent" />
                            <span className="font-bold text-3xl text-yellow-400">{winner.score}</span>
                            <span className="text-sm font-bold uppercase text-yellow-500">1er</span>
                        </div>
                    </div>
                )}
                {third && (
                    <div className="flex flex-col items-center gap-2 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                        <Avatar className="h-16 w-16 border-4 border-orange-700 shadow-lg">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${third.avatar}`} />
                            <AvatarFallback>{third.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-center w-24 bg-orange-700/20 border-t-4 border-orange-700 rounded-t-lg h-24 justify-end pb-4">
                            <span className="font-bold text-2xl">{third.score}</span>
                            <span className="text-xs font-bold uppercase text-orange-700">3ème</span>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* DROITE: CLASSEMENT */}
        <div className="bg-card/50 border border-white/5 rounded-3xl p-6 flex flex-col h-full overflow-hidden backdrop-blur-sm shadow-2xl">
            <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                <Medal className="h-5 w-5 text-primary" />
                Classement complet
            </h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {sortedPlayers.map((p, index) => {
                    const isMe = String(p.id) === String(currentUserId);
                    const rank = index + 1;
                    return (
                        <div key={p.id} className={cn("flex items-center gap-4 p-3 rounded-xl transition-all border", isMe ? "bg-primary/20 border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.3)]" : "bg-secondary/30 border-transparent hover:bg-secondary/50")}>
                            <div className="flex items-center gap-4 flex-1">
                                <div className="font-mono font-bold text-muted-foreground">#{rank}</div>
                                <Avatar className="h-10 w-10 border border-white/10">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${p.avatar}`} />
                                    <AvatarFallback>{p.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                    <span className={cn("font-bold text-lg leading-none", isMe ? "text-primary" : "text-foreground")}>{p.name} {isMe && "(Moi)"}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="font-mono font-bold text-xl">{p.score}</span>
                                <span className="text-xs text-muted-foreground ml-1">pts</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="pt-6 mt-auto">
                <Button onClick={onLeave} size="lg" variant="outline" className="w-full gap-2 border-white/10 hover:bg-white/5 h-14 text-lg hover:text-primary transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                    Retour au Lobby
                </Button>
            </div>
        </div>
      </div>

      {/* MODAL DETAIL MULTI */}
      <Dialog open={showMultiDetail} onOpenChange={setShowMultiDetail}>
        <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[85vh] flex flex-col overflow-y-auto custom-scrollbar">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-xl">
                    <BrainCircuit className="h-5 w-5 text-primary" />
                    Détail de votre performance
                    <Badge variant="outline" className="ml-auto text-muted-foreground">
                        {myRank}e sur {sortedPlayers.length}
                    </Badge>
                </DialogTitle>
            </DialogHeader>
            
            {/* Liste historique */}
            <div className="flex-1 space-y-3 pt-4">
                <h4 className="text-sm font-bold text-muted-foreground uppercase">Historique des rounds</h4>
                {history?.map((round: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-background/50 border border-white/5">
                        <div className="flex flex-col items-center justify-center w-8 gap-1">
                            <span className="text-[10px] text-muted-foreground font-mono">#{round.round}</span>
                            <div className={cn("p-1 rounded-full", round.isCorrect ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500")}>
                                {round.isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-bold text-sm truncate">{round.song.anime}</span>
                                <span className="text-[10px] px-1 py-0 rounded bg-secondary text-muted-foreground border border-border">
                                    {round.song.type}
                                </span>
                            </div>
                            <div className="text-xs text-muted-foreground truncate">{round.song.title}</div>
                        </div>
                        <div className="text-right font-bold text-sm">
                            {round.isCorrect ? <span className="text-green-400">+{round.points}</span> : <span className="text-muted-foreground">0</span>}
                        </div>
                    </div>
                ))}
            </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}