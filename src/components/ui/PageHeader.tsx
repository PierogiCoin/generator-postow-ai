import React from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Wspólny nagłówek podstron — typografia Plus Jakarta Sans + akcent Studio Ink.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  actions,
  className = '',
}) => (
  <header className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 ${className}`}>
    <div className="min-w-0 space-y-2">
      {eyebrow ? (
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: 'var(--hero-accent)' }}
        >
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
        {title}
      </h1>
      {subtitle ? (
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
          {subtitle}
        </p>
      ) : null}
    </div>
    {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
  </header>
);

interface SurfaceProps {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'aside';
}

/** Lekka powierzchnia sekcji — bez glass/neon/kart z glow. */
export const Surface: React.FC<SurfaceProps> = ({ children, className = '', as: Tag = 'div' }) => (
  <Tag
    className={`border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0a1220]/70 ${className}`}
  >
    {children}
  </Tag>
);
