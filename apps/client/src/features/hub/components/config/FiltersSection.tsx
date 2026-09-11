import { SlidersHorizontal } from 'lucide-react';
import type { RoomConfig } from '@aniquizz/shared';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { SectionHeader, OptionButton } from './ConfigPrimitives';
import { SOUND_TYPES, DIFFICULTY_OPTIONS } from './formOptions';

interface FiltersSectionProps {
  config: RoomConfig;
  toggleSoundType: (type: string) => void;
  toggleDifficulty: (id: string) => void;
}

export function FiltersSection({ config, toggleSoundType, toggleDifficulty }: FiltersSectionProps) {
  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-secondary/10 p-3 shadow-inner">
      <SectionHeader
        icon={SlidersHorizontal}
        title="Sélection musicale"
        tooltip="Types de sons et difficulté — appliqués à la source Aléatoire et au tirage du pool."
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Types</Label>
          <div className="flex flex-wrap gap-2">
            {SOUND_TYPES.map(({ id, label, icon: Icon }) => (
              <OptionButton
                key={id}
                active={config.soundTypes.includes(id)}
                activeClassName="border-primary bg-primary text-primary-foreground"
                onClick={() => toggleSoundType(id)}
                aria-label={label}
                className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold"
              >
                <Icon className="h-4 w-4" aria-hidden="true" /> {label}
              </OptionButton>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Difficulté</Label>
          <div className="flex gap-2">
            {DIFFICULTY_OPTIONS.map(({ id, label, activeClassName }) => (
              <OptionButton
                key={id}
                active={config.difficulty.includes(id)}
                activeClassName={cn(activeClassName, 'shadow-sm')}
                onClick={() => toggleDifficulty(id)}
                className="flex-1 py-1.5 text-[11px] font-bold uppercase"
              >
                {label}
              </OptionButton>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
