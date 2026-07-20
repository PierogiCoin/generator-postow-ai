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

const NavItem: React.FC<{ to: string; children: React.ReactNode; title?: string; disabled?: boolean }> = ({
    to,
    children,
    title,
    disabled,
}) => (
    <NavLink
        to={to}
        title={title}
        end={to === '/dashboard'}
        className={({ isActive }) =>
            `flex items-center gap-2 px-3 lg:px-3.5 py-2 text-xs font-bold uppercase tracking-wide rounded-xl transition-colors ${
                isActive
                    ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/35'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/5 border border-transparent'
            } ${disabled ? 'opacity-35 cursor-not-allowed pointer-events-none' : ''}`
        }
    >
        {children}
    </NavLink>
);

const BottomNavItem: React.FC<{
    to: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
}> = ({ to, icon: Icon, label }) => (
    <NavLink
        to={to}
        end={to === '/dashboard'}
        className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 w-full h-full min-h-[44px] transition-colors ${
                isActive
                    ? 'text-cyan-600 dark:text-cyan-400'
                    : 'text-slate-500 dark:text-slate-400'
            }`
        }
    >
        <Icon className="w-5 h-5" />
        <span className="text-[10px] font-bold tracking-tight">{label}</span>
    </NavLink>
);

const BottomNavBar: React.FC<{ onOpenCreateMenu: () => void; onOpenMoreMenu: () => void }> = ({
    onOpenCreateMenu,
    onOpenMoreMenu,
}) => {
    const { t } = useTranslation();
    return (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
            <nav
                className="pointer-events-auto grid grid-cols-5 items-end gap-1 w-full max-w-lg mx-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl shadow-lg px-1 py-1.5"
                aria-label={t('header.nav.ariaLabel', 'Nawigacja główna')}
            >
                <BottomNavItem to="/dashboard" icon={LayoutGridIcon} label={t('header.nav.dashboard')} />
                <BottomNavItem to="/calendar" icon={CalendarIcon} label={t('header.nav.calendar')} />
                <div className="flex items-center justify-center -mt-5">
                    <button
                        type="button"
                        onClick={onOpenCreateMenu}
                        className="w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform border-4 border-white dark:border-slate-950 hover:brightness-110"
                        style={{ backgroundColor: 'var(--hero-accent)', boxShadow: '0 10px 24px color-mix(in srgb, var(--hero-accent) 35%, transparent)' }}
                        aria-label={t('header.nav.create')}
                    >
                        <SparklesIcon className="w-7 h-7" />
                    </button>
                </div>
                <BottomNavItem to="/generator" icon={PostIcon} label={t('header.nav.generator')} />
                <button
                    type="button"
                    onClick={onOpenMoreMenu}
                    className="flex flex-col items-center justify-center gap-0.5 w-full h-full min-h-[44px] text-slate-500 dark:text-slate-400"
                >
                    <MenuIcon className="w-5 h-5" />
                    <span className="text-[10px] font-bold tracking-tight">{t('header.nav.more')}</span>
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
  state?: Record<string, unknown> | null;
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
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const [isMobileCreateMenuOpen, setIsMobileCreateMenuOpen] = useState(false);
    const createMenuRef = useRef<HTMLDivElement>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    const userPlan = user?.plan || UserPlan.Free;
    const isAnalyticsEnabled = [UserPlan.Pro, UserPlan.Agency, UserPlan.Business, UserPlan.Enterprise].includes(userPlan);
    const isStrategistEnabled = [UserPlan.Pro, UserPlan.Agency, UserPlan.Business, UserPlan.Enterprise].includes(userPlan);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
                setIsCreateMenuOpen(false);
            }
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setIsMoreMenuOpen(false);
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsCreateMenuOpen(false);
                setIsMoreMenuOpen(false);
                setIsMobileCreateMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
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

    /** Główne ścieżki codziennej pracy — widoczne od razu na desktopie */
    const primaryNavItems = [
        { id: 'dashboard', to: '/dashboard', label: t('header.nav.dashboard'), icon: LayoutGridIcon },
        { id: 'generator', to: '/generator', label: t('header.nav.generator'), icon: PostIcon },
        {
            id: 'calendar',
            to: '/calendar',
            label: t('header.nav.calendar'),
            icon: CalendarIcon,
            disabled: !isCalendarEnabled,
            title: !isCalendarEnabled ? t('header.calendarDisabledTooltip') : t('header.calendarTooltip'),
        },
        {
            id: 'analytics',
            to: '/analytics',
            label: t('header.nav.analytics'),
            icon: ChartPieIcon,
            disabled: !isAnalyticsEnabled,
            title: !isAnalyticsEnabled ? t('header.analyticsDisabledTooltip') : t('header.analyticsTooltip'),
        },
    ];

    /** Rzadziej używane — w menu „Więcej” */
    const moreNavItems = [
        {
            id: 'strategist',
            to: '/strategist',
            label: t('header.nav.strategist'),
            icon: BrainCircuitIcon,
            disabled: !isStrategistEnabled,
            title: !isStrategistEnabled ? t('header.strategistDisabledTooltip') : t('header.strategistTooltip'),
        },
        { id: 'trends', to: '/trends', label: t('header.nav.trends'), icon: TrendingUpIcon },
        { id: 'competitors', to: '/competitors', label: t('header.nav.competitors'), icon: UsersIcon },
        { id: 'analyzer', to: '/analyzer', label: t('header.nav.analyzer'), icon: BeakerIcon },
        { id: 'storyboard', to: '/storyboard', label: t('header.nav.storyboard'), icon: FilmIcon },
    ];

    const mobileDrawerNavItems = [
        ...primaryNavItems,
        ...moreNavItems,
        { id: 'account', to: '/account', label: t('userMenu.myAccount'), icon: UserIcon },
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
                <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4 lg:gap-6 min-w-0">
                        <NavLink to={user ? "/dashboard" : "/"} className="flex items-center gap-3 group flex-shrink-0" aria-label="Strona główna">
                            <div
                                className="rounded-xl p-2.5 shadow-md group-hover:brightness-110 transition-all duration-300 relative overflow-hidden"
                                style={{ backgroundColor: 'var(--hero-accent)' }}
                            >
                                <SparklesIcon className="w-6 h-6 text-white relative z-10" />
                            </div>
                            <h1 className="hidden sm:block text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tighter group-hover:opacity-90 transition-opacity duration-300">
                                {t('header.title')}
                            </h1>
                        </NavLink>
                        {user && <div className="min-w-0 hidden sm:block"><TeamSwitcher user={user} onSwitchTeam={setCurrentTeamId} /></div>}
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
                        <nav
                            className="hidden sm:flex items-center gap-1 p-1.5 rounded-2xl border border-slate-200/70 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-md"
                            aria-label={t('header.nav.ariaLabel', 'Nawigacja główna')}
                        >
                            {primaryNavItems.map(({ id, to, label, icon: Icon, disabled, title }) => (
                                <NavItem key={id} to={to} title={title || label} disabled={disabled}>
                                    <Icon className="w-4 h-4 shrink-0 opacity-90" />
                                    <span className="hidden lg:inline">{label}</span>
                                </NavItem>
                            ))}

                            <div className="relative" ref={moreMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsMoreMenuOpen((v) => !v);
                                        setIsCreateMenuOpen(false);
                                    }}
                                    aria-expanded={isMoreMenuOpen}
                                    aria-haspopup="menu"
                                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wide rounded-xl transition-colors border ${
                                        isMoreMenuOpen || moreNavItems.some((i) => location.pathname.startsWith(i.to))
                                            ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/35'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-white/5 border-transparent'
                                    }`}
                                >
                                    <span className="hidden lg:inline">{t('header.nav.more')}</span>
                                    <MenuIcon className="w-4 h-4 lg:hidden" />
                                    <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isMoreMenuOpen && (
                                    <div
                                        role="menu"
                                        className="absolute top-full right-0 mt-2 w-56 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-xl z-50 p-1.5"
                                    >
                                        {moreNavItems.map(({ id, to, label, icon: Icon, disabled, title }) => (
                                            <NavLink
                                                key={id}
                                                to={to}
                                                title={title}
                                                role="menuitem"
                                                onClick={() => setIsMoreMenuOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
                                                        isActive
                                                            ? 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300'
                                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                    } ${disabled ? 'opacity-35 pointer-events-none' : ''}`
                                                }
                                            >
                                                <Icon className="w-4 h-4 shrink-0" />
                                                {label}
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-0.5" aria-hidden />

                            <div className="relative" ref={createMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreateMenuOpen((prev) => !prev);
                                        setIsMoreMenuOpen(false);
                                    }}
                                    aria-expanded={isCreateMenuOpen}
                                    aria-haspopup="menu"
                                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wide rounded-xl transition-colors ${
                                        isCreateMenuOpen
                                            ? 'bg-cyan-600 text-white'
                                            : 'bg-cyan-600/90 hover:bg-cyan-500 text-white'
                                    }`}
                                >
                                    <SparklesIcon className="w-4 h-4" />
                                    <span className="hidden md:inline">{t('header.nav.create')}</span>
                                    <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${isCreateMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isCreateMenuOpen && (
                                    <div
                                        role="menu"
                                        className="absolute top-full right-0 mt-2 w-60 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shadow-xl z-50 p-1.5"
                                    >
                                        {createNavItems.map(({ id, to, label, icon: Icon, state }) => (
                                            <NavLink
                                                key={id}
                                                to={to}
                                                state={state}
                                                role="menuitem"
                                                onClick={() => setIsCreateMenuOpen(false)}
                                                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                                                    <Icon className="w-4 h-4" />
                                                </span>
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
                            {user && notificationSystem}
                        </div>
                        {user ? (
                            <>
                                {typeof user.credits === 'number' && (
                                    <button
                                        type="button"
                                        onClick={onUpgradeClick}
                                        className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-colors"
                                        title={t('header.creditsTooltip', 'Saldo kredytów')}
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5 text-cyan-400" />
                                        {user.credits.toLocaleString('pl-PL')}
                                    </button>
                                )}
                                <UserMenu user={user} onLogout={logout} />
                            </>
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
                                        className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl hover:brightness-110 transition-all active:scale-95 shadow-md"
                                        style={{ backgroundColor: 'var(--hero-accent)' }}
                                    >
                                        {t('header.signup')}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={onSignUpClick}
                                    className="sm:hidden flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-white rounded-xl shadow-md active:scale-95 transition-all hover:brightness-110"
                                    style={{ backgroundColor: 'var(--hero-accent)' }}
                                >
                                    {t('header.signup')}
                                </button>
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
                                <h2 id="mobile-menu-heading" className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {t('header.nav.menu', 'Menu')}
                                </h2>
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400">
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                            <nav className="flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                                {user ? (
                                    <>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 mb-1">
                                            {t('header.nav.sectionMain', 'Główne')}
                                        </p>
                                        {mobileDrawerNavItems.slice(0, 4).map(({ id, to, label, icon: Icon, disabled = false }) => (
                                            <NavLink
                                                key={id}
                                                to={to}
                                                end={to === '/dashboard'}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors ${
                                                        isActive
                                                            ? 'bg-cyan-500 text-white'
                                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                    } ${disabled ? 'opacity-35 pointer-events-none' : ''}`
                                                }
                                            >
                                                <Icon className="w-5 h-5 shrink-0" />
                                                {label}
                                            </NavLink>
                                        ))}
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1 mt-4 mb-1">
                                            {t('header.nav.sectionMore', 'Więcej')}
                                        </p>
                                        {mobileDrawerNavItems.slice(4).map(({ id, to, label, icon: Icon, disabled = false }) => (
                                            <NavLink
                                                key={id}
                                                to={to}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors ${
                                                        isActive
                                                            ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300'
                                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                    } ${disabled ? 'opacity-35 pointer-events-none' : ''}`
                                                }
                                            >
                                                <Icon className="w-5 h-5 shrink-0" />
                                                {label}
                                            </NavLink>
                                        ))}
                                        <div className="my-4 border-t border-slate-200 dark:border-slate-800" />
                                        <TeamSwitcher user={user} onSwitchTeam={(id) => { setCurrentTeamId(id); setIsMobileMenuOpen(false); }} />
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
                                        <button
                                            onClick={() => { onSignUpClick(); setIsMobileMenuOpen(false); }}
                                            className="w-full flex items-center justify-center gap-3 py-4 text-base font-semibold text-white rounded-xl shadow-md hover:brightness-110"
                                            style={{ backgroundColor: 'var(--hero-accent)' }}
                                        >
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