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
        className="flex items-center gap-2 rounded-full hover:bg-white/20 transition-colors p-1"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <UserCircleIcon className="w-8 h-8 text-white" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-50 animate-fade-in" style={{ animationDuration: '150ms' }}>
          <div className="p-2">
            <div className="px-2 py-2">
              <p className="text-sm text-slate-500 dark:text-slate-400">Zalogowano jako</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate" title={user.email}>{user.email}</p>
            </div>
            <div className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
            <button
              onClick={() => handleNavigate('/account')}
              className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-md transition-colors"
            >
              <UserIcon className="w-5 h-5" />
              {t('userMenu.myAccount')}
            </button>
            <button
              onClick={handleOpenBrandVoice}
              className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-md transition-colors"
            >
              <BrainCircuitIcon className="w-5 h-5" />
              {t('userMenu.brandVoice')}
            </button>
            <button
              onClick={handleOpenSocial}
              className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-md transition-colors"
            >
              <GlobeIcon className="w-5 h-5" />
              {t('userMenu.socialMedia')}
            </button>
            <button
              onClick={handleLogoutClick}
              className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
            >
              <LogOutIcon className="w-5 h-5" />
              Wyloguj
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
