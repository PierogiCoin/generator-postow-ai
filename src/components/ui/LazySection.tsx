import React, { ReactNode } from 'react';
import { useInView } from 'react-intersection-observer';

interface LazySectionProps {
  children: ReactNode;
  fallback?: ReactNode;
  minHeight?: string;
}

export const LazySection: React.FC<LazySectionProps> = ({
  children,
  fallback,
  minHeight = 'h-64',
}) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '200px 0px',
  });

  return (
    <div ref={ref}>
      {inView
        ? children
        : fallback || (
            <div
              className={`w-full rounded-2xl bg-white/5 border border-white/10 animate-pulse ${minHeight}`}
            />
          )}
    </div>
  );
};

export default LazySection;
