import React from 'react';

interface ModernCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  hover?: boolean;
  glass?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  className = '',
  style,
  hover = false,
  glass = false,
  padding = 'md',
  onClick,
}) => {
  const baseClasses = 'rounded-2xl border transition-all duration-300';
  
  const glassClasses = glass
    ? 'glass shadow-lg'
    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-md';
  
  const hoverClasses = hover
    ? 'card-hover cursor-pointer'
    : 'hover:shadow-lg';
  
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };
  
  return (
    <div
      onClick={onClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
      style={style}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`${baseClasses} ${glassClasses} ${hoverClasses} ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
};
