import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
  className?: string;
}

export function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext, 
  color = "text-primary",
  className 
}: StatCardProps) {
  return (
    <div className={cn(
      "bg-card/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:bg-card/60 transition-colors relative overflow-hidden group",
      className
    )}>
        {/* Icône en fond */}
        <div className={cn(
            "absolute top-3 right-3 p-2 rounded-full bg-white/5 opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all",
            color
        )}>
            <Icon className="h-5 w-5" />
        </div>
        
        <div>
            <div className={cn("text-3xl font-black mb-1", color)}>
                {value}
            </div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {label}
            </div>
        </div>
        
        {subtext && (
            <div className="text-[10px] text-muted-foreground/60 mt-2">
                {subtext}
            </div>
        )}
    </div>
  );
}