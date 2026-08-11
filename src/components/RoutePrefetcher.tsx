import { useEffect } from 'react';

const PREFETCH_ROUTES = [
  '/dashboard',
  '/generator',
  '/trends',
  '/calendar',
];

export const RoutePrefetcher: React.FC = () => {
  useEffect(() => {
    const prefetch = () => {
      for (const route of PREFETCH_ROUTES) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = route;
        link.as = 'document';
        document.head.appendChild(link);
      }
    };

    if ('requestIdleCallback' in window) {
      const id = (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(prefetch);
      return () => {
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
      };
    } else {
      const timer = setTimeout(prefetch, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  return null;
};
