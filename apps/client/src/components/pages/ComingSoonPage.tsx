import type { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { SeoHead } from '@/components/seo/SeoHead';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { cn } from '@/lib/utils';

export interface ComingSoonPageProps {
  helmetTitle: string;
  helmetDescription: string;
  /** Canonical path for SEO (e.g. `/leaderboard`). */
  canonicalPath?: string;
  backLabel: string;
  backTo: string;
  icon: LucideIcon;
  /** Token-based classes for the icon (e.g. text-warning). */
  iconClassName?: string;
  /** Token-based glow behind the icon (e.g. bg-warning/20). */
  glowClassName?: string;
  /** Optional gradient/text styling for the heading. */
  headingClassName?: string;
  description: React.ReactNode;
  showHeader?: boolean;
  /** Optional secondary decorative icon (e.g. Sparkles). */
  secondaryIcon?: LucideIcon;
  secondaryIconClassName?: string;
}

export function ComingSoonPage({
  helmetTitle,
  helmetDescription,
  canonicalPath,
  backLabel,
  backTo,
  icon: Icon,
  iconClassName = 'text-primary',
  glowClassName = 'bg-primary/20',
  headingClassName = 'gradient-text',
  description,
  showHeader = false,
  secondaryIcon: SecondaryIcon,
  secondaryIconClassName,
}: ComingSoonPageProps) {
  const navigate = useNavigate();

  return (
    <>
      <SeoHead
        title={helmetTitle}
        description={helmetDescription}
        path={canonicalPath}
      />

      <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
        {showHeader && <Header />}

        <div className={cn('absolute left-6 z-10', showHeader ? 'top-24' : 'top-6')}>
          <Button
            variant="ghost"
            onClick={() => navigate(backTo)}
            className="gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
            {backLabel}
          </Button>
        </div>

        <main
          id="main-content"
          className={cn(
            'flex flex-1 flex-col items-center justify-center animate-fade-in space-y-8 px-6 pb-12',
            showHeader ? 'pt-24' : 'pt-16',
          )}
        >
          <div className="relative">
            <div className={cn('absolute inset-0 rounded-full blur-xl animate-pulse', glowClassName)} aria-hidden />
            <div className="relative animate-bounce rounded-full border border-border/60 bg-secondary/30 p-8">
              <Icon className={cn('h-16 w-16', iconClassName)} aria-hidden />
              {SecondaryIcon && (
                <SecondaryIcon
                  className={cn('absolute -right-1 -top-1 h-6 w-6 animate-pulse', secondaryIconClassName)}
                  aria-hidden
                />
              )}
            </div>
          </div>

          <div className="max-w-lg space-y-4 px-4 text-center">
            <h1 className="text-4xl font-black tracking-tight md:text-6xl">
              <span className={headingClassName}>BIENTÔT</span>
            </h1>
            <p className="text-lg text-muted-foreground">{description}</p>
          </div>
        </main>
      </div>
    </>
  );
}
