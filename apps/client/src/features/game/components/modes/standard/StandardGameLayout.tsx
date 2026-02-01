import { 
  LogOut, Pause, Play, SkipForward, Clock, 
  Volume2, VolumeX, AlertCircle, Grid2X2, Columns2, Send, FastForward
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { socket } from '@/lib/socket';

import { PlayerCard } from '../../shared/PlayerCard';
import { SongInfoCard } from '../../shared/SongInfoCard';
import { PointsBadge } from '../../shared/PointsBadge';
import { AudioVisualizer } from '../../core/AudioVisualizer';
import { GameSidebar } from '../../core/GameSidebar';

interface StandardGameLayoutProps {
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
  isPausePending: boolean;
  pauseVotes: number;
  pauseRequired: number;
  skipVotes: number;
  skipRequired: number;
  resumeCountdown: number | null;
  onVotePause: () => void;
  onVoteSkip: () => void;
  currentSong: any;
  nextVideoKey: string | null;
  myWatchedIds: number[];
  inputMode: 'typing' | 'carre' | 'duo';
  answer: string;
  setAnswer: (val: string) => void;
  submittedAnswer: string | null;
  suggestions: string[];
  choices: string[];
  onAction: (val: string) => void;
  onSwitchCarre: () => void;
  onSwitchDuo: () => void;
  myProfile: any;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  onShowLeave: () => void;
  onShowProfile: () => void;
  showPointsAnimation: boolean;
  pointsEarned: number | null;
  currentUserId: string;
  gameMode: string;
  getVideoUrl: (key: string | undefined | null) => string;
  roomId?: string;
}

export function StandardGameLayout({
  phase, players, currentRound, totalRounds, timeLeft, progress,
  volume, isMuted, onVolumeChange, onToggleMute, videoRef, autoplayBlocked, onSafePlay,
  isGamePaused, isPausePending, pauseVotes, pauseRequired, skipVotes, skipRequired, resumeCountdown, onVotePause, onVoteSkip,
  currentSong, nextVideoKey, myWatchedIds,
  inputMode, answer, setAnswer, submittedAnswer, suggestions, choices, onAction, onSwitchCarre, onSwitchDuo,
  myProfile, sidebarCollapsed, setSidebarCollapsed, onShowLeave, onShowProfile, showPointsAnimation, pointsEarned,
  currentUserId, gameMode, getVideoUrl, roomId
}: StandardGameLayoutProps) {

  const handleSoloSkip = () => {
      if (roomId) socket.emit('game:skip_round', { roomId });
  };

  const renderInputArea = () => {
    if (phase !== 'guessing') {
        if (!currentSong) return <div className="h-[80px] w-full flex items-center justify-center text-muted-foreground animate-pulse">Chargement de la réponse...</div>;
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

        {inputMode === 'typing' && !submittedAnswer && (
          <div className="flex gap-4 mb-2 animate-fade-in items-center">
            <Button variant="secondary" size="sm" onClick={onSwitchCarre} className="gap-2 hover:bg-primary/20 hover:text-primary transition-all">
              <Grid2X2 className="h-4 w-4" /> Carré (2 pts)
            </Button>
            <Button variant="secondary" size="sm" onClick={onSwitchDuo} className="gap-2 hover:bg-primary/20 hover:text-primary transition-all">
              <Columns2 className="h-4 w-4" /> Duo (1 pt)
            </Button>
          </div>
        )}

        {inputMode === 'typing' && (
          <div className="flex gap-3 items-center w-full animate-slide-up relative z-50">
            {suggestions.length > 0 && (
              <div className="absolute bottom-full mb-2 left-0 w-full bg-card border border-primary/20 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-60 overflow-y-auto custom-scrollbar">
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
                placeholder={submittedAnswer ? "Changer votre réponse..." : "Nom de l'anime..."}
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
              <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded">+5 pts</span>
              <Button variant="glow" size="lg" onClick={() => onAction(answer)} disabled={!answer} className="h-14 w-14 p-0 rounded-xl">
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {inputMode !== 'typing' && (
          // ✅ CORRECTION ICI : gap-3 (plus serré) et h-16 (moins haut) pour éviter le scroll
          <div className={cn("grid gap-3 w-full animate-slide-up", inputMode === 'carre' ? "grid-cols-2" : "grid-cols-2")}>
            {choices.map((choice, idx) => (
              <Button
                key={idx}
                variant="outline"
                className={cn(
                    "h-16 text-md font-semibold border-2 transition-all whitespace-normal leading-tight px-2", 
                    submittedAnswer === choice ? "bg-primary text-white border-primary shadow-lg" : "hover:bg-primary/10 hover:border-primary/50"
                )}
                onClick={() => onAction(choice)}
              >
                {choice}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    // ✅ ROOT: OVERSCROLL-NONE pour éviter les rebonds
    <div className="fixed inset-0 h-screen w-screen bg-background flex flex-col overflow-hidden overscroll-none">
        
        {/* HEADER */}
        <header className="h-14 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 shrink-0 justify-between relative z-50">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onShowLeave} className="gap-2 text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" /><span className="hidden md:inline">Quitter</span>
            </Button>
            <Button variant={(isGamePaused || isPausePending) ? "secondary" : "outline"} size="sm" onClick={onVotePause} className={cn("gap-2 ml-2 transition-all", isGamePaused && "bg-yellow-500 hover:bg-yellow-600 text-black border-none")}>
                 {isGamePaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />} 
                 {isGamePaused ? "Reprendre" : "Pause"} 
            </Button>
          </div>
          
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-1"><span className="font-bold gradient-text text-lg">AniQuizz</span></div>
                <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground w-64">
                    <span>Round {currentRound}/{totalRounds}</span>
                    <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden"> 
                        <div className="h-full bg-gradient-primary transition-all duration-1000" style={{ width: `${(currentRound / totalRounds) * 100}%` }} /> 
                    </div> 
                </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" className="flex items-center gap-3 pl-2 pr-4 py-1 h-auto rounded-full hover:bg-white/5" onClick={onShowProfile}>
                <UserAvatar avatar={myProfile.avatar} username={myProfile.username} className="h-8 w-8" />
                <span className="font-semibold text-sm hidden sm:block">{myProfile.username}</span>
            </Button>
          </div>
        </header>

        {/* MAIN LAYOUT */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
            <main className="flex-1 flex flex-col items-center p-4 min-w-0 overflow-hidden">
                <div className="w-full flex flex-col items-center relative animate-fade-in h-full">
                    
                    {/* CONTAINER FLEX */}
                    <div className="flex flex-col xl:flex-row gap-6 items-start justify-center xl:justify-end w-full max-w-[1400px] h-full transition-all">
                      
                        {/* GAUCHE : Zone de Jeu Principale */}
                        <div className="flex flex-col items-center w-full flex-1 h-full min-h-0">
                            
                            {/* ✅ VIDÉO : max-h-[40vh] pour laisser la place au QCM */}
                            <div className="relative w-full aspect-video max-h-[45vh] rounded-xl overflow-hidden bg-background border border-border shadow-2xl group shrink-0 transition-all duration-500 max-w-[850px]">
                                <video 
                                    ref={videoRef}
                                    className="absolute inset-0 w-full h-full object-cover z-0"
                                    playsInline
                                />

                                {autoplayBlocked && phase === 'guessing' && ( <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"><Button onClick={onSafePlay} variant="glow" size="lg" className="gap-2 animate-bounce"><AlertCircle className="h-5 w-5" /> Activer le son</Button></div> )}
                                
                                {isGamePaused && ( <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"><Pause className="h-16 w-16 text-white mb-4" /><h3 className="text-2xl font-bold text-white mb-2">PAUSE</h3></div> )}
                                
                                {resumeCountdown !== null && resumeCountdown > 0 && ( 
                                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
                                        <span className="text-9xl font-black text-white animate-pulse">{resumeCountdown}</span>
                                    </div> 
                                )}
                                
                                <div className="absolute top-4 right-4 z-50 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"><div className="flex items-center bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/10"><Button variant="ghost" size="icon" onClick={onToggleMute} className="h-8 w-8 rounded-full hover:bg-white/10 text-white">{isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</Button><Slider value={[isMuted ? 0 : volume]} onValueChange={([v]) => onVolumeChange(v)} max={100} className="w-20 mr-3" /></div></div>
                                
                                {gameMode === 'solo' && phase === 'guessing' && !isGamePaused && submittedAnswer && (
                                    <div className="absolute bottom-4 right-4 z-50">
                                        <Button variant="secondary" size="sm" onClick={handleSoloSkip} className="gap-2 bg-black/60 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md transition-all shadow-lg">
                                            <FastForward className="h-4 w-4" /> Passer
                                        </Button>
                                    </div>
                                )}

                                {phase === 'revealed' && ( <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10"><div className="w-2 h-2 rounded-full bg-primary animate-pulse" /><span className="font-mono font-bold text-white">{timeLeft}s</span></div> )}
                                
                                <div className={cn(
                                    "absolute inset-0 flex flex-col items-center justify-center transition-all duration-500",
                                    phase === 'revealed' ? "opacity-0 pointer-events-none z-10" : "opacity-100 bg-background z-20 pointer-events-auto"
                                )}>
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
                                
                                {phase === 'revealed' && ( <div className="absolute bottom-4 right-4 z-30"><Button variant="default" onClick={onVoteSkip} className="gap-2 shadow-lg shadow-purple-500/20"><SkipForward className="h-4 w-4" /> Suivant {players.length > 1 && ` (${skipVotes}/${skipRequired})`}</Button></div> )}
                            </div>

                            {isPausePending && !isGamePaused && ( 
                                <div className="w-full mb-4 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 flex items-center justify-center gap-3 animate-pulse mt-2 shrink-0">
                                    <Clock className="h-5 w-5 text-orange-500" />
                                    <span className="text-orange-500 font-bold">Pause demandée (Fin du round)</span>
                                </div> 
                            )}

                            {/* INPUT AREA (Fixe) */}
                            <div className={cn("w-full flex justify-center shrink-0 min-h-[80px] z-50 mt-4", phase === 'revealed' ? "mb-4" : "mb-4")}>
                                {renderInputArea()}
                            </div>

                            {/* ✅ GRILLE JOUEURS : Justify Start + pl-24 + gap-x-48 (TON REGLAGE) */}
                            <div className="w-full flex-1 min-h-0 overflow-y-auto px-4 pb-4 custom-scrollbar">
                                <div className="pt-16 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-48 gap-y-16 justify-start justify-items-center pl-24">
                                    {players.map(p => {
                                        return ( 
                                        <div key={p.id} className="relative w-full max-w-[200px] flex justify-center">
                                            <PlayerCard 
                                                player={p} 
                                                isCurrentUser={String(p.id) === String(currentUserId)} 
                                                showResult={phase === 'revealed'} 
                                                gameMode='standard' 
                                            /> 
                                            {(String(p.id) === String(currentUserId)) && showPointsAnimation && pointsEarned && ( 
                                                <div className="absolute -top-4 -right-2 animate-fade-in z-20">
                                                    <PointsBadge points={pointsEarned} />
                                                </div> 
                                            )} 
                                        </div> 
                                    )})}
                                </div>
                            </div>

                        </div>

                        {/* DROITE : Info Card (Reste fixe) */}
                        <div className="hidden xl:block w-[550px] shrink-0 pt-2 animate-slide-left pl-4">
                             {currentSong && (
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
                                    isRevealed={phase === 'revealed'} 
                                    tags={currentSong?.tags} 
                                    isWatched={currentSong?.animeId ? myWatchedIds.includes(currentSong.animeId) : false} 
                                />
                            )}
                        </div>

                    </div>
                </div>
            </main>

            {gameMode !== 'solo' && (
                <GameSidebar 
                    players={players} 
                    isCollapsed={sidebarCollapsed} 
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
                    roomId={roomId || ""} 
                />
            )}
        </div>
    </div>
  );
}