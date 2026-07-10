import { useMemo, useState } from 'react';
import { BookOpen, type LucideIcon } from 'lucide-react';
import type { GameConfig } from '@aniquizz/shared';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  buildLobbyRulesSections,
  type LobbyRulesContext,
} from '@/features/hub/components/lobby/lobbyRulesCopy';

function RulesSettingChip({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  className: string;
}) {
  return (
    <div className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold', className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="uppercase tracking-wide opacity-70">{label}</span>
      <span className="capitalize">{value}</span>
    </div>
  );
}

interface LobbyRulesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: GameConfig;
  context: LobbyRulesContext;
}

export function LobbyRulesDialog({ open, onOpenChange, config, context }: LobbyRulesDialogProps) {
  const sections = useMemo(() => buildLobbyRulesSections(config, context), [config, context]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 pb-4 pt-6 text-left">
          <DialogTitle className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xl">
            <span className="inline-flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
              Règles de la partie
            </span>
            <span className="text-sm font-normal text-muted-foreground">(selon la config actuelle)</span>
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-6">
            {sections.map((section) => (
              <section key={section.id} aria-labelledby={`lobby-rules-${section.id}`}>
                <h3
                  id={`lobby-rules-${section.id}`}
                  className="mb-2 text-sm font-bold uppercase tracking-wide text-primary"
                >
                  {section.title}
                </h3>

                {section.intro && (
                  <p className="mb-3 text-sm leading-relaxed text-foreground/90">{section.intro}</p>
                )}

                {section.lines && section.lines.length > 0 && (
                  <ul className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
                    {section.lines.map((line, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden="true" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {section.chips && section.chips.length > 0 && (
                  <div className={cn('flex flex-wrap gap-2', section.lines?.length ? 'mt-3' : undefined)}>
                    {section.chips.map((chip) => (
                      <RulesSettingChip
                        key={chip.key}
                        icon={chip.icon}
                        label={chip.label}
                        value={chip.value}
                        className={chip.className}
                      />
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface LobbyRulesTriggerProps {
  config: GameConfig;
  context: LobbyRulesContext;
  className?: string;
}

/** Opens the shared lobby rules modal — visible to host and guests. */
export function LobbyRulesTrigger({ config, context, className }: LobbyRulesTriggerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn('shrink-0 gap-1.5 border-border/60 bg-secondary/20 font-bold', className)}
        onClick={() => setOpen(true)}
      >
        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
        Règles
      </Button>
      <LobbyRulesDialog open={open} onOpenChange={setOpen} config={config} context={context} />
    </>
  );
}
