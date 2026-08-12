import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from "@/lib/router-compat";
import { ModernButton } from './ui';
import { useAuth } from '../contexts/AuthContext';

const primaryCtaClass =
  'rounded-lg px-8 py-3.5 !bg-[var(--hero-accent)] ![background-image:none] hover:brightness-110 text-white font-semibold shadow-none focus:!ring-[var(--hero-accent)]';

export const LoggedInHome: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-4 py-20 home-hero-wash text-white overflow-hidden">
      <div className="absolute inset-0 home-grid-bg opacity-60 pointer-events-none" aria-hidden="true" />
      <div
        className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #050d16, transparent)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-3xl mx-auto space-y-6">
        <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
          {t('home.logged_in.title')}
        </h1>
        <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
          {t('home.logged_in.subtitle')}
        </p>

        {typeof user?.credits === 'number' && (
          <p
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border border-[var(--hero-accent)]/30 bg-[var(--hero-accent-soft)] text-[var(--hero-accent)]"
          >
            {t('home.logged_in.credits', { count: user.credits })}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <ModernButton
            variant="primary"
            size="lg"
            onClick={() => navigate('/generator')}
            className={primaryCtaClass}
          >
            {t('home.logged_in.cta_generator')}
          </ModernButton>
          <ModernButton
            variant="outline"
            size="lg"
            onClick={() => navigate('/dashboard')}
            className="rounded-lg px-8 py-3.5 border-white/20 text-slate-200 bg-transparent hover:bg-white/5 hover:border-white/35 transition-colors duration-300"
          >
            {t('home.logged_in.cta_dashboard')}
          </ModernButton>
        </div>
      </div>
    </div>
  );
};

export default LoggedInHome;
