import { CheckCircle2, Circle, Clock, Rocket, Map } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { roadmapData } from '../data/roadmapData';

export function RoadmapWidget() {
  const doneCount = roadmapData.filter((i) => i.status === 'done').length;
  const total = roadmapData.length;
  const donePercent = Math.round((doneCount / total) * 100);

  return (
    <div className="sticky top-24 space-y-6">
        <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-lg bg-primary/10 text-primary">
            <Map className="h-6 w-6" aria-hidden />
            </div>
            <div>
            <h2 className="font-display text-2xl font-bold tracking-tight">Roadmap</h2>
            <p className="text-muted-foreground text-sm">Ce qui arrive bientôt…</p>
            </div>
        </div>

        <div className="flex items-center gap-3">
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuenow={doneCount}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-label="Progression de la roadmap"
            >
                <div className="h-full rounded-full bg-success transition-all" style={{ width: `${donePercent}%` }} />
            </div>
            <span className="font-mono text-xs font-semibold text-muted-foreground">
                {doneCount}/{total} terminés
            </span>
        </div>

        <div className="glass-card p-6 relative overflow-hidden">
            <div className="absolute left-9 top-8 bottom-8 w-0.5 bg-border/50" />

            <div className="space-y-8 relative z-10">
                {roadmapData.map((item, index) => {
                    let icon = <Circle className="h-3 w-3" />;
                    let colorClass = "text-muted-foreground border-muted-foreground";

                    if (item.status === 'done') {
                        icon = <CheckCircle2 className="h-4 w-4" />;
                        colorClass = "text-success border-success";
                    } else if (item.status === 'in-progress') {
                        icon = <Rocket className="h-3.5 w-3.5 animate-pulse" />;
                        colorClass = "text-primary border-primary";
                    } else {
                        icon = <Clock className="h-3.5 w-3.5" />;
                        colorClass = "text-muted-foreground/50 border-muted-foreground/30";
                    }

                    return (
                        <div
                            key={item.title}
                            className="flex gap-4 relative animate-fade-in"
                            style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
                        >
                            <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 z-10 bg-background",
                                colorClass
                            )}>
                                {icon}
                            </div>
                            <div className="pt-0.5 pb-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className={cn("font-bold text-sm", item.status === 'done' && "line-through opacity-70")}>
                                        {item.title}
                                    </h3>
                                    {item.status === 'in-progress' && (
                                        <Badge className="text-[9px] px-1 py-0 h-4 bg-primary/20 text-primary border-0">En cours</Badge>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-1">
                                    {item.description}
                                </p>
                                <span className="text-[10px] font-mono font-bold opacity-50 uppercase tracking-widest">
                                    {item.date}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
  );
}