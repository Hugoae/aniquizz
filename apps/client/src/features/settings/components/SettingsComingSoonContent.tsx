import { Construction } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsComingSoonContentProps {
  /** Larger padding/icon for the floating widget variant. */
  variant?: 'modal' | 'floating';
}

/** Shared placeholder body for global settings (modal + floating widget). */
export function SettingsComingSoonContent({ variant = 'modal' }: SettingsComingSoonContentProps) {
  const isFloating = variant === 'floating';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        isFloating ? 'gap-5 px-8 py-10' : 'space-y-4 py-8',
      )}
    >
      <div
        className={cn(
          'rounded-xl bg-primary/10 text-primary animate-pulse',
          isFloating ? 'p-5' : 'p-4',
        )}
      >
        <Construction className={isFloating ? 'h-12 w-12' : 'h-10 w-10'} aria-hidden />
      </div>
      <div className="space-y-2">
        <h3 className={cn('font-bold', isFloating ? 'text-xl' : 'text-lg')}>Bientôt disponible</h3>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">
          Les paramètres globaux (langue, audio, intégrations) arriveront dans une prochaine mise à jour.
        </p>
      </div>
    </div>
  );
}
