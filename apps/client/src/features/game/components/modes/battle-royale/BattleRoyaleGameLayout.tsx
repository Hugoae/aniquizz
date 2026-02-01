import { 
  LogOut, Pause, Play, SkipForward, Clock, 
  Volume2, VolumeX, AlertCircle, Skull, AlertTriangle, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';

// Components
import { PlayerCard } from '../../shared/PlayerCard';
import { SongInfoCard } from '../../shared/SongInfoCard';
import { AudioVisualizer } from '../../core/AudioVisualizer';
import { GameSidebar } from '../../core/GameSidebar';

// Types
interface BattleRoyaleGameLayoutProps {
  phase: 'loading' | 'guessing' | 'revealed' | 'ended';
  players: any[];
  currentRound: number;
  totalRounds: number;
  timeLeft: number;
  progress: number;
  
  volume: number;
  isMuted: boolean;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  autoplayBlocked: boolean;
  onSafePlay: () => void;
  
  isGamePaused: boolean;
  pauseVotes: number;
  pauseRequired: number;
  resumeCountdown: number | null;
  onVotePause: () => void;
  onVoteSkip: () => void;
  skipVotes: number;
  skipRequired: number;
  
  currentSong: any;
  nextVideoKey: string | null;
  
  answer: string;
  setAnswer: (val: string) => void;
  submittedAnswer: string | null;
  suggestions: string[];
  onAction: (val: string) => void;
  
  myProfile: any;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  onShowLeave: () => void;
  onShowProfile: () => void;
  currentUserId: string;
  getVideoUrl: (key: string | undefined | null) => string;

  // Specific BR
  isGulag: boolean;
  survivorsCount: number;
  brPhaseLabel: string;
  currentDifficulty: string;
  myWatchedIds: number[];
}

export function BattleRoyaleGameLayout({
  phase, players, currentRound, totalRounds, timeLeft, progress,
  volume, isMuted, onVolumeChange, onToggleMute, videoRef, autoplayBlocked, onSafePlay,
  isGamePaused, pauseVotes, pauseRequired, resumeCountdown, onVotePause, onVoteSkip, skipVotes, skipRequired,
  currentSong, nextVideoKey,
  answer, setAnswer, submittedAnswer, suggestions, onAction,
  myProfile, sidebarCollapsed, setSidebarCollapsed, onShowLeave, onShowProfile,
  currentUserId, getVideoUrl,
  isGulag, survivorsCount, brPhaseLabel, currentDifficulty, myWatchedIds
}: BattleRoyaleGameLayoutProps) {

  // BR Force Typing Only
  const renderInputArea = () => {
    const amIEliminated = players.find(p => String(p.id) === String(currentUserId))?.isEliminated;

    if (isGulag && !amIEliminated && phase === 'guessing') {
        return (
            <div className="glass-card p-4 flex items-center justify-center w-full border border-red-500/20 bg-red-500/5 text-red-200 gap-2 animate-pulse">
                <Clock className="h-5 w-5" />
                <span className="font-bold">Duel au Goulag en cours... Attendez la fin du round.</span>
            </div>
        );
    }

    if (phase !== 'guessing') {
      return (
        <div className="glass-card p-4 flex items-center justify-between w-full animate-scale-in border border-white/10">
          <div className="text-left">
            <h3 className="text-xl font-bold mb-1 text-primary">
              {currentSong?.exactName || currentSong?.displayAnswer || currentSong?.anime}
            </h3>
            <p className="text-sm text-muted-foreground">
              {currentSong?.title} - {currentSong?.artist}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center w-full gap-4 relative">
        {submittedAnswer && (
          <div className="animate-fade-in mb-2 px-4 py-1.5 bg-primary/20 border border-primary/30 rounded-full flex items-center gap-2 backdrop-blur-sm shadow-lg">
            <span className="text-xs text-primary-foreground/70 uppercase font-bold">Votre réponse :</span>
            <span className="text-sm font-bold text-white">{submittedAnswer}</span>
          </div>
        )}

        <div className="flex gap-3 items-center w-full animate-slide-up relative z-50">
            {suggestions.length > 0 && (
              <div className="absolute bottom-full mb-2 left-0 w-full bg-card border border-primary/20 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    className={cn(
                      "text-left px-4 py-3 transition-colors text-sm font-medium border-b border-white/5 last:border-0 w-full flex justify-between items-center",
                      idx === 0 ? "bg-primary/20 text-primary border-l-4 border-l-primary" : "hover:bg-primary/20 hover:text-primary"
                    )}
                    onClick={() => { setAnswer(suggestion); onAction(suggestion); }}
                  >
                    <span>{suggestion}</span>
                    {idx === 0 && <span className="text-[10px] opacity-60 font-mono border border-current px-1 rounded ml-2">ENTRÉE</span>}
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex-1">
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={submittedAnswer ? "Changer votre réponse..." : "Nom de l'anime exact..."}
                className={cn("h-14 text-lg bg-card/50 backdrop-blur-sm pl-4 border-primary/20 focus-visible:ring-primary/50", submittedAnswer && "border-primary/50 bg-primary/5")}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (suggestions.length > 0) onAction(suggestions[0]);
                    else onAction(answer);
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="glow" size="lg" onClick={() => onAction(answer)} disabled={!answer} className="h-14 w-14 p-0 rounded-xl">
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
      </div>
    );
  };

  const amIEliminated = players.find(p => String(p.id) === String(currentUserId))?.isEliminated;
  const diffLabel = currentDifficulty === 'easy' ? 'FACILE' : currentDifficulty === 'medium' ? 'MOYEN' : 'DIFFICILE';
  const diffColor = currentDifficulty === 'easy' ? 'text-green-400' : currentDifficulty === 'medium' ? 'text-blue-400' : 'text-red-500';

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* HEADER BR */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 shrink-0 justify-between relative z-50">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onShowLeave} className="gap-2 text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" /><span className="hidden md:inline">Quitter</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onVotePause} className="gap-2 ml-2">
                 {isGamePaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />} Pause ({pauseVotes}/{pauseRequired})
            </Button>
          </div>
          
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="flex items-center gap-4 text-sm font-bold bg-secondary/30 px-6 py-1.5 rounded-full border border-white/5">
                    <span className="text-primary uppercase tracking-widest text-xs flex items-center gap-1"><Skull className="h-3 w-3" /> BR</span>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-white">Round {currentRound}/{totalRounds}</span>
                    <span className="text-muted-foreground">|</span>
                    <span className="text-white flex items-center gap-1"><Clock className="h-3 w-3" /> Survivants: {survivorsCount}</span>
                    <span className="text-muted-foreground">|</span>
                    <span className={cn("uppercase", diffColor)}>{diffLabel}</span>
                    <span className="text-muted-foreground opacity-50 uppercase text-xs">({brPhaseLabel})</span>
                </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" className="flex items-center gap-3 pl-2 pr-4 py-1 h-auto rounded-full hover:bg-white/5" onClick={onShowProfile}>
                <UserAvatar avatar={myProfile.avatar} username={myProfile.username} className="h-8 w-8" />
                <span className="font-semibold text-sm hidden sm:block">{myProfile.username}</span>
            </Button>
          </div>
        </header>

        {/* CONTAINER */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
            <main className="flex-1 flex flex-col items-center p-4 overflow-y-auto scrollbar-hide min-w-0">
                <div className="w-full max-w-[750px] flex flex-col items-center relative animate-fade-in">
                    
                    {/* VIDEO AREA */}
                    <div className={cn("relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-border shadow-2xl group shrink-0 mt-2 mb-6 transition-all duration-500", isGulag && "border-red-500/50 shadow-red-900/20")}>
                        
                        {amIEliminated && phase === 'guessing' && !isGulag && (
                            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] pointer-events-none">
                                <h2 className="text-4xl font-black text-slate-500 uppercase tracking-widest opacity-50">Éliminé</h2>
                                <p className="text-slate-400 text-sm mt-2">Mode Spectateur (Ghost)</p>
                            </div>
                        )}
                        
                        {isGulag && ( <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-center text-xs font-black uppercase py-1 z-30 animate-pulse">🚨 GOULAG - MORT SUBITE POUR LES GHOSTS 🚨</div> )}
                        {autoplayBlocked && phase === 'guessing' && ( <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"><Button onClick={onSafePlay} variant="glow" size="lg" className="gap-2 animate-bounce"><AlertCircle className="h-5 w-5" /> Activer le son</Button></div> )}
                        {isGamePaused && ( <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"><Pause className="h-16 w-16 text-white mb-4" /><h3 className="text-2xl font-bold text-white mb-2">PAUSE</h3></div> )}
                        {resumeCountdown !== null && resumeCountdown > 0 && ( <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"><span className="text-9xl font-bold text-white animate-pulse">{resumeCountdown}</span></div> )}
                        
                        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"><div className="flex items-center bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/10"><Button variant="ghost" size="icon" onClick={onToggleMute} className="h-8 w-8 rounded-full hover:bg-white/10 text-white">{isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</Button><Slider value={[isMuted ? 0 : volume]} onValueChange={([v]) => onVolumeChange(v)} max={100} className="w-20 mr-3" /></div></div>
                        {phase === 'revealed' && ( <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10"><div className="w-2 h-2 rounded-full bg-primary animate-pulse" /><span className="font-mono font-bold text-white">{timeLeft}s</span></div> )}
                        
                        <div className={cn("absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-card/95 to-background/95 z-10 transition-opacity duration-500", phase === 'revealed' ? "opacity-0 pointer-events-none" : "opacity-100")}>
                            <div className="relative">
                                <svg className="w-28 h-28 -rotate-90">
                                    <circle cx="50%" cy="50%" r="45%" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
                                    <circle cx="50%" cy="50%" r="45%" fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={(100 - progress) * -1} className="transition-[stroke-dashoffset] duration-200 ease-linear" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center flex-col"><span className={cn("text-4xl font-bold tabular-nums", timeLeft <= 5 ? "text-destructive" : "text-foreground")}>{timeLeft}</span></div>
                            </div>
                            {phase === 'guessing' && <div className="mt-6 w-1/2"><AudioVisualizer isPlaying={!isGamePaused} className="h-8 text-primary" /></div>}
                            <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse">Écoutez bien...</p>
                        </div>
                        
                        <video ref={videoRef} playsInline preload="auto" className={cn("w-full h-full object-cover transition-opacity duration-500", phase === 'revealed' ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")} />
                        
                        {phase === 'revealed' && ( <div className="absolute bottom-4 right-4 z-30"><Button variant="default" onClick={onVoteSkip} className="gap-2 shadow-lg shadow-purple-500/20"><SkipForward className="h-4 w-4" /> Suivant {players.length > 1 && ` (${skipVotes}/${skipRequired})`}</Button></div> )}
                    </div>
                    
                    <div className="hidden xl:block absolute left-[calc(100%+20px)] top-0 mt-2">
                        <SongInfoCard 
                            animeName={currentSong?.exactName || currentSong?.displayAnswer || currentSong?.anime} 
                            songTitle={currentSong?.title} 
                            artist={currentSong?.artist} 
                            type={currentSong?.type} 
                            difficulty={currentSong?.difficulty} 
                            franchise={currentSong?.franchise} 
                            year={currentSong?.year} 
                            coverImage={currentSong?.cover} 
                            siteUrl={currentSong?.siteUrl} 
                            sourceUrl={currentSong?.sourceUrl} 
                            isRevealed={phase === 'revealed'} 
                            tags={currentSong?.tags} 
                            isWatched={currentSong?.animeId ? myWatchedIds.includes(currentSong.animeId) : false}
                        />
                    </div>
                    
                    {phase !== 'loading' && ( <div className={cn("w-full flex justify-center shrink-0 min-h-[80px] z-50", phase === 'revealed' ? "mb-32" : "mb-6")}>{renderInputArea()}</div> )}
                    
                    <div className="w-full">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 justify-items-center">
                            {players.map(p => ( 
                                <div key={p.id} className="relative w-full max-w-[220px]">
                                    {phase === 'revealed' && ( 
                                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex justify-center z-10 w-full"> 
                                            <div className={cn("px-3 py-2 rounded-xl text-xs font-bold shadow-xl animate-bounce border-2 bg-background line-clamp-2 text-center leading-tight max-w-[160px] w-max break-words", p.isCorrect ? "bg-success text-success-foreground border-success-foreground/20" : "bg-destructive text-destructive-foreground border-destructive-foreground/20")}>
                                            {p.currentAnswer || "..."}
                                            </div>
                                        </div> 
                                    )} 
                                    <PlayerCard player={p} isCurrentUser={String(p.id) === String(currentUserId)} showResult={phase === 'revealed'} gameMode='battle-royale' hideScore /> 
                                </div> 
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            <GameSidebar players={players} isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} roomId="" hideScores />
        </div>
    </div>
  );
}