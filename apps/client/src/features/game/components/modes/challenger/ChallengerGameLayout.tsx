import { useState, useEffect } from 'react';
import { 
  LogOut, Pause, Play, SkipForward, Clock, 
  Volume2, VolumeX, AlertCircle, Send, FastForward,
  Trophy, Music, Target, Heart, Lock, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { socket } from '@/lib/socket';

// ✅ Import du Proxy PlayerCard
import { PlayerCard } from '../../shared/PlayerCard'; 
import { SongInfoCard } from '../../shared/SongInfoCard';
import { PointsBadge } from '../../shared/PointsBadge';
import { CircularGameTimer } from '../../shared/CircularGameTimer'; 
import { GameSidebar } from '../../core/GameSidebar';

interface ChallengerGameLayoutProps {
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
  choices: string[]; // Gardé pour compatibilité interface même si non utilisé en Challenger
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
  
  configBadges?: {
      sourceLabel: string;
      difficultyLabel: string;
      precisionLabel: string;
      modeLabel: string;
  };
}

export function ChallengerGameLayout({
  phase, players, currentRound, totalRounds, timeLeft, progress,
  volume, isMuted, onVolumeChange, onToggleMute, videoRef, autoplayBlocked, onSafePlay,
  isGamePaused, isPausePending, pauseVotes, pauseRequired, skipVotes, skipRequired, resumeCountdown, onVotePause, onVoteSkip,
  currentSong, nextVideoKey, myWatchedIds,
  inputMode, answer, setAnswer, submittedAnswer, suggestions, onAction,
  myProfile, sidebarCollapsed, setSidebarCollapsed, onShowLeave, onShowProfile, showPointsAnimation, pointsEarned,
  currentUserId, gameMode, getVideoUrl, roomId,
  configBadges
}: ChallengerGameLayoutProps) {

  const [isVideoReady, setIsVideoReady] = useState(false);

  // ⚡ Calcul des états pour le joueur local
  const myPlayer = players.find(p => String(p.id) === String(currentUserId));
  
  // Vies / Mort (Basé sur les attempts renvoyés par le serveur ChallengerGame)
  const myAttempts = (myPlayer as any)?.attempts || 0;
  const myLives = Math.max(0, 3 - myAttempts);
  const isDead = myLives === 0;
  
  // ✅ VICTOIRE : Est-ce que j'ai trouvé ?
  const isCorrect = (myPlayer as any)?.isCorrect === true;

  useEffect(() => {
      setIsVideoReady(false);
  }, [currentSong?.videoKey]);

  const handleVideoReady = () => {
      if (!isVideoReady) setIsVideoReady(true);
  };

  const handleSoloSkip = () => {
      if (roomId) socket.emit('game:skip_round', { roomId });
  };

  const renderInputArea = () => {
    if (phase !== 'guessing') {
        if (!currentSong) return <div className="h-[80px] w-full flex items-center justify-center text-muted-foreground animate-pulse">Chargement de la réponse...</div>;
        return (
            <div className="glass-card p-4 flex items-center justify-between w-full animate-scale-in border border-white/10 rounded-xl">
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
        
        {/* ❤️❤️💔 BARRE DE VIES (Spécifique Challenger) */}
        <div className="flex items-center gap-1.5 animate-in slide-in-from-bottom-2 mb-1">
            {[1, 2, 3].map((i) => (
                <Heart 
                    key={i} 
                    className={cn(
                        "w-5 h-5 transition-all duration-300",
                        i <= myLives 
                            ? "fill-red-500 text-red-600 drop-shadow-[0_0_8px_rgba(220,38,38,0.5)] scale-100" 
                            : "fill-transparent text-slate-700/30 scale-90"
                    )} 
                />
            ))}
            <span className={cn("text-xs font-bold ml-2", isDead ? "text-red-500" : "text-muted-foreground")}>
                {isDead ? "ÉLIMINÉ" : `${myLives} essais`}
            </span>
        </div>

        {submittedAnswer && !isCorrect && (
          <div className="animate-fade-in mb-2 px-4 py-1.5 bg-primary/20 border border-primary/30 rounded-md flex items-center gap-2 backdrop-blur-sm shadow-lg">
            <span className="text-xs text-primary-foreground/70 uppercase font-bold">Dernier essai :</span>
            <span className="text-sm font-bold text-white">{submittedAnswer}</span>
          </div>
        )}

        {/* INPUT TYPING UNIQUEMENT POUR CHALLENGER */}
        <div className="flex gap-3 items-center w-full animate-slide-up relative z-50">
            {suggestions.length > 0 && !isDead && !isCorrect && (
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
                    {idx === 0 && <span className="text-[10px] opacity-60 font-mono border border-current px-1 rounded-sm ml-2">ENTRÉE</span>}
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex-1">
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                // ✅ PLACEHOLDER DYNAMIQUE : Mort / Gagné / Normal
                placeholder={isDead ? "Plus d'essais..." : isCorrect ? "Bravo ! Réponse trouvée." : (submittedAnswer ? "Changer votre réponse..." : "Nom de l'anime...")}
                // ✅ DISABLE : Si mort OU si a trouvé
                disabled={isDead || isCorrect}
                className={cn(
                    "h-14 text-lg bg-card/50 backdrop-blur-sm pl-4 border-primary/20 focus-visible:ring-primary/50 rounded-lg", 
                    submittedAnswer && "border-primary/50 bg-primary/5",
                    isDead && "opacity-50 cursor-not-allowed border-red-900/50 bg-red-950/20 text-red-400 placeholder:text-red-700",
                    isCorrect && "opacity-80 cursor-not-allowed border-green-500/50 bg-green-500/10 text-green-400 placeholder:text-green-500 font-bold"
                )}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isDead && !isCorrect) {
                    e.preventDefault();
                    if (suggestions.length > 0) onAction(suggestions[0]);
                    else onAction(answer);
                  }
                }}
              />
              {/* Icone de statut à droite */}
              {isDead && <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />}
              {isCorrect && <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />}
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="glow" 
                size="lg" 
                onClick={() => onAction(answer)} 
                disabled={!answer || isDead || isCorrect} 
                className="h-14 w-14 p-0 rounded-lg"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 h-screen w-screen bg-background flex flex-col overflow-hidden overscroll-none">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 shrink-0 justify-between relative z-50">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onShowLeave} className="gap-2 text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" /><span className="hidden md:inline">Quitter</span>
            </Button>
            <Button variant={(isGamePaused || isPausePending) ? "secondary" : "outline"} size="sm" onClick={onVotePause} className={cn("gap-2 ml-2 transition-all", isGamePaused && "bg-yellow-500 hover:bg-yellow-600 text-black border-none")}>
                 {isGamePaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />} 
                 {isGamePaused ? "Reprendre" : "Pause"} 
            </Button>
          </div>
          
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center h-full pt-1 pointer-events-none">
                <span className="font-black gradient-text text-2xl leading-none tracking-tight mb-2">AniQuizz</span>
                <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground w-64 pointer-events-auto">
                    <span className="tabular-nums font-mono font-bold">Round {currentRound}/{totalRounds}</span>
                    <div className="flex-1 h-1.5 bg-secondary rounded-md overflow-hidden"> 
                        <div className="h-full bg-gradient-to-r from-yellow-500 to-red-500 transition-all duration-1000" style={{ width: `${(currentRound / totalRounds) * 100}%` }} /> 
                    </div> 
                </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" className="flex items-center gap-3 pl-2 pr-4 py-1 h-auto rounded-lg hover:bg-white/5" onClick={onShowProfile}>
                <UserAvatar avatar={myProfile.avatar} username={myProfile.username} className="h-8 w-8" />
                <span className="font-semibold text-sm hidden sm:block">{myProfile.username}</span>
            </Button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden min-h-0 relative">
            <main className="flex-1 flex flex-col items-center p-4 min-w-0 overflow-hidden relative">
                
                {configBadges && (
                    <div className="absolute bottom-4 right-4 z-40 flex flex-row items-center gap-2 pointer-events-none opacity-80 hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/5 shadow-lg">
                            <Trophy className="w-3 h-3 text-primary" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white">{configBadges.difficultyLabel}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/5 shadow-lg">
                            <Music className="w-3 h-3 text-purple-400" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white">{configBadges.sourceLabel}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/5 shadow-lg">
                            <Target className="w-3 h-3 text-cyan-400" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white">{configBadges.precisionLabel}</span>
                        </div>
                    </div>
                )}

                <div className="w-full flex flex-col items-center relative animate-fade-in h-full">
                    
                    <div className="flex flex-col xl:flex-row gap-6 items-start justify-center xl:justify-end w-full max-w-[1400px] h-full transition-all">
                      
                        <div className="flex flex-col items-center w-full flex-1 h-full min-h-0">
                            
                            <div className="relative w-full aspect-video max-h-[45vh] rounded-xl overflow-hidden bg-background border border-border shadow-2xl group shrink-0 transition-all duration-500 max-w-[850px] bg-black">
                                <video 
                                    ref={videoRef}
                                    className={cn(
                                        "absolute inset-0 w-full h-full object-cover z-0",
                                        phase === 'revealed' && isVideoReady 
                                            ? "opacity-100 transition-opacity duration-500" 
                                            : "opacity-0"
                                    )}
                                    playsInline
                                    onSeeked={handleVideoReady}
                                    onLoadedData={() => {
                                        if (currentSong?.videoStartTime === 0) handleVideoReady();
                                    }}
                                />

                                {autoplayBlocked && phase === 'guessing' && ( <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"><Button onClick={onSafePlay} variant="glow" size="lg" className="gap-2 animate-bounce"><AlertCircle className="h-5 w-5" /> Activer le son</Button></div> )}
                                
                                {isGamePaused && ( <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"><Pause className="h-16 w-16 text-white mb-4" /><h3 className="text-2xl font-bold text-white mb-2">PAUSE</h3></div> )}
                                
                                {resumeCountdown !== null && resumeCountdown > 0 && ( 
                                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
                                        <span className="text-9xl font-black text-white animate-pulse">{resumeCountdown}</span>
                                    </div> 
                                )}
                                
                                <div className="absolute top-4 right-4 z-50 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"><div className="flex items-center bg-black/60 backdrop-blur-md rounded-lg p-1 border border-white/10"><Button variant="ghost" size="icon" onClick={onToggleMute} className="h-8 w-8 rounded-md hover:bg-white/10 text-white">{isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</Button><Slider value={[isMuted ? 0 : volume]} onValueChange={([v]) => onVolumeChange(v)} max={100} className="w-20 mr-3" /></div></div>
                                
                                {gameMode === 'solo' && phase === 'guessing' && !isGamePaused && submittedAnswer && (
                                    <div className="absolute bottom-4 right-4 z-50">
                                        <Button variant="secondary" size="sm" onClick={handleSoloSkip} className="gap-2 bg-black/60 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md transition-all shadow-lg">
                                            <FastForward className="h-4 w-4" /> Passer
                                        </Button>
                                    </div>
                                )}

                                {phase === 'revealed' && ( <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10"><div className="w-2 h-2 rounded-full bg-primary animate-pulse" /><span className="font-mono font-bold text-white">{timeLeft}s</span></div> )}
                                
                                {/* ✅ Remplacement par le composant CircularGameTimer */}
                                <CircularGameTimer 
                                    timeLeft={timeLeft}
                                    progress={progress}
                                    phase={phase}
                                    isPaused={isGamePaused}
                                />
                                
                                {phase === 'revealed' && ( <div className="absolute bottom-4 right-4 z-30"><Button variant="default" onClick={onVoteSkip} className="gap-2 shadow-lg shadow-purple-500/20"><SkipForward className="h-4 w-4" /> Suivant {players.length > 1 && ` (${skipVotes}/${skipRequired})`}</Button></div> )}
                            </div>

                            {isPausePending && !isGamePaused && ( 
                                <div className="w-full mb-4 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 flex items-center justify-center gap-3 animate-pulse mt-2 shrink-0">
                                    <Clock className="h-5 w-5 text-orange-500" />
                                    <span className="text-orange-500 font-bold">Pause demandée (Fin du round)</span>
                                </div> 
                            )}

                            <div className={cn("w-full flex justify-center shrink-0 min-h-[80px] z-50 mt-4", phase === 'revealed' ? "mb-4" : "mb-4")}>
                                {renderInputArea()}
                            </div>

                            <div className="w-full flex-1 min-h-0 overflow-y-auto px-4 pb-4 custom-scrollbar">
                                {/* pt-32 pour baisser les cartes et laisser de la place aux bulles */}
                                <div className="pt-32 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-48 gap-y-16 justify-start justify-items-center pl-24">
                                    {players.map(p => {
                                        // ⚡ Transformation des "attempts" serveur en "lives" (3 - attempts)
                                        const pLives = Math.max(0, 3 - ((p as any).attempts || 0));
                                        
                                        return ( 
                                        <div key={p.id} className="relative w-full max-w-[200px] flex justify-center">
                                            <PlayerCard 
                                                player={{...p, lives: pLives}} 
                                                isCurrentUser={String(p.id) === String(currentUserId)} 
                                                showResult={phase === 'revealed'} 
                                                gameMode='challenger' // ✅ Explicite
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

            <GameSidebar players={players} isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} roomId={roomId || ""} />
        </div>
    </div>
  );
}
