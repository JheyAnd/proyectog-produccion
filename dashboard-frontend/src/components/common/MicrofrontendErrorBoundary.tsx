import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
}

export default class MicrofrontendErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Error de conexión con el Microfrontend:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center bg-white rounded-xl shadow-sm border border-red-100 m-6">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Lo siento, no podemos mostrarte esta información.
          </h2>
          <p className="text-gray-600 max-w-md">
            El servidor del módulo de <strong>{this.props.moduleName || 'Flujo de Caja'}</strong> parece estar apagado o inaccesible en este momento.
          </p>
          <button 
            onClick={() => {
              this.setState({ hasError: false });
              // Forzamos una recarga completa para intentar buscar el código nuevo y saltar caché de React
              window.location.reload();
            }}
            className="mt-6 px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors"
          >
            Reintentar conexión
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
