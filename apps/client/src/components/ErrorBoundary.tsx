import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureClientError } from '@/lib/errorReporter';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * Catches uncaught React render errors and reports them when debug mode is on.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    captureClientError(error, {
      source: 'react_error_boundary',
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center">
          <div className="max-w-md space-y-3">
            <h1 className="text-xl font-semibold text-foreground">
              Une erreur est survenue
            </h1>
            <p className="text-sm text-muted-foreground">
              Rechargez la page. Si le problème persiste, contactez le support.
            </p>
            <button
              type="button"
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
              onClick={() => window.location.reload()}
            >
              Recharger
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
