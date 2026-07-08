import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StatColorToken } from '@/features/profile/statColors';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtext?: string;
  color?: StatColorToken;
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
      "bg-card/40 border border-border rounded-xl p-5 flex flex-col justify-between hover:bg-card/60 transition-colors relative overflow-hidden group",
      className
    )}>
        {/* Background icon */}
        <div className={cn(
            "absolute top-3 right-3 p-2 rounded-lg bg-secondary opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all",
            color
        )}>
            <Icon className="h-5 w-5" />
        </div>
        
        <div>
            <div className={cn("font-mono text-3xl font-bold mb-1", color)}>
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