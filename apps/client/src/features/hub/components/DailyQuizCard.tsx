import { Calendar, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Coming-soon teaser for the daily quiz mode on the Play hub (disabled, like Compétitif). */
export function DailyQuizCard() {
  return (
    <div className="mx-auto mt-10 w-full max-w-4xl animate-fade-in px-0">
      <div
        aria-disabled="true"
        aria-label="Quiz du Jour — arrive prochainement"
        className={cn(
          'glass-card flex w-full items-center gap-5 rounded-xl border border-border/60 p-5 text-left md:p-6',
          'opacity-60 cursor-not-allowed grayscale-[0.3]',
        )}
      >
        <div className="relative shrink-0">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-warning/20 bg-warning/10">
            <Calendar className="h-7 w-7 text-warning" aria-hidden />
            <Sparkles className="absolute -right-0.5 -top-0.5 h-4 w-4 text-warning" aria-hidden />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold">Quiz du Jour</h2>
            <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Bientôt
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Une épreuve quotidienne pour tester votre culture anime — arrive prochainement.
          </p>
        </div>
      </div>
    </div>
  );
}
