/**
 * NotFoundPage — 404 w stylu Studio Ink.
 */

import React from 'react';
import { Link } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col home-hero-wash text-white">
      <div className="absolute inset-0 home-grid-bg opacity-50 pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <p
          className="font-display text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: 'var(--hero-accent)' }}
        >
          Błąd
        </p>
        <p className="mt-4 font-display text-8xl md:text-9xl font-extrabold tracking-tight text-white/90 leading-none">
          404
        </p>
        <div className="mx-auto mt-5 h-px w-16 bg-[var(--hero-accent)]" aria-hidden="true" />
        <h1 className="mt-6 font-display text-2xl md:text-3xl font-bold tracking-tight">
          Ta strona nie istnieje
        </h1>
        <p className="mt-3 max-w-md text-slate-400 text-base leading-relaxed">
          Link jest nieprawidłowy albo treść została przeniesiona. Wróć do studia albo otwórz cennik.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg text-sm font-semibold text-white hover:brightness-110 transition-all"
            style={{ backgroundColor: 'var(--hero-accent)' }}
          >
            Strona główna
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg text-sm font-semibold text-slate-200 border border-white/20 hover:bg-white/5 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg text-sm font-semibold text-slate-200 border border-white/20 hover:bg-white/5 transition-colors"
          >
            Cennik
          </Link>
        </div>

        <p className="mt-12 text-sm text-slate-500">
          Potrzebujesz pomocy?{' '}
          <a
            href="mailto:support@generatorpostow.pl"
            className="underline underline-offset-2 hover:text-slate-300"
            style={{ color: 'var(--hero-accent)' }}
          >
            Napisz do nas
          </a>
        </p>
      </div>
    </div>
  );
};
