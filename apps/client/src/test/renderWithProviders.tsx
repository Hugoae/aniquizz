import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { TooltipProvider } from '@/components/ui/tooltip';

function Providers({ children }: { children: ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>;
}

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: Providers, ...options });
}
