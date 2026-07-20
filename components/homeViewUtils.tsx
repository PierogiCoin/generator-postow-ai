/**
 * HomeView utilities — hooki i komponenty pomocnicze wyciągnięte z HomeView.tsx
 * w celu zmniejszenia rozmiaru głównego pliku.
 */

import React from 'react';

export type HomeAnchor = 'how-it-works' | 'features' | 'use-cases' | 'faq';

// ============================================================
// Hooks
// ============================================================

export const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }

    const legacyMedia = media as unknown as { addListener?: (fn: () => void) => void; removeListener?: (fn: () => void) => void };
    legacyMedia.addListener?.(update);
    return () => legacyMedia.removeListener?.(update);
  }, []);

  return reduced;
};

export const useInViewOnce = <T extends Element>(
  options?: Pick<IntersectionObserverInit, 'rootMargin' | 'threshold'>
) => {
  const ref = React.useRef<T | null>(null);
  const [isInView, setIsInView] = React.useState(false);
  const rootMargin = options?.rootMargin;
  const threshold = options?.threshold;

  React.useEffect(() => {
    const node = ref.current;
    if (!node || isInView) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setIsInView(true);
        observer.disconnect();
      }
    }, { rootMargin, threshold });

    observer.observe(node);
    return () => observer.disconnect();
  }, [isInView, rootMargin, threshold]);

  return { ref, isInView };
};

export const useCountUp = (endValue: number, start: boolean, durationMs = 900) => {
  // Przed animacją pokazuj docelową wartość (unikaj flasha „0+”).
  const [value, setValue] = React.useState(endValue);

  React.useEffect(() => {
    if (!Number.isFinite(endValue)) return;
    if (!start) {
      setValue(endValue);
      return;
    }

    setValue(0);
    let frameId = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(endValue * eased));
      if (t < 1) frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [durationMs, endValue, start]);

  return value;
};

// ============================================================
// Utilities
// ============================================================

export const scrollToAnchor = (anchor: HomeAnchor, preferReducedMotion: boolean) => {
  const node = document.getElementById(anchor);
  if (!node) return;
  node.scrollIntoView({ behavior: preferReducedMotion ? 'auto' : 'smooth', block: 'start' });
};

// ============================================================
// Shared components
// ============================================================

export const Reveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  reducedMotion: boolean;
}> = ({ children, className = '', reducedMotion }) => {
  const { ref, isInView } = useInViewOnce<HTMLDivElement>({ rootMargin: '120px 0px' });

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={`${className} ${isInView ? 'animate-slide-in' : 'opacity-0 translate-y-4'}`}
    >
      {children}
    </div>
  );
};

export const SectionHeader: React.FC<{ title: string; subtitle: string; id?: string }> = ({ title, subtitle, id }) => (
  <div id={id} className="text-center scroll-mt-28 mb-12">
    <h2 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
      {title}
    </h2>
    <p className="mt-3 max-w-xl mx-auto text-slate-600 dark:text-slate-300 text-base md:text-lg">
      {subtitle}
    </p>
  </div>
);
