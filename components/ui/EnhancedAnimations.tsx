import React from 'react';

// Fade in animation component
export const FadeIn: React.FC<{
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  className?: string;
}> = ({ children, duration = 300, delay = 0, className = '' }) => {
  return (
    <div
      className={`animate-fade-in ${className}`}
      style={{
        animation: `fadeIn ${duration}ms ease-out ${delay}ms both`,
      }}
    >
      {children}
    </div>
  );
};

// Slide up animation
export const SlideUp: React.FC<{
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  className?: string;
}> = ({ children, duration = 300, delay = 0, className = '' }) => {
  return (
    <div
      className={`animate-slide-up ${className}`}
      style={{
        animation: `slideUp ${duration}ms ease-out ${delay}ms both`,
      }}
    >
      {children}
    </div>
  );
};

// Scale animation for buttons and cards
export const ScaleOnHover: React.FC<{
  children: React.ReactNode;
  scale?: number;
  className?: string;
}> = ({ children, scale = 1.05, className = '' }) => {
  return (
    <div
      className={`transform transition-transform duration-200 hover:scale-${Math.round(scale * 100)} ${className}`}
      style={{
        '--tw-scale-x': scale,
        '--tw-scale-y': scale,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

// Pulse animation for important elements
export const Pulse: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {children}
    </div>
  );
};

// Stagger animation for lists
export const StaggeredList: React.FC<{
  children: React.ReactNode[];
  staggerDelay?: number;
  className?: string;
}> = ({ children, staggerDelay = 100, className = '' }) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <FadeIn delay={index * staggerDelay} key={index}>
          {child}
        </FadeIn>
      ))}
    </div>
  );
};

// Add these CSS animations to your global styles
export const animationStyles = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fadeIn var(--duration, 300ms) ease-out var(--delay, 0ms) both;
  }

  .animate-slide-up {
    animation: slideUp var(--duration, 300ms) ease-out var(--delay, 0ms) both;
  }

  .hover\\:scale-105:hover {
    transform: scale(1.05);
  }

  .hover\\:scale-110:hover {
    transform: scale(1.1);
  }
`;
