import React, { useState } from 'react';

// Responsive grid that adapts to screen size
export const ResponsiveGrid: React.FC<{
  children: React.ReactNode;
  cols?: { xs?: number; sm?: number; md?: number; lg?: number; xl?: number };
  gap?: number;
  className?: string;
}> = ({ children, cols = { xs: 1, sm: 2, md: 3, lg: 4 }, gap = 4, className = '' }) => {
  const gridClasses = Object.entries(cols)
    .map(([breakpoint, col]) => `${breakpoint === 'xs' ? '' : `${breakpoint}:`}grid-cols-${col}`)
    .join(' ');

  return (
    <div className={`grid ${gridClasses} gap-${gap} ${className}`}>
      {children}
    </div>
  );
};

// Mobile-friendly card with swipe actions
export const SwipeableCard: React.FC<{
  children: React.ReactNode;
  leftAction?: { icon: React.ReactNode; onPress: () => void; color?: string };
  rightAction?: { icon: React.ReactNode; onPress: () => void; color?: string };
  className?: string;
}> = ({ children, leftAction, rightAction, className = '' }) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const startX = touch.clientX;
    // Handle swipe logic here
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Trigger actions based on final position
  };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateX(${translateX}px)`,
        transition: isDragging ? 'none' : 'transform 0.3s ease-out',
      }}
    >
      {leftAction && (
        <div
          className={`absolute left-0 top-0 h-full w-16 flex items-center justify-center ${leftAction.color || 'bg-green-500'}`}
          onClick={leftAction.onPress}
        >
          {leftAction.icon}
        </div>
      )}
      {rightAction && (
        <div
          className={`absolute right-0 top-0 h-full w-16 flex items-center justify-center ${rightAction.color || 'bg-red-500'}`}
          onClick={rightAction.onPress}
        >
          {rightAction.icon}
        </div>
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

// Bottom sheet for mobile
export const BottomSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: 'auto' | 'half' | 'full';
  className?: string;
}> = ({ isOpen, onClose, children, height = 'auto', className = '' }) => {
  const heights = {
    auto: 'max-h-[70vh]',
    half: 'h-[50vh]',
    full: 'h-[90vh]'
  };

  return (
    <>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
            onClick={onClose}
          />
          <div
            className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 rounded-t-2xl shadow-2xl z-50 transition-transform duration-300 ${heights[height]} ${className}`}
            style={{
              transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
            }}
          >
            <div className="w-12 h-1 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mt-3 mb-4" />
            <div className="overflow-y-auto">
              {children}
            </div>
          </div>
        </>
      )}
    </>
  );
};

// Mobile navigation drawer
export const MobileNavDrawer: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'left' | 'right';
  className?: string;
}> = ({ isOpen, onClose, children, position = 'left', className = '' }) => {
  return (
    <>
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
            onClick={onClose}
          />
          <div
            className={`fixed top-0 ${position}-0 h-full w-80 bg-white dark:bg-slate-800 shadow-2xl z-50 transition-transform duration-300 ${className}`}
            style={{
              transform: isOpen ? 'translateX(0)' : `translateX(${position === 'left' ? '-100%' : '100%'})`,
            }}
          >
            <div className="p-4">
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto">
              {children}
            </div>
          </div>
        </>
      )}
    </>
  );
};

// Touch-friendly button with haptic feedback
export const TouchButton: React.FC<{
  children: React.ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ children, onPress, variant = 'primary', size = 'md', className = '' }) => {
  const [isPressed, setIsPressed] = useState(false);

  const handlePressStart = () => {
    setIsPressed(true);
    // Haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handlePressEnd = () => {
    setIsPressed(false);
    onPress();
  };

  const variants = {
    primary: 'bg-blue-600 text-white active:bg-blue-700',
    secondary: 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 active:bg-slate-300 dark:active:bg-slate-600',
    ghost: 'bg-transparent text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800'
  };

  const sizes = {
    sm: 'px-4 py-3 min-h-[44px] text-sm',
    md: 'px-6 py-4 min-h-[48px] text-base',
    lg: 'px-8 py-6 min-h-[52px] text-lg'
  };

  return (
    <button
      className={`rounded-xl font-medium transition-all duration-150 ${variants[variant]} ${sizes[size]} ${isPressed ? 'scale-95' : ''} ${className}`}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
    >
      {children}
    </button>
  );
};

// Responsive container with safe areas
export const SafeAreaContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-900 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {children}
      </div>
    </div>
  );
};
