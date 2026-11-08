import type { RoomConfig } from '@aniquizz/shared';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

/** Shown to every participant: the match still plays, nothing is stored. */
export const TEST_MATCH_NOTICE =
  "Partie test : elle se joue normalement, mais rien n'est enregistré (historique, XP, statistiques).";

export function TestMatchBanner({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm leading-snug text-foreground',
        className,
      )}
    >
      {TEST_MATCH_NOTICE}
    </p>
  );
}

interface TestMatchOptionProps {
  config: RoomConfig;
  update: (patch: Partial<RoomConfig>) => void;
}

/** Admin create/edit control. The server ignores this flag for anyone else. */
export function TestMatchOption({ config, update }: TestMatchOptionProps) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2.5">
      <div className="min-w-0 space-y-1">
        <Label htmlFor="test-match" className="text-sm font-semibold">
          Partie test
        </Label>
        <p className="text-xs leading-snug text-muted-foreground">{TEST_MATCH_NOTICE}</p>
      </div>
      <Switch
        id="test-match"
        checked={config.testMatch === true}
        onCheckedChange={(testMatch) => update({ testMatch })}
        className="mt-0.5 shrink-0"
      />
    </div>
  );
}
