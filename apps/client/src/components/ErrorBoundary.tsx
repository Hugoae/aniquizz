import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureClientError } from '@/lib/errorReporter';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

const STALE_CHUNK_PATTERN =
  /dynamically imported module|Importing a module script failed|ChunkLoadError/i;
const RELOAD_GUARD_KEY = 'aniquizz:stale-chunk-reload';
const RELOAD_GUARD_MS = 30_000;

/** A lazy route chunk that no longer exists (new deploy) or failed to load. */
function isStaleChunkError(error: Error): boolean {
  return STALE_CHUNK_PATTERN.test(error.message);
}

/** Reload at most once per window so a real outage cannot cause a reload loop. */
function shouldReloadForStaleChunk(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_GUARD_MS) return false;
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

/**
 * Catches uncaught React render errors and reports them when debug mode is on.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Always visible in the browser console (no secrets in a render error) so a
    // production crash can be diagnosed without enabling debug reporting.
    console.error('[ErrorBoundary]', error, info.componentStack);
    if (isStaleChunkError(error) && shouldReloadForStaleChunk()) {
      window.location.reload();
      return;
    }
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
            <h1 className="text-xl font-semibold text-foreground">Une erreur est survenue</h1>
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
