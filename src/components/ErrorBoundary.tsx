import React, { ErrorInfo } from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;

    if (error) {
      return (
        <div className="h-screen flex items-center justify-center bg-stone-100 p-6">
          <div className="bg-white rounded-[2rem] civic-shadow p-10 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-black text-stone-800 mb-2 tracking-tight">Error inesperado</h2>
            <p className="text-stone-500 text-sm mb-2">
              Ocurrió un problema en la aplicación.
            </p>
            <p className="text-stone-400 text-xs font-mono bg-stone-50 rounded-xl px-4 py-2 mb-8 break-words">
              {error.message}
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:opacity-90 transition-all active:scale-95"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
