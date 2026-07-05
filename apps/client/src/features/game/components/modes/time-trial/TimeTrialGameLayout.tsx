import { useState, useEffect, useRef } from 'react';
import { 
  LogOut, Pause, Play, Volume2, VolumeX, AlertCircle, Send, FastForward
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { UserAvatar } from '@/components/ui/UserAvatar'; 

// ✅ Imports
import { PointsBadge } from '../../shared/PointsBadge'; 
import { CircularGameTimer } from '../../shared/CircularGameTimer';
import { TimeTrialHistory } from './TimeTrialHistory';
import { TimeTrialPlayerCard } from './TimeTrialPlayerCard'; 

// ✅ Import socket pour écouter l'event d'animation (Flash)
import { socket } from '@/lib/socket';

interface TimeTrialGameLayoutProps {
  phase: 'loading' | 'guessing' | 'revealed' | 'ended';
  currentRound: number;
  totalRounds: number;
  timeLeft: number; 
  timeDiff: number | null; 
  volume: number;
  isMuted: boolean;
  onVolumeChange: (v: number) => void;
  onToggleMute: () => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  autoplayBlocked: boolean;
  onSafePlay: () => void;
  isGamePaused: boolean;
  onVotePause: () => void;
  onVoteSkip: () => void; 
  currentSong: any;
  inputMode: 'typing' | 'carre' | 'duo';
  answer: string;
  setAnswer: (val: string) => void;
  submittedAnswer: string | null;
  onAction: (val: string) => void;
  onShowLeave: () => void;
  gameMode: string;
  getVideoUrl: (key: string | undefined | null) => string;
  suggestions: string[];
  players: any[];
  currentUserId: string;
  myProfile: any;
  onShowProfile: () => void;
  showPointsAnimation: boolean;
  pointsEarned: number | null;
  
  // ✅ L'historique vient maintenant de Game.tsx qui centralise l'état
  history?: any[];
}

export function TimeTrialGameLayout({
  phase, currentRound, totalRounds, timeLeft, timeDiff,
  volume, isMuted, onVolumeChange, onToggleMute, videoRef, autoplayBlocked, onSafePlay,
  isGamePaused, onVotePause, onVoteSkip,
  currentSong, answer, setAnswer, onAction,
  onShowLeave, suggestions, players, currentUserId, myProfile, onShowProfile,
  showPointsAnimation, pointsEarned,
  history = [] 
}: TimeTrialGameLayoutProps) {

  const [isVideoReady, setIsVideoReady] = useState(false);
  const [showDiffAnim, setShowDiffAnim] = useState(false);
  const [flashType, setFlashType] = useState<'success' | 'error' | null>(null);
  const [flashText, setFlashText] = useState<string>('');
  
  // ✅ Ref pour l'auto-focus
  const inputRef = useRef<HTMLInputElement>(null);

  const myPlayer = players.find(p => String(p.id) === String(currentUserId));
  
  // ✅ GESTION ANIMATION (Flash & Texte)
  useEffect(() => {
    const onAnswerResult = (data: any) => {
        if (String(data.playerId) === String(currentUserId)) {
            const isSuccess = data.isCorrect;
            
            setFlashType(isSuccess ? 'success' : 'error');
            
            if (isSuccess) {
                setFlashText('+5s');
            } else if (data.isSkip || (data.penalty && data.penalty > 0)) {
                setFlashText('-5s');
            } else {
                setFlashText(''); // Pas de texte pour une erreur simple
            }

            setShowDiffAnim(true);

            setTimeout(() => {
                setShowDiffAnim(false);
                setFlashType(null);
                setFlashText('');
            }, 800);
        }
    };

    socket.on('answer_result', onAnswerResult);
    return () => { socket.off('answer_result', onAnswerResult); };
  }, [currentUserId]);

  useEffect(() => {
      setIsVideoReady(false);
  }, [currentSong?.videoKey]);

  // ✅ AUTO-FOCUS PERMANENT
  useEffect(() => {
    if (!isGamePaused) {
        forceFocus();
    }
  }, [phase, isGamePaused, currentRound]);

  const forceFocus = () => {
      setTimeout(() => inputRef.current?.focus(), 10);
  };

  const handleVideoReady = () => {
      if (!isVideoReady) setIsVideoReady(true);
  };

  const handleSkip = () => {
      onVoteSkip();
      forceFocus();
  };

  const handleAction = (val: string) => {
      onAction(val);
      forceFocus();
  };

  return (
    <div className="fixed inset-0 h-screen w-screen bg-background flex flex-col overflow-hidden overscroll-none">
        
        {/* HEADER STANDARD */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 shrink-0 justify-between relative z-50">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onShowLeave} className="gap-2 text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" /><span className="hidden md:inline">Quitter</span>
            </Button>
            <Button variant={(isGamePaused) ? "secondary" : "outline"} size="sm" onClick={onVotePause} className={cn("gap-2 ml-2 transition-all", isGamePaused && "bg-yellow-500 hover:bg-yellow-600 text-black border-none")}>
                 {isGamePaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />} 
                 {isGamePaused ? "Reprendre" : "Pause"} 
            </Button>
          </div>
          
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center h-full pt-1 pointer-events-none">
                <span className="font-black gradient-text text-2xl leading-none tracking-tight mb-2">AniQuizz</span>
                <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground w-64 pointer-events-auto">
                    <span className="tabular-nums font-mono font-bold">Round {currentRound}/{totalRounds}</span>
                    <div className="flex-1 h-1.5 bg-secondary rounded-md overflow-hidden"> 
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000" style={{ width: `${(currentRound / totalRounds) * 100}%` }} /> 
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

        {/* CONTENEUR PRINCIPAL */}
        <div className="flex-1 flex overflow-hidden min-h-0 relative">
            <main className="flex-1 flex flex-col items-center p-4 min-w-0 overflow-hidden relative">
                
                <div className="w-full flex flex-col items-center relative animate-fade-in h-full">
                    
                    {/* LAYOUT GRID */}
                    <div className="flex flex-col xl:flex-row gap-6 items-start justify-center xl:justify-end w-full max-w-[1400px] h-full transition-all">
                      
                        {/* COLONNE GAUCHE : VIDÉO + INPUT + PLAYER CARD */}
                        <div className="flex flex-col items-center w-full flex-1 h-full min-h-0">
                            
                            {/* VIDEO PLAYER */}
                            <div className="relative w-full aspect-video max-h-[45vh] rounded-xl overflow-hidden bg-black border border-border shadow-2xl group shrink-0 transition-all duration-500 max-w-[850px]">
                                
                                {/* ✅ FEEDBACK VISUEL (CONTOUR + TEXTE OPTIONNEL) */}
                                {flashType && (
                                    <div className={cn(
                                        "absolute inset-0 z-40 flex items-center justify-center pointer-events-none animate-in fade-in duration-200 border-[8px]",
                                        flashType === 'success' ? "border-green-500 bg-green-500/5 shadow-[inset_0_0_100px_rgba(34,197,94,0.2)]" : "border-red-500 bg-red-500/5 shadow-[inset_0_0_100px_rgba(239,68,68,0.2)]"
                                    )}>
                                        {/* On n'affiche le texte que s'il est défini (Succès ou Skip) */}
                                        {flashText && (
                                            <div className={cn(
                                                "text-7xl md:text-8xl font-black drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] animate-in zoom-in-50 slide-in-from-bottom-5 duration-300", 
                                                flashType === 'success' ? "text-green-400" : "text-red-500"
                                            )}>
                                                {flashText}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ✅ Hard Cut - Opacity 0 toujours */}
                                <video 
                                    ref={videoRef}
                                    className="absolute inset-0 w-full h-full object-cover z-0 opacity-0"
                                    playsInline
                                    onSeeked={handleVideoReady}
                                    onLoadedData={() => { if (currentSong?.videoStartTime === 0) handleVideoReady(); }}
                                />

                                {/* Placeholder Musical */}
                                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
                                    <div className="text-white/10 animate-pulse">
                                        <Volume2 className="w-24 h-24" />
                                    </div>
                                </div>

                                {autoplayBlocked && ( 
                                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                                        <Button onClick={onSafePlay} variant="glow" size="lg" className="gap-2 animate-bounce"><AlertCircle className="h-5 w-5" /> Activer le son</Button>
                                    </div> 
                                )}
                                
                                {isGamePaused && ( <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"><Pause className="h-16 w-16 text-white mb-4" /><h3 className="text-2xl font-bold text-white mb-2">PAUSE</h3></div> )}
                                
                                <div className="absolute top-4 right-4 z-50 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 backdrop-blur-md rounded-lg p-1 border border-white/10">
                                    <Button variant="ghost" size="icon" onClick={onToggleMute} className="h-8 w-8 text-white">{isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</Button>
                                    <Slider value={[isMuted ? 0 : volume]} onValueChange={([v]) => onVolumeChange(v)} max={100} className="w-20 mr-3" />
                                </div>

                                {/* Timer Central */}
                                <CircularGameTimer 
                                    timeLeft={timeLeft}
                                    maxTime={60} 
                                    phase={phase}
                                    isPaused={isGamePaused}
                                    showDiffAnim={false} // On gère l'anim custom ci-dessus
                                    timeDiff={null} 
                                />
                            </div>

                            {/* ZONE INPUT */}
                            <div className="w-full max-w-[850px] mt-6 flex flex-col gap-3 relative z-50">
                                {/* SUGGESTIONS */}
                                {suggestions.length > 0 && (
                                    <div className="absolute bottom-full mb-2 left-0 w-full bg-card border border-primary/20 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-60 overflow-y-auto custom-scrollbar animate-slide-up">
                                        {suggestions.map((suggestion, idx) => (
                                        <button
                                            key={idx}
                                            className={cn("text-left px-4 py-3 transition-colors text-sm font-medium border-b border-white/5 last:border-0 w-full flex justify-between items-center", idx === 0 ? "bg-primary/20 text-primary border-l-4 border-l-primary" : "hover:bg-primary/20 hover:text-primary")}
                                            onClick={() => { setAnswer(suggestion); handleAction(suggestion); }}
                                        >
                                            <span>{suggestion}</span>
                                            {idx === 0 && <span className="text-[10px] opacity-60 font-mono border border-current px-1 rounded-sm ml-2">ENTRÉE</span>}
                                        </button>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-2 h-16 relative">
                                    <Input
                                        ref={inputRef} 
                                        value={answer}
                                        onChange={(e) => setAnswer(e.target.value)}
                                        placeholder="Nom de l'anime..."
                                        className="h-full text-2xl pl-6 bg-card/50 backdrop-blur-sm border-primary/20 focus-visible:ring-primary/50 rounded-xl shadow-lg"
                                        onKeyDown={(e) => { 
                                            if (e.key === 'Enter') { 
                                                e.preventDefault(); 
                                                if (suggestions.length > 0) handleAction(suggestions[0]);
                                                else handleAction(answer);
                                            } 
                                        }}
                                        disabled={isGamePaused}
                                    />
                                    <Button variant="glow" className="h-full px-8 rounded-xl shadow-lg" onClick={() => handleAction(answer)} disabled={!answer}><Send className="h-6 w-6" /></Button>
                                </div>

                                <Button variant="secondary" className="w-full h-10 bg-secondary/50 border border-white/5 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all gap-2 group rounded-lg text-muted-foreground text-sm font-bold uppercase tracking-wider" onClick={handleSkip}>
                                    <FastForward className="h-4 w-4 transition-transform group-hover:translate-x-1" /> Je passe (-5s)
                                </Button>
                            </div>

                            <div className="w-full max-w-[850px] mt-8 flex justify-center">
                                <div className="relative w-full max-w-[300px]">
                                    {/* ✅ UTILISATION DU NOUVEAU COMPOSANT */}
                                    {myPlayer && <TimeTrialPlayerCard player={myPlayer} isCurrentUser={true} />}
                                    
                                    {showPointsAnimation && pointsEarned && ( <div className="absolute -top-6 right-0 animate-fade-in z-20 scale-125"><PointsBadge points={pointsEarned} /></div> )}
                                </div>
                            </div>
                        </div>

                        {/* ✅ COMPOSANT HISTORIQUE SÉPARÉ */}
                        {/* On utilise la prop history qui vient du parent, garantie à jour */}
                        <TimeTrialHistory history={history} />

                    </div>
                </div>
            </main>
        </div>
    </div>
  );
}