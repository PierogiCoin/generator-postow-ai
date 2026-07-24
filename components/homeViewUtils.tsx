/**
 * HomeView utilities — hooki i komponenty pomocnicze wyciągnięte z HomeView.tsx
 * w celu zmniejszenia rozmiaru głównego pliku.
 */

import React from 'react';

export type HomeAnchor = 'problem' | 'solution' | 'methods' | 'branze' | 'how-it-works' | 'features' | 'use-cases' | 'faq';

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
  <div id={id} className="scroll-mt-28 mb-14 max-w-2xl">
    <h2 className="font-display text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.1]">
      {title}
    </h2>
    <p className="mt-4 text-slate-600 dark:text-slate-300 text-base md:text-lg leading-relaxed">
      {subtitle}
    </p>
  </div>
);

// ============================================================
// SEO meta tags hook
// ============================================================

interface SEOConfig {
  title: string;
  description: string;
  ogType?: string;
  ogImage?: string;
  canonicalUrl?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

export const useSEO = ({ title, description, ogType = 'website', ogImage, canonicalUrl, jsonLd }: SEOConfig) => {
  React.useEffect(() => {
    document.title = title;

    const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', ogType);
    if (ogImage) setMeta('property', 'og:image', ogImage);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    if (ogImage) setMeta('name', 'twitter:image', ogImage);

    if (canonicalUrl) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonicalUrl);
    }

    let jsonLdScript: HTMLScriptElement | null = null;
    if (jsonLd) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.type = 'application/ld+json';
      jsonLdScript.text = JSON.stringify(jsonLd);
      document.head.appendChild(jsonLdScript);
    }

    return () => {
      document.title = 'Generator Postów AI — Twórz viralowe posty social media z AI';
      if (jsonLdScript && jsonLdScript.parentNode) {
        jsonLdScript.parentNode.removeChild(jsonLdScript);
      }
    };
  }, [title, description, ogType, ogImage, canonicalUrl, jsonLd]);
};
