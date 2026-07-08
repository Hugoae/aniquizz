import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/** Shared focus outline for every custom toggle in the config form. */
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background';

export function SectionHeader({
  icon: Icon,
  title,
  tooltip,
}: {
  icon: LucideIcon;
  title: string;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
      <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</h3>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={`Aide : ${title}`}
              className={cn('rounded text-muted-foreground/40 transition-colors hover:text-primary', FOCUS_RING)}
            >
              <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[250px] text-xs">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

interface OptionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
  /** Token classes applied when active (defaults to the primary/violet look). */
  activeClassName?: string;
}

const DEFAULT_ACTIVE = 'border-primary bg-primary/10 text-primary';
const INACTIVE = 'border-border bg-card text-muted-foreground hover:bg-secondary/50';

/** Accessible pressed-state toggle used across the config sections. */
export function OptionButton({ active, activeClassName, className, children, ...props }: OptionButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'rounded-lg border transition-all disabled:cursor-not-allowed disabled:opacity-50',
        active ? activeClassName ?? DEFAULT_ACTIVE : INACTIVE,
        FOCUS_RING,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
