import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary captura errores de renderizado en componentes hijos
 * y muestra un mensaje en lugar de causar crash de toda la app.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Error caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-steel-900 dark:text-white mb-2">
              {this.props.fallbackTitle || 'Algo salió mal'}
            </h2>
            <p className="text-sm text-steel-600 dark:text-steel-400 mb-4">
              {this.state.error?.message || 'Ocurrió un error inesperado al cargar este módulo.'}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-steel-200 dark:bg-steel-700 hover:bg-steel-300 dark:hover:bg-steel-600 text-steel-900 dark:text-white rounded-lg font-semibold transition"
              >
                Recargar página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
