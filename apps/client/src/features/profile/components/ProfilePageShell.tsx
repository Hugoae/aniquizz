import type { ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { cn } from '@/lib/utils';

export const PROFILE_PAGE_SHELL_CLASS =
  'min-h-dvh bg-background pb-[max(5rem,env(safe-area-inset-bottom))]';

export function ProfilePageShell({
  children,
  mainClassName,
}: {
  children: ReactNode;
  mainClassName?: string;
}) {
  return (
    <div className={PROFILE_PAGE_SHELL_CLASS}>
      <Header />
      <main
        id="main-content"
        className={cn('pt-24 container max-w-[1400px] mx-auto px-4', mainClassName)}
      >
        {children}
      </main>
    </div>
  );
}
