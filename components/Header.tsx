import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from './icons/SparklesIcon';
import { ThemeToggle } from './ThemeToggle';
import { PostIcon } from './icons/PostIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { ChartPieIcon } from './icons/ChartPieIcon';
import { UserMenu } from './UserMenu';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { TeamSwitcher } from './TeamSwitcher';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserPlan, GenerationType } from '../types';
import { BeakerIcon } from './icons/BeakerIcon';
import { FilmIcon } from './icons/FilmIcon';
import { LayoutGridIcon } from './icons/LayoutGridIcon';
import { MenuIcon } from './icons/MenuIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { UserIcon } from './icons/UserIcon';
import { CampaignIcon } from './icons/CampaignIcon';
import { BrainCircuitIcon } from './icons/BrainCircuitIcon';

interface HeaderProps {
  isCalendarEnabled: boolean;
  onUpgradeClick: () => void;
  onLoginClick: () => void;
  onSignUpClick: () => void;
  notificationSystem: React.ReactNode;
}

const NavItem: React.FC<{ to: string, children: React.ReactNode, title?: string, disabled?: boolean, onClick?: () => void }> = ({ to, children, title, disabled, onClick }) => (
    <NavLink
        to={to}
        title={title}
        onClick={onClick}
        className={({ isActive }) => `flex items-center justify-center md:justify-start gap-3 px-3 md:px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            isActive ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-100 hover:text-white hover:bg-white/10'
        } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`
       }
    >
        {children}
    </NavLink>
);

const BottomNavItem: React.FC<{ to: string, icon: React.FC<any>, label: string }> = ({ to, icon: Icon, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) => `flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
    >
        <Icon className="w-6 h-6" />
        <span className="text-[10px] font-bold">{label}</span>
    </NavLink>
);

const BottomNavBar: React.FC<{ onOpenCreateMenu: () => void, onOpenMoreMenu: () => void }> = ({ onOpenCreateMenu, onOpenMoreMenu }) => {
    const { t } = useTranslation();
    return (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 h-16 glass border-t border-slate-200/50 dark:border-slate-700/50 z-40 shadow-lg">
            <nav className="grid grid-cols-5 items-stretch h-full px-2">
                <BottomNavItem to="/dashboard" icon={LayoutGridIcon} label={t('header.nav.dashboard')} />
                <BottomNavItem to="/trends" icon={TrendingUpIcon} label={t('header.nav.trends')} />
                <div className="flex items-center justify-center">
                    <button onClick={onOpenCreateMenu} className="w-14 h-14 -mt-7 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full text-white shadow-xl flex items-center justify-center transform transition-all active:scale-90 hover:shadow-2xl hover:rotate-12 animate-pulse-glow">
                        <SparklesIcon className="w-7 h-7" />
                    </button>
                </div>
                <BottomNavItem to="/calendar" icon={CalendarIcon} label={t('header.nav.calendar')} />
                <button onClick={onOpenMoreMenu} className="flex flex-col items-center justify-center gap-1 w-full h-full text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                    <MenuIcon className="w-6 h-6" />
                    <span className="text-[10px] font-bold">{t('header.nav.more')}</span>
                </button>
            </nav>
        </div>
    );
};

const MobileCreateMenu: React.FC<{ createNavItems: any[], onClose: () => void }> = ({ createNavItems, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 sm:hidden" onClick={onClose}>
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-80 max-w-[90vw] glass rounded-2xl shadow-2xl p-3 animate-slide-in">
                <div className="grid grid-cols-2 gap-2">
                    {createNavItems.map(({ id, to, label, icon: Icon, state }) => (
                         <NavLink
                            key={id}
                            to={to}
                            state={state}
                            onClick={onClose}
                            className="flex flex-col items-center justify-center gap-3 p-4 text-slate-700 dark:text-slate-300 hover:bg-gradient-to-br hover:from-purple-100 hover:to-blue-100 dark:hover:from-purple-900/30 dark:hover:to-blue-900/30 rounded-xl transition-all hover:scale-105 active:scale-95"
                        >
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white shadow-lg">
                                <Icon className="w-6 h-6"/>
                            </div>
                            <span className="font-semibold text-sm text-center">{label}</span>
                        </NavLink>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const Header: React.FC<HeaderProps> = ({ 
  isCalendarEnabled, 
  onUpgradeClick,
  onLoginClick,
  onSignUpClick,
  notificationSystem,
}) => {
  const { user, logout, setCurrentTeamId } = useAuth();
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [isMobileCreateMenuOpen, setIsMobileCreateMenuOpen] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const userPlan = user?.plan || UserPlan.Free;
  const isAnalyticsEnabled = [UserPlan.Pro, UserPlan.Agency, UserPlan.Business].includes(userPlan);
  const isStrategistEnabled = [UserPlan.Pro, UserPlan.Agency, UserPlan.Business].includes(userPlan);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setIsCreateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen && mobileMenuRef.current) {
        const focusableElements = mobileMenuRef.current.querySelectorAll(
            'a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsMobileMenuOpen(false);
            }
            if (e.key === 'Tab') {
                if (e.shiftKey) { // Shift+Tab
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else { // Tab
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        firstElement?.focus();

        return () => document.removeEventListener('keydown', handleKeyDown);
    }
}, [isMobileMenuOpen]);

  const createNavItems = [
      { id: 'new-post', to: '/generator', label: t('header.nav.newPost'), icon: PostIcon, state: null, disabled: false },
      { id: 'new-campaign', to: '/generator', label: t('header.nav.newCampaign'), icon: CampaignIcon, state: { prefillData: { generationType: GenerationType.Campaign } }, disabled: false },
      { id: 'new-storyboard', to: '/storyboard', label: t('header.nav.newStoryboard'), icon: FilmIcon, state: null, disabled: false },
  ];

  const mainNavItems = [
      { id: 'dashboard', to: '/dashboard', label: t('header.nav.dashboard'), icon: LayoutGridIcon, state: null },
      { id: 'strategist', to: '/strategist', label: t('header.nav.strategist'), icon: BrainCircuitIcon, disabled: !isStrategistEnabled, title: !isStrategistEnabled ? t('header.strategistDisabledTooltip') : t('header.strategistTooltip'), state: null },
      { id: 'trends', to: '/trends', label: t('header.nav.trends'), icon: TrendingUpIcon, state: null },
      { id: 'calendar', to: '/calendar', label: t('header.nav.calendar'), icon: CalendarIcon, disabled: !isCalendarEnabled, title: !isCalendarEnabled ? t('header.calendarDisabledTooltip') : t('header.calendarTooltip'), state: null },
      { id: 'analytics', to: '/analytics', label: t('header.nav.analytics'), icon: ChartPieIcon, disabled: !isAnalyticsEnabled, title: !isAnalyticsEnabled ? t('header.analyticsDisabledTooltip') : t('header.analyticsTooltip'), state: null },
  ];
  
  const mobileDrawerNavItems = [
      { id: 'strategist', to: '/strategist', label: t('header.nav.strategist'), icon: BrainCircuitIcon, disabled: !isStrategistEnabled },
      { id: 'analytics', to: '/analytics', label: t('header.nav.analytics'), icon: ChartPieIcon, disabled: !isAnalyticsEnabled },
      { id: 'account', to: '/account', label: t('userMenu.myAccount'), icon: UserIcon, disabled: false },
  ];

  return (
    <>
      <header className="glass sticky top-0 z-40 border-b border-white/20 dark:border-slate-700/50">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <NavLink to={user ? "/dashboard" : "/"} className="flex items-center gap-2 group" aria-label="Strona główna">
              <div className="bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl p-1.5 shadow-lg group-hover:scale-110 transition-transform">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <h1 className="hidden sm:block text-xl lg:text-2xl font-bold gradient-text tracking-tight">
                {t('header.title')}
              </h1>
            </NavLink>
            {user && <TeamSwitcher user={user} onSwitchTeam={setCurrentTeamId} />}
          </div>
          
          {user && (
              <nav className="hidden sm:flex items-center gap-1">
                  {mainNavItems.map(({ id, to, label, icon: Icon, disabled, title }) => (
                       <NavItem key={id} to={to} title={title || label} disabled={disabled}>
                          <Icon className="w-5 h-5"/>
                          <span className="hidden md:inline">{label}</span>
                       </NavItem>
                  ))}
                  {/* Create Dropdown */}
                  <div className="relative" ref={createMenuRef}>
                      <button
                          onClick={() => setIsCreateMenuOpen(prev => !prev)}
                          className={`flex items-center justify-center md:justify-start gap-2 px-3 md:px-4 py-2 text-sm font-semibold rounded-md transition-colors ${isCreateMenuOpen ? 'bg-white/20 text-white' : 'text-blue-100 hover:text-white hover:bg-white/10'}`}
                      >
                           <SparklesIcon className="w-5 h-5"/>
                           <span className="hidden md:inline">{t('header.nav.create')}</span>
                           <ChevronDownIcon className={`w-4 h-4 transition-transform ${isCreateMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isCreateMenuOpen && (
                          <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-50 animate-fade-in p-2" style={{animationDuration: '150ms'}}>
                              {createNavItems.map(({id, to, label, icon: Icon, state}) => (
                                   <NavLink
                                      key={id}
                                      to={to}
                                      state={state}
                                      onClick={() => setIsCreateMenuOpen(false)}
                                      className={({ isActive }) => `flex w-full items-center gap-3 px-3 py-2 text-sm rounded-md ${isActive ? 'bg-slate-100 dark:bg-slate-900 font-semibold text-slate-800 dark:text-white' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                  >
                                      <Icon className="w-5 h-5"/>
                                      {label}
                                  </NavLink>
                              ))}
                          </div>
                      )}
                  </div>
              </nav>
          )}

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-4">
                <LanguageSwitcher />
                <ThemeToggle />
                {notificationSystem}
            </div>
            {user ? (
              <UserMenu user={user} onLogout={logout} />
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                 <button 
                  onClick={onLoginClick}
                  className="px-4 py-2 text-sm font-medium text-white rounded-md border border-white/50 hover:bg-white/20 transition-colors"
                >
                  {t('header.login')}
                </button>
                 <button 
                  onClick={onSignUpClick}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-white rounded-md hover:bg-blue-50 transition-colors shadow-sm"
                >
                  <SparklesIcon className="w-5 h-5" />
                  {t('header.signup')}
                </button>
              </div>
            )}
             {/* The mobile menu hamburger is now replaced by the bottom nav bar */}
          </div>
        </div>
      </header>
      
      {/* Mobile "More" Menu Drawer */}
      {isMobileMenuOpen && (
        <div 
            className="fixed inset-0 z-50 sm:hidden"
            ref={mobileMenuRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-menu-heading"
        >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className={`absolute top-0 right-0 h-full w-4/5 max-w-sm bg-slate-50 dark:bg-slate-900 shadow-2xl p-6 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                <div>
                    <div className="flex justify-between items-center mb-8">
                        <h2 id="mobile-menu-heading" className="text-2xl font-semibold text-slate-800 dark:text-white">Menu</h2>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-500 dark:text-slate-400">
                            <XMarkIcon className="w-6 h-6"/>
                        </button>
                    </div>
                    <nav className="flex flex-col gap-2">
                        {user ? (
                            <>
                            {mobileDrawerNavItems.map(({id, to, label, icon: Icon, disabled = false }) => (
                                <NavLink
                                    key={id}
                                    to={to}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={({ isActive }) => `flex items-center gap-3 px-4 py-2 text-base font-semibold rounded-md transition-colors ${isActive ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {label}
                                </NavLink>
                            ))}
                            <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
                            {user && <TeamSwitcher user={user} onSwitchTeam={(id) => {setCurrentTeamId(id); setIsMobileMenuOpen(false);}}/>}
                            </>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <button onClick={() => {onLoginClick(); setIsMobileMenuOpen(false);}} className="w-full px-4 py-2 text-base font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-md">
                                {t('header.login')}
                                </button>
                                <button onClick={() => {onSignUpClick(); setIsMobileMenuOpen(false);}} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-base font-medium text-white bg-blue-600 rounded-md">
                                <SparklesIcon className="w-5 h-5" />
                                {t('header.signup')}
                                </button>
                            </div>
                        )}
                    </nav>
                </div>
                <div className="mt-auto pt-6 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4">
                    <LanguageSwitcher />
                    <ThemeToggle />
                </div>
            </div>
        </div>
      )}
      
      {/* Mobile "Create" menu */}
      {isMobileCreateMenuOpen && <MobileCreateMenu createNavItems={createNavItems} onClose={() => setIsMobileCreateMenuOpen(false)} />}
      
      {/* Bottom Navigation Bar */}
      {user && <BottomNavBar onOpenCreateMenu={() => setIsMobileCreateMenuOpen(true)} onOpenMoreMenu={() => setIsMobileMenuOpen(true)} />}
    </>
  );
};