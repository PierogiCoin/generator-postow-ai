import React from 'react';

// Skeleton loader for text content
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({ 
  lines = 3, 
  className = '' 
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={`line-${i}`}
          className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"
          style={{ width: `${100 - (i * 10)}%` }}
        />
      ))}
    </div>
  );
};

// Skeleton loader for cards
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 ${className}`}>
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4 animate-pulse" />
      <SkeletonText lines={4} />
      <div className="mt-6 h-10 bg-slate-200 dark:bg-slate-700 rounded w-full animate-pulse" />
    </div>
  );
};

// Loading spinner
export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={`${sizeClasses[size]} border-purple-600 border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Ładowanie"
    />
  );
};

// Progress bar with percentage
export const ProgressBar: React.FC<{ 
  progress: number; 
  label?: string;
  showPercentage?: boolean;
  className?: string;
}> = ({ 
  progress, 
  label, 
  showPercentage = true,
  className = '' 
}) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </span>
          {showPercentage && (
            <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
              {Math.round(progress)}%
            </span>
          )}
        </div>
      )}
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
};

// Pulsating dots animation
export const PulsatingDots: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex space-x-2 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={`dot-${i}`}
          className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
};

// Full screen loading overlay
export const LoadingOverlay: React.FC<{ 
  message?: string;
  submessage?: string;
  progress?: number;
}> = ({ message = 'Generowanie...', submessage, progress }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center animate-fade-in">
      <div 
        className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-3xl shadow-2xl border border-white/10 dark:border-white/5 p-8 max-w-md w-full mx-4 backdrop-blur-xl animate-scale-in"
        role="dialog"
        aria-modal="true"
        aria-busy="true"
        aria-labelledby="loading-title"
        aria-describedby={submessage ? "loading-description" : undefined}
      >
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <Spinner size="lg" className="text-purple-600 dark:text-purple-400" />
            <div className="absolute inset-0 bg-purple-600/20 rounded-full animate-ping"></div>
          </div>
          <div className="text-center space-y-3">
            <h3 
              id="loading-title"
              className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent"
            >
              {message}
            </h3>
            {submessage && (
              <p 
                id="loading-description"
                className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed animate-fade-in-up" 
                style={{ animationDelay: '0.2s' }}
              >
                {submessage}
              </p>
            )}
            <div className="flex items-center justify-center space-x-2 text-xs text-slate-500 dark:text-slate-500" aria-hidden="true">
              <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-pulse"></div>
              <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
              <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
            </div>
          </div>
          {progress !== undefined && (
            <div className="w-full space-y-2 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <ProgressBar 
                progress={progress} 
                showPercentage 
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Inicjalizacja AI...</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Inline loading state for buttons
export const ButtonLoading: React.FC<{ label?: string }> = ({ label = 'Ładowanie...' }) => {
  return (
    <span className="flex items-center space-x-2">
      <Spinner size="sm" />
      <span>{label}</span>
    </span>
  );
};
