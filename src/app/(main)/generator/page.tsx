import { Suspense } from 'react';
import { GeneratorClient } from '@/components/generator/GeneratorClient';

/** Server shell — form/result live in client islands. */
export default function GeneratorPage() {
  return (
    <Suspense
      fallback={
        <div className="page-shell">
          <div className="h-72 rounded-2xl bg-white/5 border border-white/10 animate-pulse" />
        </div>
      }
    >
      <GeneratorClient />
    </Suspense>
  );
}
