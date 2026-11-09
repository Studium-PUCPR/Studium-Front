import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', maxWidth: '600px', margin: '40px auto', background: '#fee2e2', border: '1px solid #f87171', borderRadius: '8px' }}>
          <h2 style={{ color: '#b91c1c' }}>⚠️ Algo deu errado ao carregar o componente</h2>
          <p style={{ marginTop: '8px', fontSize: '0.9rem', color: '#7f1d1d' }}>
            {this.state.error?.message || 'Erro desconhecido'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{ marginTop: '16px', padding: '8px 16px', background: '#b91c1c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            🔄 Recarregar Aplicação
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
