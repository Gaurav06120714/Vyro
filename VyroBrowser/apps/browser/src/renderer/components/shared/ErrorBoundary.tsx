import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  label?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', this.props.label ?? 'unknown', error, info.componentStack);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="flex flex-col items-center justify-center gap-3 flex-1 bg-[var(--bg-base)] text-white/50 p-6">
        <svg className="w-10 h-10 text-red-400/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p className="text-sm text-center">
          {this.props.label ? `${this.props.label} encountered an error` : 'Something went wrong'}
        </p>
        {this.state.error && (
          <p className="text-xs text-white/25 max-w-xs text-center truncate">
            {this.state.error.message}
          </p>
        )}
        <button
          onClick={this.handleReload}
          className="px-4 py-1.5 text-xs bg-white/8 hover:bg-white/12 rounded-lg border border-white/10 transition-colors"
        >
          Reload
        </button>
      </div>
    );
  }
}
