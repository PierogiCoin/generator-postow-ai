/**
 * NotFoundPage — strona 404 z friendly UX.
 * Oferuje nawigację do głównych secji aplikacji.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Sparkles, LayoutDashboard, HelpCircle } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="text-center max-w-lg">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-fuchsia-500 to-indigo-500 shadow-lg mb-8">
          <span className="text-4xl font-black text-white">404</span>
        </div>

        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Ups! Ta strona nie istnieje
        </h1>

        <p className="mt-4 text-slate-600 dark:text-slate-400">
          Wygląda na to, że link jest nieprawidłowy lub strona została przeniesiona.
          Wróć do strony głównej lub skorzystaj z nawigacji poniżej.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/"
            className="inline-flex flex-col items-center gap-2 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
          >
            <Home className="w-6 h-6 text-indigo-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Strona główna</span>
          </Link>

          <Link
            to="/app"
            className="inline-flex flex-col items-center gap-2 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-fuchsia-300 dark:hover:border-fuchsia-700 transition-colors"
          >
            <LayoutDashboard className="w-6 h-6 text-fuchsia-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Dashboard</span>
          </Link>

          <Link
            to="/pricing"
            className="inline-flex flex-col items-center gap-2 p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
          >
            <Sparkles className="w-6 h-6 text-amber-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Cennik</span>
          </Link>
        </div>

        <div className="mt-8 inline-flex items-center gap-2 text-sm text-slate-400">
          <HelpCircle className="w-4 h-4" />
          Potrzebujesz pomocy?{' '}
          <a href="mailto:support@generatorpostow.pl" className="text-indigo-600 dark:text-indigo-400 underline">
            Napisz do nas
          </a>
        </div>
      </div>
    </div>
  );
};
