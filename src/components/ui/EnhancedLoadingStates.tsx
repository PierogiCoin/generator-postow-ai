import React from 'react';

// Enhanced skeleton for different content types
export const EnhancedSkeletonCard: React.FC<{ 
  variant?: 'default' | 'list' | 'grid' | 'profile'; 
  className?: string 
}> = ({ variant = 'default', className = '' }) => {
  const variants = {
    default: (
      <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 ${className}`}>
        <div className="flex items-start gap-4 mb-4">
          <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
          <div className="flex-1">
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2 animate-pulse" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6 animate-pulse" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/6 animate-pulse" />
        </div>
        <div className="mt-4 flex gap-2">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-20 animate-pulse" />
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-24 animate-pulse" />
        </div>
      </div>
    ),
    list: (
      <div className={`bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          <div className="flex-1">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2 animate-pulse" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3 animate-pulse" />
          </div>
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16 animate-pulse" />
        </div>
      </div>
    ),
    grid: (
      <div className={`bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 ${className}`}>
        <div className="w-full h-32 bg-slate-200 dark:bg-slate-700 rounded-lg mb-3 animate-pulse" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2 animate-pulse" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3 animate-pulse" />
      </div>
    ),
    profile: (
      <div className={`flex items-center gap-4 p-4 ${className}`}>
        <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
        <div className="flex-1">
          <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mb-2 animate-pulse" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-pulse" />
        </div>
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-20 animate-pulse" />
      </div>
    )
  };

  return variants[variant];
};

// Progress indicator with steps
export const StepProgress: React.FC<{
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  className?: string;
}> = ({ currentStep, totalSteps, labels = [], className = '' }) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <React.Fragment key={`step-${i}`}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
              i < currentStep 
                ? 'bg-blue-600 text-white' 
                : i === currentStep 
                ? 'bg-blue-100 text-blue-600 border-2 border-blue-600' 
                : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
            }`}>
              {i < currentStep ? '✓' : i + 1}
            </div>
            {i < totalSteps - 1 && (
              <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                i < currentStep ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
      {labels.length > 0 && (
        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
          {labels.map((label, i) => (
            <div key={`label-${i}`} className="text-center max-w-[80px]">
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Enhanced button with loading state
export const LoadingButton: React.FC<{
  children: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}> = ({ 
  children, 
  isLoading = false, 
  disabled = false, 
  variant = 'primary',
  size = 'md',
  className = '',
  onClick
}) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 shadow-sm hover:shadow-md',
    secondary: 'bg-slate-600 text-white hover:bg-slate-700 disabled:bg-slate-300',
    outline: 'border-2 border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800'
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      onClick={onClick}
    >
      {isLoading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
};

// Floating action button
export const FloatingActionButton: React.FC<{
  icon: React.ReactNode;
  onClick: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
}> = ({ icon, onClick, position = 'bottom-right', className = '' }) => {
  const positions = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  return (
    <button
      onClick={onClick}
      className={`fixed ${positions[position]} w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
    >
      {icon}
    </button>
  );
};

// Toast notification component
export const Toast: React.FC<{
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}> = ({ message, type = 'info', duration = 3000, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const types = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-black',
    info: 'bg-blue-500 text-white'
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div className={`fixed top-4 right-4 ${types[type]} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-md animate-pulse`}>
      <span className="text-lg font-bold">{icons[type]}</span>
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-current/70 hover:text-current transition-colors"
      >
        ✕
      </button>
    </div>
  );
};
