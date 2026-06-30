import React from 'react';

interface ModernInputProps {
  id?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  name?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  error?: string;
  label?: string;
  fullWidth?: boolean;
  required?: boolean;
}

export const ModernInput: React.FC<ModernInputProps> = ({
  id,
  type = 'text',
  name,
  placeholder,
  value,
  onChange,
  disabled = false,
  className = '',
  icon,
  error,
  label,
  fullWidth = false,
  required = false,
}) => {
  const baseClasses = 'rounded-2xl border px-4 py-3 text-slate-900 dark:text-white bg-white/40 dark:bg-slate-950/20 transition-all duration-300 focus:outline-none';
  
  const errorClasses = error
    ? 'border-red-500/50 focus:border-red-500 focus:shadow-[0_0_15px_rgba(239,68,68,0.2)]'
    : 'border-slate-200/60 dark:border-white/5 focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(0,220,233,0.25)]';
  
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
          id={id}
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`${baseClasses} ${errorClasses} ${icon ? 'pl-10' : ''} ${widthClass} ${className}`}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};
