import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Import relatif (puisque le dossier data a bougé avec le dossier hub)
import { animeTrivia } from '../data/triviaData';

export function TriviaCard() {
    const [shuffledTrivia, setShuffledTrivia] = useState(animeTrivia);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    // Mélange au montage
    useEffect(() => {
        setShuffledTrivia([...animeTrivia].sort(() => 0.5 - Math.random()));
    }, []);

    const handleNext = () => {
        if (isAnimating) return;
        setIsAnimating(true);
        setTimeout(() => {
            setCurrentIndex((prev) => (prev + 1) % shuffledTrivia.length);
            setIsAnimating(false);
        }, 300);
    };

    // Auto-play toutes les 10 secondes
    useEffect(() => {
        const timer = setInterval(handleNext, 10000);
        return () => clearInterval(timer);
    }, [currentIndex, shuffledTrivia]);

    const currentFact = shuffledTrivia[currentIndex];

    return (
        <div className="w-full max-w-4xl mx-auto mt-20 animate-fade-in px-4">
            <div className="glass-card relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-background shadow-2xl">
                
                {/* Décoration d'arrière-plan */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-[50px] animate-pulse" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/20 rounded-full blur-[50px] animate-pulse" style={{ animationDelay: '2s' }} />

                <div className="flex flex-col md:flex-row items-center p-6 md:p-8 gap-6 relative z-10">
                    
                    {/* Icône */}
                    <div className="shrink-0 p-4 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                        <Sparkles className="w-8 h-8 text-yellow-400 animate-spin-slow" />
                    </div>

                    {/* Contenu Texte */}
                    <div className="flex-1 text-center md:text-left space-y-2">
                        <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
                            Le saviez-vous ?
                        </h3>
                        
                        <div className="h-24 flex items-center justify-center md:justify-start overflow-hidden">
                            <p 
                                className={cn(
                                    "text-lg md:text-xl font-medium text-foreground/90 leading-relaxed transition-all duration-300",
                                    isAnimating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"
                                )}
                            >
                                « {currentFact?.text} »
                            </p>
                        </div>
                    </div>

                    {/* Contrôles */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                        {/* Pagination Dots */}
                        <div className="flex gap-1.5 mb-1.5">
                            {Array.from({ length: 5 }).map((_, i) => {
                                const isActive = i === (currentIndex % 5);
                                return (
                                    <div 
                                        key={i} 
                                        className={cn(
                                            "h-1 rounded-full transition-all duration-500",
                                            isActive ? "w-4 bg-primary" : "w-1 bg-white/10"
                                        )} 
                                    />
                                );
                            })}
                        </div>

                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={handleNext}
                            className="h-8 w-8 rounded-full hover:bg-primary/20 hover:text-primary transition-all text-muted-foreground"
                            title="Suivant"
                        >
                            <ArrowRight className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}