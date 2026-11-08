import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { ADMIN_COPY } from '@/features/admin/copy/adminCopy';

type Props = {
  resetKey: string;
  children: ReactNode;
};

type State = {
  hasError: boolean;
  nonce: number;
};

/**
 * One tab can throw without taking down the staff nav. `resetKey` is the
 * active tab, so leaving the broken panel mounts a fresh tree.
 */
export class AdminPanelBoundary extends Component<Props, State> {
  state: State = { hasError: false, nonce: 0 };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[AdminPanelBoundary]', error, info.componentStack);
  }

  componentDidUpdate(prev: Props): void {
    if (prev.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  private retry = () => {
    this.setState((current) => ({ hasError: false, nonce: current.nonce + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-border bg-card p-6 text-center" role="alert">
          <h2 className="text-base font-semibold">{ADMIN_COPY.panelErrorTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{ADMIN_COPY.panelErrorBody}</p>
          <Button type="button" className="mt-4" onClick={this.retry}>
            {ADMIN_COPY.panelErrorRetry}
          </Button>
        </div>
      );
    }

    return <div key={this.state.nonce}>{this.props.children}</div>;
  }
}
