import React from 'react';

interface ModernInputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  error?: string;
  label?: string;
  fullWidth?: boolean;
}

export const ModernInput: React.FC<ModernInputProps> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled = false,
  className = '',
  icon,
  error,
  label,
  fullWidth = false,
}) => {
  const baseClasses = 'rounded-xl border-2 px-4 py-2.5 text-slate-900 dark:text-white bg-white dark:bg-slate-800 transition-all duration-300 focus:outline-none';
  
  const errorClasses = error
    ? 'border-red-400 dark:border-red-500 focus:border-red-500 dark:focus:border-red-600'
    : 'border-slate-300 dark:border-slate-600 focus:border-purple-500 dark:focus:border-purple-400 focus:shadow-lg';
  
  const widthClass = fullWidth ? 'w-full' : '';
  
  return (
    <div className={widthClass}>
      {label && (
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`${baseClasses} ${errorClasses} ${icon ? 'pl-10' : ''} ${widthClass} ${className}`}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};
