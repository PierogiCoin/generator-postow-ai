import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

// Icons
import { SearchIcon } from './icons/SearchIcon';
import { PostIcon } from './icons/PostIcon';
import { LayoutGridIcon } from './icons/LayoutGridIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { ChartPieIcon } from './icons/ChartPieIcon';
import { UserIcon } from './icons/UserIcon';
import { MoonIcon } from './icons/MoonIcon';
import { LogOutIcon } from './icons/LogOutIcon';

interface Command {
  id: string;
  title: string;
  icon: React.FC<any>;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();
  const { logout } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    { id: 'new-post', title: t('commandPalette.commands.newPost'), icon: PostIcon, action: () => navigate('/generator') },
    { id: 'dashboard', title: t('commandPalette.commands.goToDashboard'), icon: LayoutGridIcon, action: () => navigate('/dashboard'), keywords: ['home', 'main'] },
    { id: 'generator', title: t('commandPalette.commands.goToGenerator'), icon: PostIcon, action: () => navigate('/generator'), keywords: ['create', 'generate'] },
    { id: 'trends', title: t('commandPalette.commands.goToTrends'), icon: TrendingUpIcon, action: () => navigate('/trends') },
    { id: 'calendar', title: t('commandPalette.commands.goToCalendar'), icon: CalendarIcon, action: () => navigate('/calendar'), keywords: ['schedule'] },
    { id: 'analytics', title: t('commandPalette.commands.goToAnalytics'), icon: ChartPieIcon, action: () => navigate('/analytics'), keywords: ['stats', 'performance'] },
    { id: 'account', title: t('commandPalette.commands.goToAccount'), icon: UserIcon, action: () => navigate('/account'), keywords: ['profile', 'settings'] },
    { id: 'theme', title: t('commandPalette.commands.toggleTheme'), icon: MoonIcon, action: toggleTheme, keywords: ['dark', 'light', 'mode'] },
    { id: 'logout', title: t('commandPalette.commands.logout'), icon: LogOutIcon, action: logout, keywords: ['sign out', 'exit'] },
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.keywords?.some(k => k.includes(search.toLowerCase()))
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
        e.preventDefault();
        filteredCommands[selectedIndex].action();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands, selectedIndex, onClose]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-start justify-center z-50 pt-20"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-xl m-4 flex flex-col max-h-[60vh] animate-fade-in-down"
        style={{ animationDuration: '300ms' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 relative">
          <SearchIcon className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setSelectedIndex(0); }}
            placeholder={t('commandPalette.placeholder')}
            className="w-full bg-transparent pl-10 pr-4 py-2 text-slate-800 dark:text-white focus:outline-none"
          />
        </div>
        <div className="flex-grow overflow-y-auto p-2">
          {filteredCommands.length > 0 ? (
            <ul>
              {filteredCommands.map((cmd, index) => {
                const Icon = cmd.icon;
                return (
                  <li key={cmd.id}>
                    <button
                      onClick={() => { cmd.action(); onClose(); }}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                        index === selectedIndex ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{cmd.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-center p-6 text-sm text-slate-500">{t('commandPalette.noResults')}</p>
          )}
        </div>
        <div className="p-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 flex justify-end items-center gap-2">
            <span>Navigate: <kbd className="font-sans bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 rounded">↑</kbd> <kbd className="font-sans bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 rounded">↓</kbd></span>
            <span>Select: <kbd className="font-sans bg-slate-200 dark:bg-slate-600 px-1.5 py-0.5 rounded">↵</kbd></span>
        </div>
      </div>
    </div>
  );
};
