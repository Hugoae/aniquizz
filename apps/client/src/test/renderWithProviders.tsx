import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LocaleTestProvider } from '@/features/i18n/LocaleContext';

function Providers({ children }: { children: ReactNode }) {
  return (
    <LocaleTestProvider>
      <TooltipProvider>{children}</TooltipProvider>
    </LocaleTestProvider>
  );
}

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: Providers, ...options });
}
