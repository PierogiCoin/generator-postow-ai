import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
import { UsersIcon } from './icons/UsersIcon';

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
        className={({ isActive }) => `group flex items-center justify-center md:justify-start gap-3 px-4 md:px-5 py-3 text-sm font-semibold rounded-xl transition-all duration-300 relative overflow-hidden ${isActive
                ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/20 text-white shadow-lg shadow-indigo-500/25 backdrop-blur-md border border-indigo-400/30 scale-[1.02] animate-pulse-subtle'
                : 'text-slate-400 dark:text-slate-300 hover:text-white hover:bg-gradient-to-r hover:from-white/10 hover:to-white/5 border border-transparent hover:border-white/10 hover:scale-[1.01] hover:shadow-lg'
            } ${disabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`
        }
    >
        <div className={`absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-xl group-hover:scale-105`}></div>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
        <div className="relative z-10 flex items-center gap-3 transition-transform duration-300 group-hover:scale-105">
            {children}
        </div>
    </NavLink>
);

const BottomNavItem: React.FC<{ to: string, icon: React.FC<any>, label: string }> = ({ to, icon: Icon, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) => `group flex flex-col items-center justify-center gap-2 w-full h-full py-2 transition-all duration-300 relative ${isActive 
            ? 'text-transparent bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text scale-105 animate-pulse-subtle' 
            : 'text-slate-500 dark:text-slate-400 opacity-70 hover:opacity-100 hover:scale-105'}`
        }
    >
        <div className={`absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
        <div className="relative z-10 flex flex-col items-center gap-1 transition-transform duration-300 group-hover:scale-105">
            <Icon className="w-6 h-6 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6" />
            <span className="text-[10px] font-bold uppercase tracking-tight transition-all duration-300 group-hover:tracking-normal group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-indigo-400 group-hover:to-purple-400 group-hover:bg-clip-text">{label}</span>
        </div>
    </NavLink>
);

const BottomNavBar: React.FC<{ onOpenCreateMenu: () => void, onOpenMoreMenu: () => void }> = ({ onOpenCreateMenu, onOpenMoreMenu }) => {
    const { t } = useTranslation();
    return (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 h-20 glass border-t border-white/10 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.2)] pb-4 px-4 flex items-center">
            <nav className="grid grid-cols-5 items-center w-full bg-slate-900/40 dark:bg-black/40 rounded-3xl h-14 border border-white/5 backdrop-blur-xl px-2">
                <BottomNavItem to="/dashboard" icon={LayoutGridIcon} label={t('header.nav.dashboard')} />
                <BottomNavItem to="/trends" icon={TrendingUpIcon} label={t('header.nav.trends')} />
                <div className="relative flex items-center justify-center -mt-10">
                    <button
                        onClick={onOpenCreateMenu}
                        className="w-16 h-16 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-full text-white shadow-[0_0_30px_rgba(168,85,247,0.5)] flex items-center justify-center transform transition-all active:scale-90 hover:scale-110 animate-pulse-glow border-4 border-slate-900 shadow-2xl"
                    >
                        <SparklesIcon className="w-8 h-8" />
                    </button>
                </div>
                <BottomNavItem to="/calendar" icon={CalendarIcon} label={t('header.nav.calendar')} />
                <button onClick={onOpenMoreMenu} className="flex flex-col items-center justify-center gap-1 w-full h-full text-slate-500 dark:text-slate-400 opacity-70 hover:opacity-100 transition-all">
                    <MenuIcon className="w-6 h-6" />
                    <span className="text-[9px] font-black uppercase tracking-tighter">{t('header.nav.more')}</span>
                </button>
            </nav>
        </div>
    );
};

interface CreateNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  to: string;
  state?: any;
  disabled?: boolean;
  badge?: string;
}

const MobileCreateMenu: React.FC<{ createNavItems: CreateNavItem[], onClose: () => void }> = ({ createNavItems, onClose }) => {
    const { t } = useTranslation();
    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg z-[60] sm:hidden animate-fade-in" onClick={onClose}>
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-gradient-to-br from-slate-900/95 to-slate-800/95 rounded-[3rem] border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] p-6 animate-slide-in backdrop-blur-2xl">
                <div className="grid grid-cols-2 gap-3">
                    {createNavItems.map(({ id, to, label, icon: Icon, state, disabled }, i) => (
                        <NavLink
                            key={id}
                            to={to}
                            state={state}
                            onClick={onClose}
                            className={`group flex flex-col items-center justify-center gap-3 p-4 bg-gradient-to-br from-white/[0.08] to-white/[0.02] rounded-2xl border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 hover:scale-105 active:scale-95 animate-fade-in-up relative overflow-hidden ${disabled ? 'opacity-30 cursor-not-allowed pointer-events-none' : ''}`}
                            style={{ animationDelay: `${i * 0.08}s`, animationFillMode: 'both' }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                            <div className="relative z-10 w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/25 rotate-6 hover:rotate-0 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-purple-500/40">
                                <Icon className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                            </div>
                            <span className="relative z-10 font-bold text-xs text-center uppercase tracking-tight text-slate-200 group-hover:text-white transition-colors duration-300">{label}</span>
                        </NavLink>
                    ))}
                </div>
                <button 
                    onClick={onClose} 
                    className="w-full mt-6 py-3 text-sm font-bold text-slate-400 hover:text-white bg-gradient-to-r from-white/5 to-transparent rounded-xl transition-all duration-300 hover:bg-white/10 border border-white/5 hover:border-white/10"
                >
                    {t('common.close')}
                </button>
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
    const location = useLocation();
    const isLandingPage = location.pathname === '/';
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
        { id: 'competitors', to: '/competitors', label: 'Konkurencja', icon: UsersIcon, state: null },
    ];

    const mobileDrawerNavItems = [
        { id: 'strategist', to: '/strategist', label: t('header.nav.strategist'), icon: BrainCircuitIcon, disabled: !isStrategistEnabled },
        { id: 'analytics', to: '/analytics', label: t('header.nav.analytics'), icon: ChartPieIcon, disabled: !isAnalyticsEnabled },
        { id: 'competitors', to: '/competitors', label: 'Konkurencja', icon: UsersIcon, disabled: false },
        { id: 'account', to: '/account', label: t('userMenu.myAccount'), icon: UserIcon, disabled: false },
    ];

    const landingNavItems: Array<
        | { id: string; label: string; href: string }
        | { id: string; label: string; onClick: () => void }
    > = [
        { id: 'how-it-works', href: '#how-it-works', label: t('home.nav.howItWorks') },
        { id: 'features', href: '#features', label: t('home.nav.features') },
        { id: 'pricing', onClick: onUpgradeClick, label: t('home.nav.pricing') },
        { id: 'faq', href: '#faq', label: t('home.nav.faq') },
    ];

    const landingNavLinkClass =
        'px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 rounded-xl hover:text-slate-900 dark:hover:text-white hover:bg-white/10 transition-colors';

    const landingNavMobileLinkClass =
        'px-5 py-3 text-base font-semibold text-slate-700 dark:text-slate-200 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left w-full';

    return (
        <>
            <header className="glass sticky top-0 z-[50] border-b border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.1)] backdrop-blur-xl">
                <div className="max-w-screen-2xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6 lg:gap-8">
                        <NavLink to={user ? "/dashboard" : "/"} className="flex items-center gap-3 group" aria-label="Strona główna">
                            <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-2.5 shadow-[0_0_30px_rgba(99,102,241,0.4)] group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-pink-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>
                                <SparklesIcon className="w-6 h-6 text-white relative z-10 transition-transform duration-500 group-hover:rotate-12" />
                            </div>
                            <h1 className="hidden sm:block text-2xl lg:text-3xl font-black bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent tracking-tighter group-hover:scale-105 transition-all duration-300 group-hover:from-indigo-600 group-hover:via-purple-600 group-hover:to-pink-600 dark:group-hover:from-indigo-400 dark:group-hover:via-purple-400 dark:group-hover:to-pink-400">
                                {t('header.title')}
                            </h1>
                        </NavLink>
                        {user && <TeamSwitcher user={user} onSwitchTeam={setCurrentTeamId} />}
                        {!user && isLandingPage && (
                            <nav className="hidden md:flex items-center gap-1 ml-2" aria-label={t('home.nav.ariaLabel')}>
                                {landingNavItems.map((item) =>
                                    'href' in item ? (
                                        <a key={item.id} href={item.href} className={landingNavLinkClass}>
                                            {item.label}
                                        </a>
                                    ) : (
                                        <button key={item.id} type="button" onClick={item.onClick} className={landingNavLinkClass}>
                                            {item.label}
                                        </button>
                                    )
                                )}
                            </nav>
                        )}
                    </div>

                    {user && (
                        <nav className="hidden sm:flex items-center gap-2 p-2 bg-gradient-to-br from-slate-900/40 to-slate-800/40 rounded-[1.5rem] border border-white/[0.08] backdrop-blur-md shadow-inner">
                            {mainNavItems.map(({ id, to, label, icon: Icon, disabled, title }) => (
                                <NavItem key={id} to={to} title={title || label} disabled={disabled}>
                                    <Icon className="w-5 h-5 opacity-80" />
                                    <span className="hidden lg:inline text-xs uppercase tracking-tighter">{label}</span>
                                </NavItem>
                            ))}
                            {/* Create Dropdown */}
                            <div className="relative" ref={createMenuRef}>
                                <button
                                    onClick={() => setIsCreateMenuOpen(prev => !prev)}
                                    className={`flex items-center justify-center md:justify-start gap-2 px-3 md:px-5 py-2.5 text-xs font-black uppercase tracking-tighter rounded-xl transition-all duration-300 ${isCreateMenuOpen ? 'bg-white/10 text-white shadow-inner' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}
                                >
                                    <SparklesIcon className="w-5 h-5 text-indigo-400" />
                                    <span className="hidden lg:inline">{t('header.nav.create')}</span>
                                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${isCreateMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isCreateMenuOpen && (
                                    <div className="absolute top-full right-0 mt-3 w-64 glass border border-white/10 rounded-2xl shadow-2xl z-50 animate-scale-in p-2 overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                                        {createNavItems.map(({ id, to, label, icon: Icon, state }) => (
                                            <NavLink
                                                key={id}
                                                to={to}
                                                state={state}
                                                onClick={() => setIsCreateMenuOpen(false)}
                                                className={({ isActive }) => `flex w-full items-center gap-4 px-4 py-3 text-sm font-bold rounded-xl transition-all ${isActive ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 dark:text-slate-300 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                <div className="p-2 bg-slate-800 rounded-lg">
                                                    <Icon className="w-5 h-5" />
                                                </div>
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
                            <>
                                <div className="hidden sm:flex items-center gap-2">
                                    <button
                                        onClick={onLoginClick}
                                        className="px-6 py-2.5 text-sm font-bold text-white rounded-xl border border-white/20 hover:bg-white/10 transition-all active:scale-95"
                                    >
                                        {t('header.login')}
                                    </button>
                                    <button
                                        onClick={onSignUpClick}
                                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-black text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all active:scale-95 shadow-lg"
                                    >
                                        <SparklesIcon className="w-5 h-5" />
                                        {t('header.signup')}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsMobileMenuOpen(true)}
                                    className="sm:hidden p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/10 border border-white/10"
                                    aria-label={t('home.nav.openMenu')}
                                >
                                    <MenuIcon className="w-6 h-6" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Mobile "More" Menu Drawer */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-[100] sm:hidden"
                    ref={mobileMenuRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="mobile-menu-heading"
                >
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-fade-in" onClick={() => setIsMobileMenuOpen(false)}></div>
                    <div className={`absolute top-0 right-0 h-full w-4/5 max-w-sm bg-white dark:bg-slate-900 shadow-2xl p-8 transition-transform duration-500 ease-out glass border-l border-white/10 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                        <div>
                            <div className="flex justify-between items-center mb-10">
                                <h2 id="mobile-menu-heading" className="text-3xl font-black gradient-text tracking-tighter">Menu</h2>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400">
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                            <nav className="flex flex-col gap-3">
                                {user ? (
                                    <>
                                        {mobileDrawerNavItems.map(({ id, to, label, icon: Icon, disabled = false }, i) => (
                                            <NavLink
                                                key={id}
                                                to={to}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={({ isActive }) => `flex items-center gap-4 px-5 py-4 text-base font-bold rounded-2xl transition-all animate-fade-in-right ${isActive ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'} ${disabled ? 'opacity-30 pointer-events-none' : ''}`}
                                                style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'both' }}
                                            >
                                                <Icon className="w-6 h-6" />
                                                {label}
                                            </NavLink>
                                        ))}
                                        <div className="my-4 border-t border-slate-200 dark:border-slate-800" />
                                        {user && <TeamSwitcher user={user} onSwitchTeam={(id) => { setCurrentTeamId(id); setIsMobileMenuOpen(false); }} />}
                                    </>
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        {isLandingPage && (
                                            <nav className="flex flex-col gap-2 mb-2" aria-label={t('home.nav.ariaLabel')}>
                                                {landingNavItems.map((item) =>
                                                    'href' in item ? (
                                                        <a
                                                            key={item.id}
                                                            href={item.href}
                                                            onClick={() => setIsMobileMenuOpen(false)}
                                                            className={landingNavMobileLinkClass}
                                                        >
                                                            {item.label}
                                                        </a>
                                                    ) : (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => {
                                                                item.onClick();
                                                                setIsMobileMenuOpen(false);
                                                            }}
                                                            className={landingNavMobileLinkClass}
                                                        >
                                                            {item.label}
                                                        </button>
                                                    )
                                                )}
                                            </nav>
                                        )}
                                        <button onClick={() => { onLoginClick(); setIsMobileMenuOpen(false); }} className="w-full py-4 text-base font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                            {t('header.login')}
                                        </button>
                                        <button onClick={() => { onSignUpClick(); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-center gap-3 py-4 text-base font-black text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                                            <SparklesIcon className="w-6 h-6" />
                                            {t('header.signup')}
                                        </button>
                                    </div>
                                )}
                            </nav>
                        </div>
                        <div className="mt-auto pt-8 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-6">
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

export default Header;