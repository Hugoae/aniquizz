import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeTrialHistoryProps {
    history: any[];
}

export function TimeTrialHistory({ history }: TimeTrialHistoryProps) {
    return (
        <div className="hidden xl:flex flex-col w-[400px] shrink-0 pt-2 h-[80vh] overflow-hidden">
             <div className="flex items-center gap-2 mb-4 px-2">
                <span className="text-sm font-bold uppercase text-muted-foreground tracking-wider">Historique</span>
                <div className="h-px bg-white/10 flex-1" />
             </div>
             
             <div className="flex-1 space-y-3 px-2 pb-10">
                {/* ✅ LIMITATION DE L'AFFICHAGE : On ne garde que les 6 premiers éléments pour éviter le scroll */}
                {history && history.slice(0, 6).map((item, index) => (
                    <div 
                        key={item.id + index} 
                        className={cn(
                            "flex items-center gap-3 p-3 rounded-xl border-2 transition-all animate-in slide-in-from-top-4 duration-300",
                            item.status === 'success' 
                                ? "bg-green-500/10 border-green-500/30 text-green-100" 
                                : "bg-red-500/10 border-red-500/30 text-red-100 opacity-80"
                        )}
                    >
                        <div className="relative h-12 w-12 rounded-lg overflow-hidden shrink-0 border border-white/10 shadow-sm">
                            <img src={item.cover} alt="Cover" className="h-full w-full object-cover" />
                            <div className={cn("absolute inset-0 flex items-center justify-center bg-black/40", item.status === 'success' ? "text-green-400" : "text-red-400")}>
                                {item.status === 'success' ? <Check className="w-6 h-6" /> : <X className="w-6 h-6" />}
                            </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm truncate leading-tight">{item.anime}</div>
                            <div className="flex items-center gap-2 text-xs opacity-70 mt-1">
                                <span className="uppercase font-mono tracking-wider text-[10px] bg-black/20 px-1.5 py-0.5 rounded">{item.type}</span>
                                <span className="truncate">{item.title}</span>
                            </div>
                        </div>

                        <div className={cn("font-black font-mono text-sm px-2 py-1 rounded", item.status === 'success' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                            {item.status === 'success' ? '+5s' : '-5s'}
                        </div>
                    </div>
                ))}
                
                {history && history.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground text-sm italic opacity-50 border border-dashed border-white/10 rounded-xl">
                        En attente du premier round...
                    </div>
                )}
             </div>
        </div>
    );
}