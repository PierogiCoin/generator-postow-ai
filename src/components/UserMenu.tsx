import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../types';
import { UserIcon } from './icons/UserIcon';
import { LogOutIcon } from './icons/LogOutIcon';
import { UserCircleIcon } from './icons/UserCircleIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { BrainCircuitIcon } from './icons/BrainCircuitIcon';
import { useUIStore } from '../stores/uiStore';
import { useTranslation } from 'react-i18next';

interface UserMenuProps {
  user: User;
  onLogout: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setIsSocialConnectionsModalOpen, setIsBrandVoiceManagerOpen } = useUIStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogoutClick = () => {
    onLogout();
    setIsOpen(false);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleOpenSocial = () => {
    setIsSocialConnectionsModalOpen(true);
    setIsOpen(false);
  };

  const handleOpenBrandVoice = () => {
    setIsBrandVoiceManagerOpen(true);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full hover:bg-white/20 transition-colors p-1 focus:outline-none focus:ring-2 focus:ring-[var(--hero-accent)]"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="relative">
          <UserCircleIcon className="w-8 h-8 text-white" />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-64 bg-white/95 dark:bg-[#071018]/95 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-2xl z-50 animate-scale-in p-2">
          <div className="px-3 py-2.5 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Zalogowano jako</p>
              <p className="text-xs font-bold text-slate-800 dark:text-white truncate" title={user.email}>{user.name || user.email}</p>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[var(--hero-accent-soft)] text-[var(--hero-accent)] border border-[var(--hero-accent)]/20 shrink-0">
              {user.plan || 'Free'}
            </span>
          </div>

          <div className="py-1 space-y-0.5">
            <button
              onClick={() => handleNavigate('/account')}
              className="w-full text-left flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
            >
              <UserIcon className="w-4 h-4 text-sky-400" />
              {t('userMenu.myAccount', 'Moje konto')}
            </button>
            <button
              onClick={handleOpenBrandVoice}
              className="w-full text-left flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
            >
              <BrainCircuitIcon className="w-4 h-4 text-purple-400" />
              {t('userMenu.brandVoice', 'Głos Marki')}
            </button>
            <button
              onClick={handleOpenSocial}
              className="w-full text-left flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
            >
              <GlobeIcon className="w-4 h-4 text-emerald-400" />
              {t('userMenu.socialMedia', 'Połączone konta')}
            </button>
          </div>

          <div className="pt-1 border-t border-slate-200/70 dark:border-white/10">
            <button
              onClick={handleLogoutClick}
              className="w-full text-left flex items-center gap-3 px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
            >
              <LogOutIcon className="w-4 h-4" />
              Wyloguj się
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
