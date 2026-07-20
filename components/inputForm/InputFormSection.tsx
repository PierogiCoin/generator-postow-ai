import React from 'react';

interface InputFormSectionProps {
  step?: number | string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Lżejsza sekcja bez tła (np. CTA) */
  bare?: boolean;
}

/** Spójna sekcja formularza — numer + tytuł + treść. */
export const InputFormSection: React.FC<InputFormSectionProps> = ({
  step,
  title,
  description,
  children,
  className = '',
  bare = false,
}) => (
  <section
    className={
      bare
        ? `space-y-4 ${className}`
        : `space-y-4 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/40 dark:bg-slate-950/25 p-4 sm:p-5 ${className}`
    }
  >
    <header className="flex items-start gap-3">
      {step != null && (
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-[11px] font-black text-cyan-700 dark:text-cyan-300 border border-cyan-500/25"
          aria-hidden
        >
          {step}
        </span>
      )}
      <div className="min-w-0">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
          {title}
        </h3>
        {description && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
        )}
      </div>
    </header>
    <div>{children}</div>
  </section>
);
