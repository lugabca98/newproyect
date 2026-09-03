import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleClearSession = () => {
    try {
      localStorage.removeItem('vulnerable_auth_token');
      localStorage.removeItem('vulnerable_auth_id');
      localStorage.removeItem('vulnerable_auth_email');
      localStorage.removeItem('vulnerable_auth_role');
      sessionStorage.clear();
    } catch {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          id="error-boundary-screen"
          className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center font-['Plus_Jakarta_Sans',sans-serif]"
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h1 className="text-xl font-bold text-white tracking-tight">
              {this.props.fallbackTitle || 'Ocurrió un error al cargar la vista'}
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              No te preocupes, tus datos y perfil siguen protegidos. Podés recargar la aplicación o reanudar tu sesión.
            </p>

            {this.state.error?.message && (
              <div className="w-full p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-left text-xs font-mono text-rose-300 max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-2">
              <button
                id="btn-error-reload"
                type="button"
                onClick={this.handleReset}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-rose-600/30"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reintentar / Recargar</span>
              </button>

              <button
                id="btn-error-clear-session"
                type="button"
                onClick={this.handleClearSession}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition border border-slate-700"
              >
                <LogOut className="w-4 h-4" />
                <span>Volver al Inicio</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
