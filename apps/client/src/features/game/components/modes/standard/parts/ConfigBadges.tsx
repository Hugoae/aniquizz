import type { LucideIcon } from 'lucide-react';
import { Trophy, Music, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ConfigBadgesData {
  sourceLabel: string;
  difficultyLabel: string;
  precisionLabel: string;
  modeLabel: string;
}

const Chip = ({ icon: Icon, label, tone }: { icon: LucideIcon; label: string; tone: string }) => (
  <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background/95 px-3 py-1.5 shadow-lg">
    <Icon className={`h-3 w-3 ${tone}`} aria-hidden="true" />
    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">{label}</span>
  </div>
);

/** `positionClassName` overrides the default corner offset (e.g. to clear the
 * collapsed roster rail on the right in multiplayer). */
export function ConfigBadges({ data, positionClassName }: { data: ConfigBadgesData; positionClassName?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute bottom-4 z-40 flex flex-row items-center gap-2 opacity-80 transition-opacity hover:opacity-100',
        positionClassName ?? 'right-4',
      )}
    >
      <Chip icon={Trophy} label={data.difficultyLabel} tone="text-primary" />
      <Chip icon={Music} label={data.sourceLabel} tone="text-aqua" />
      <Chip icon={Target} label={data.precisionLabel} tone="text-accent" />
    </div>
  );
}
