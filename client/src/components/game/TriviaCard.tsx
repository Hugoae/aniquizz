import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { animeTrivia } from '@/data/triviaData';

export function TriviaCard() {
    const [shuffledTrivia, setShuffledTrivia] = useState(animeTrivia);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

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

    // MODIF : Vitesse accélérée (10 secondes au lieu de 15)
    useEffect(() => {
        const timer = setInterval(handleNext, 10000);
        return () => clearInterval(timer);
    }, [currentIndex, shuffledTrivia]);

    const currentFact = shuffledTrivia[currentIndex];

    return (
        // MODIF : mt-8 au lieu de mt-12 pour réduire l'espace
        <div className="w-full max-w-4xl mx-auto mt-20 animate-fade-in">
            <div className={cn(
                "glass-card relative overflow-hidden rounded-2xl border border-white/5 shadow-xl",
                "bg-card/30" // MODIF : Fond gris standard (plus clair/intégré) au lieu de noir
            )}>
                {/* Fond décoratif très léger */}
                <div className="absolute top-0 right-0 p-24 bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
                
                {/* Conteneur principal avec padding réduit (p-6) */}
                <div className="relative z-10 p-6 flex flex-col gap-3">
                    
                    {/* En-tête discret */}
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-yellow-400" />
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Le saviez-vous ?</h3>
                    </div>
                    
                    {/* Texte de l'anecdote */}
                    <div className={cn(
                        "min-h-[50px] flex items-center transition-opacity duration-300 pr-8", // pr-8 pour ne pas chevaucher la flèche si texte long
                        isAnimating ? "opacity-0" : "opacity-100"
                    )}>
                        {/* MODIF : Texte un peu plus petit et couleur plus standard */}
                        <p className="text-base text-foreground/90 leading-relaxed font-medium">
                            "{currentFact?.text}"
                        </p>
                    </div>

                    {/* Footer : Pagination + Flèche */}
                    <div className="flex items-end justify-between mt-1">
                        
                        {/* Pagination Dots (Discret) */}
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

                        {/* MODIF : Bouton Flèche Simple */}
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