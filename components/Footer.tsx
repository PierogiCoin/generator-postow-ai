import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrandMarkIcon } from './icons/BrandMarkIcon';
import { useAuth } from '../contexts/AuthContext';
import { useUIStore } from '../stores/uiStore';

const linkClass =
  'text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer';

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { setIsPricingModalOpen } = useUIStore();

  return (
    <footer
      className={`border-t border-slate-200/70 dark:border-white/10 bg-[var(--hero-surface)] ${
        user ? 'pb-24 sm:pb-0' : ''
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <span className="rounded-lg p-1.5" style={{ backgroundColor: 'var(--hero-navy)' }}>
            <BrandMarkIcon className="w-4 h-4 text-[var(--hero-accent)]" />
          </span>
          <span className="font-display text-sm font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('header.title')}
          </span>
        </Link>

        <nav
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
          aria-label={t('footer.ariaLabel')}
        >
          <button type="button" onClick={() => setIsPricingModalOpen(true)} className={linkClass}>
            {t('footer.pricing')}
          </button>
          <Link to="/terms" className={linkClass}>
            {t('footer.terms')}
          </Link>
          <Link to="/privacy" className={linkClass}>
            {t('footer.privacy')}
          </Link>
        </nav>

        <p className="text-xs text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} {t('header.title')}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
