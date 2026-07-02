import React, { Component, ErrorInfo, ReactNode } from 'react';
import { reportError } from '../utils/errorReporting';
// Placeholder icons since they may not exist
const ExclamationTriangleIcon = ({ className }: { className?: string }) => <div className={className}>⚠️</div>;
const ArrowPathIcon = ({ className }: { className?: string }) => <div className={className}>🔄</div>;
const BugAntIcon = ({ className }: { className?: string }) => <div className={className}>🐛</div>;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    reportError(error, {
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Coś poszło nie tak
            </h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę lub skontaktuj się z supportem.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-4 text-left">
                <summary className="text-xs font-mono text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
                  Szczegóły błędu (dev)
                </summary>
                <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-800 dark:text-gray-200 overflow-auto max-h-32">
                  <div className="font-semibold text-red-600">Error:</div>
                  <div>{this.state.error.message}</div>
                  <div className="font-semibold text-red-600 mt-2">Stack:</div>
                  <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                  {this.state.errorInfo && (
                    <>
                      <div className="font-semibold text-red-600 mt-2">Component Stack:</div>
                      <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                    </>
                  )}
                  <div className="font-semibold text-gray-600 mt-2">Error ID:</div>
                  <div>{this.state.errorId}</div>
                </div>
              </details>
            )}

            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleReset}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Spróbuj ponownie
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                Odśwież stronę
              </button>
            </div>

            {process.env.NODE_ENV === 'production' && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                ID błędu: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundaries for different contexts
interface SectionErrorBoundaryProps {
  children: ReactNode;
  sectionName: string;
  fallback?: ReactNode;
}

export const SectionErrorBoundary: React.FC<SectionErrorBoundaryProps> = ({ 
  children, 
  sectionName, 
  fallback 
}) => {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    console.error(`Error in section "${sectionName}":`, error, errorInfo);
  };

  const customFallback = fallback || (
    <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
        <ExclamationTriangleIcon className="w-5 h-5" />
        <span className="font-medium">Sekcja "{sectionName}" jest tymczasowo niedostępna</span>
      </div>
      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
        Spróbuj odświeżyć stronę lub skontaktuj się z supportem.
      </p>
    </div>
  );

  return (
    <ErrorBoundary fallback={customFallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};

interface ModalErrorBoundaryProps {
  children: ReactNode;
  modalName: string;
  fallback?: ReactNode;
}

export const ModalErrorBoundary: React.FC<ModalErrorBoundaryProps> = ({ 
  children, 
  modalName, 
  fallback 
}) => {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    console.error(`Error in modal "${modalName}":`, error, errorInfo);
  };

  const customFallback = fallback || (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-3">
          <ExclamationTriangleIcon className="w-6 h-6" />
          <h3 className="font-semibold">Błąd modalu "{modalName}"</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Nie udało się załadować tego okna. Spróbuj ponownie później.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Zamknij
        </button>
      </div>
    </div>
  );

  return (
    <ErrorBoundary fallback={customFallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};

// Hook for handling async errors in functional components
export const useErrorHandler = () => {
  return React.useCallback((error: Error, context?: string) => {
    console.error(`Async error${context ? ` in ${context}` : ''}:`, error);
    
    // In production, you could send this to your error reporting service
    if (process.env.NODE_ENV === 'production') {
      // sendErrorToService(error, { context, timestamp: Date.now() });
    }
  }, []);
};

// Component for handling async errors in promises
export const AsyncErrorBoundary: React.FC<{
  children: ReactNode;
  onError?: (error: Error) => void;
}> = ({ children, onError }) => {
  const [error, setError] = React.useState<Error | null>(null);
  const handleError = useErrorHandler();

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      event.preventDefault();
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      setError(error);
      handleError(error, 'unhandled promise rejection');
      if (onError) onError(error);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, [handleError, onError]);

  if (error) {
    return (
      <div className="p-4 border border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-900/20">
        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
          <BugAntIcon className="w-5 h-5" />
          <span className="font-medium">Wystąpił błąd asynchroniczny</span>
        </div>
        <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
          {error.message}
        </p>
        <button
          onClick={() => setError(null)}
          className="mt-2 text-sm text-orange-600 dark:text-orange-400 hover:underline"
        >
          Ignoruj błąd
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default ErrorBoundary;
