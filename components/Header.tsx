import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from './icons/SparklesIcon';
import { BrandMarkIcon } from './icons/BrandMarkIcon';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { TeamSwitcher } from './TeamSwitcher';
import { useAuth } from '../contexts/AuthContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserPlan } from '../types';
import { MenuIcon } from './icons/MenuIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { UserIcon } from './icons/UserIcon';
import { APP_NAV_ITEMS, CREATE_NAV_ITEMS, planMeets, type AppNavItem, type CreateNavItem } from '../config/navConfig';

interface HeaderProps {
    isCalendarEnabled: boolean;
    onUpgradeClick: () => void;
    onLoginClick: () => void;
    onSignUpClick: () => void;
    notificationSystem: React.ReactNode;
}

type ResolvedNavItem = AppNavItem & {
    disabled: boolean;
    title: string;
};

const NavItem: React.FC<{ to: string; children: React.ReactNode; title?: string; disabled?: boolean }> = React.memo(({
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
            `flex items-center gap-2 px-3 lg:px-3.5 py-2 text-xs font-semibold uppercase tracking-wide rounded-lg transition-all duration-200 ${
                isActive
                    ? 'bg-[var(--hero-accent)] text-white border border-transparent shadow-sm shadow-[var(--hero-accent)]/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 border border-transparent'
            } ${disabled ? 'opacity-35 cursor-not-allowed pointer-events-none' : ''}`
        }
    >
        {children}
    </NavLink>
));

const BottomNavItem: React.FC<{
    to: string;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
}> = React.memo(({ to, icon: Icon, label }) => (
    <NavLink
        to={to}
        end={to === '/dashboard'}
        className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 w-full h-full min-h-[44px] transition-colors duration-200 ${
                isActive
                    ? 'text-[var(--hero-accent)]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`
        }
    >
        <Icon className="w-5 h-5" />
        <span className="text-[10px] font-bold tracking-tight">{label}</span>
    </NavLink>
));

const BottomNavBar: React.FC<{
    items: ResolvedNavItem[];
    onOpenCreateMenu: () => void;
    onOpenMoreMenu: () => void;
    isCreateMenuOpen?: boolean;
    isMoreMenuOpen?: boolean;
}> = React.memo(({
    items,
    onOpenCreateMenu,
    onOpenMoreMenu,
    isCreateMenuOpen = false,
    isMoreMenuOpen = false,
}) => {
    const { t } = useTranslation();
    const dashboard = items.find((i) => i.id === 'dashboard');
    const calendar = items.find((i) => i.id === 'calendar');
    const generator = items.find((i) => i.id === 'generator');

    return (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none">
            <nav
                className="pointer-events-auto grid grid-cols-5 items-end gap-1 w-full max-w-lg mx-auto rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-[#071018]/95 backdrop-blur-md px-1 py-1.5 shadow-lg shadow-slate-900/5"
                aria-label={t('header.nav.ariaLabel')}
            >
                {dashboard && <BottomNavItem to={dashboard.to} icon={dashboard.icon} label={t(dashboard.labelKey)} />}
                {calendar && <BottomNavItem to={calendar.to} icon={calendar.icon} label={t(calendar.labelKey)} />}
                <div className="flex items-center justify-center -mt-5">
                    <button
                        type="button"
                        onClick={onOpenCreateMenu}
                        aria-haspopup="dialog"
                        aria-expanded={isCreateMenuOpen}
                        className="w-14 h-14 rounded-xl text-white flex items-center justify-center active:scale-95 transition-transform border-4 border-white dark:border-[#071018] hover:brightness-110 shadow-lg shadow-[var(--hero-accent)]/30"
                        style={{ backgroundColor: 'var(--hero-accent)' }}
                        aria-label={t('header.nav.create')}
                    >
                        <SparklesIcon className="w-7 h-7" />
                    </button>
                </div>
                {generator && <BottomNavItem to={generator.to} icon={generator.icon} label={t(generator.labelKey)} />}
                <button
                    type="button"
                    onClick={onOpenMoreMenu}
                    aria-haspopup="dialog"
                    aria-expanded={isMoreMenuOpen}
                    className="flex flex-col items-center justify-center gap-0.5 w-full h-full min-h-[44px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-200"
                >
                    <MenuIcon className="w-5 h-5" />
                    <span className="text-[10px] font-bold tracking-tight">{t('header.nav.more')}</span>
                </button>
            </nav>
        </div>
    );
});

const MobileCreateMenu: React.FC<{ createNavItems: CreateNavItem[], onClose: () => void }> = React.memo(({ createNavItems, onClose }) => {
    const { t } = useTranslation();
    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg z-[60] sm:hidden animate-fade-in" onClick={onClose}>
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-[92%] max-w-sm bg-gradient-to-br from-slate-900/95 to-slate-800/95 rounded-[3rem] border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] p-6 animate-slide-in backdrop-blur-2xl">
                <div className="grid grid-cols-2 gap-3">
                    {createNavItems.map(({ id, to, labelKey, icon: Icon, state }, i) => (
                        <NavLink
                            key={id}
                            to={to}
                            state={state}
                            onClick={onClose}
                            className="group flex flex-col items-center justify-center gap-3 p-4 bg-gradient-to-br from-white/[0.08] to-white/[0.02] rounded-2xl border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 hover:scale-105 active:scale-95 animate-fade-in-up relative overflow-hidden"
                            style={{ animationDelay: `${i * 0.08}s`, animationFillMode: 'both' }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                            <div className="relative z-10 w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-500/25 rotate-6 hover:rotate-0 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-purple-500/40">
                                <Icon className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" />
                            </div>
                            <span className="relative z-10 font-bold text-xs text-center uppercase tracking-tight text-slate-200 group-hover:text-white transition-colors duration-300">{t(labelKey)}</span>
                        </NavLink>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full mt-6 py-3 text-sm font-bold text-slate-400 hover:text-white bg-gradient-to-r from-white/5 to-transparent rounded-xl transition-all duration-300 hover:bg-white/10 border border-white/5 hover:border-white/10"
                >
                    {t('common.close')}
                </button>
            </div>
        </div>
    );
});

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
    const [isMobileCreateMenuOpen, setIsMobileCreateMenuOpen] = useState(false);
    const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    const userPlan = user?.plan || UserPlan.Free;

    const resolvedItems = useMemo<ResolvedNavItem[]>(() => {
        return APP_NAV_ITEMS.map((item) => {
            const planLocked = item.minPlan ? !planMeets(userPlan, item.minPlan) : false;
            const gatedLocked = item.gated ? !isCalendarEnabled : false;
            const disabled = planLocked || gatedLocked;
            const titleKey = disabled ? item.disabledTooltipKey : item.enabledTooltipKey;
            return { ...item, disabled, title: titleKey ? t(titleKey) : t(item.labelKey) };
        });
    }, [isCalendarEnabled, userPlan, t]);

    const primaryItems = useMemo(() => resolvedItems.filter((i) => i.section === 'main'), [resolvedItems]);
    const moreItems = useMemo(() => resolvedItems.filter((i) => i.section !== 'main'), [resolvedItems]);
    const moreSections = useMemo(() => [
        { key: 'strategy', labelKey: 'header.nav.sectionStrategy', items: moreItems.filter((i) => i.section === 'strategy') },
        { key: 'tools', labelKey: 'header.nav.sectionTools', items: moreItems.filter((i) => i.section === 'tools') },
    ], [moreItems]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setIsMoreMenuOpen(false);
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
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

    const landingNavItems = useMemo<Array<{ id: string; label: string; href: string }>>(() => [
        { id: 'how-it-works', href: '#how-it-works', label: t('home.nav.howItWorks') },
        { id: 'features', href: '#features', label: t('home.nav.features') },
        { id: 'pricing', href: '#pricing', label: t('home.nav.pricing') },
        { id: 'faq', href: '#faq', label: t('home.nav.faq') },
    ], [t]);

    const landingNavLinkClass =
        'px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 transition-colors';

    return (
        <>
            <header className="sticky top-0 z-[50] border-b border-slate-200/70 dark:border-white/10 bg-[var(--hero-surface)]/90 dark:bg-[#060b18]/90 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 lg:gap-5 shrink-0">
                        <NavLink to={user ? "/dashboard" : "/"} className="flex items-center gap-2 group shrink-0" aria-label={t('header.homeAriaLabel')}>
                            <div
                                className="rounded-lg p-2 group-hover:brightness-110 transition-all duration-300 shrink-0"
                                style={{ backgroundColor: 'var(--hero-navy)' }}
                            >
                                <BrandMarkIcon className="w-5 h-5 text-[var(--hero-accent)]" />
                            </div>
                            <h1 className="hidden md:block font-display text-base lg:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight group-hover:opacity-90 transition-opacity duration-300 whitespace-nowrap">
                                {t('header.title')}
                            </h1>
                        </NavLink>
                        {user && <div className="shrink-0 hidden sm:block"><TeamSwitcher user={user} onSwitchTeam={setCurrentTeamId} /></div>}
                        {!user && isLandingPage && (
                            <nav className="hidden md:flex items-center gap-1 ml-2" aria-label={t('home.nav.ariaLabel')}>
                                {landingNavItems.map((item) => (
                                    <a key={item.id} href={item.href} className={landingNavLinkClass}>
                                        {item.label}
                                    </a>
                                ))}
                            </nav>
                        )}
                    </div>

                    {user && (
                        <nav
                            className="hidden sm:flex items-center gap-1 p-1 rounded-lg border border-slate-200/80 dark:border-white/10 bg-white/60 dark:bg-white/[0.03]"
                            aria-label={t('header.nav.ariaLabel')}
                        >
                            {primaryItems.map(({ id, to, labelKey, icon: Icon, disabled, title }) => (
                                <NavItem key={id} to={to} title={title} disabled={disabled}>
                                    <Icon className="w-4 h-4 shrink-0 opacity-90" />
                                    <span className="hidden lg:inline">{t(labelKey)}</span>
                                </NavItem>
                            ))}

                            <div className="relative" ref={moreMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsMoreMenuOpen((v) => !v)}
                                    aria-expanded={isMoreMenuOpen}
                                    aria-haspopup="menu"
                                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wide rounded-lg transition-colors border ${
                                        isMoreMenuOpen || moreItems.some((i) => location.pathname.startsWith(i.to))
                                            ? 'bg-[var(--hero-accent-soft)] text-[var(--hero-accent)] border-[var(--hero-accent)]/35'
                                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-white/5 border-transparent'
                                    }`}
                                >
                                        <span className="hidden lg:inline">{t('header.nav.more')}</span>
                                    <MenuIcon className="w-4 h-4 lg:hidden" />
                                    <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isMoreMenuOpen && (
                                    <div
                                        role="menu"
                                        className="absolute top-full right-0 mt-3 w-[560px] rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#071018]/95 backdrop-blur-2xl shadow-2xl z-50 p-5 animate-scale-in"
                                    >
                                        <div className="grid grid-cols-2 gap-4">
                                            {moreSections.map(({ key, labelKey, items }) => (
                                                <div key={key} className="space-y-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block px-2">
                                                        {t(labelKey)}
                                                    </span>
                                                    {items.map(({ id, to, labelKey, icon: Icon, disabled, title }) => (
                                                        <NavLink
                                                            key={id}
                                                            to={to}
                                                            role="menuitem"
                                                            title={disabled ? title : undefined}
                                                            onClick={() => setIsMoreMenuOpen(false)}
                                                            className={({ isActive }) =>
                                                                `flex items-start gap-3 p-2.5 rounded-xl transition-all ${
                                                                    isActive
                                                                        ? 'bg-[var(--hero-accent-soft)] text-[var(--hero-accent)] font-bold'
                                                                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                                                                } ${disabled ? 'opacity-35 pointer-events-none' : ''}`
                                                            }
                                                        >
                                                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 text-[var(--hero-accent)] shrink-0">
                                                                <Icon className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold leading-none">{t(labelKey)}</div>
                                                                <div className="text-[11px] text-slate-400 mt-1 font-normal">{t(`header.nav.desc${id.charAt(0).toUpperCase() + id.slice(1)}`)}</div>
                                                            </div>
                                                        </NavLink>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-0.5" aria-hidden />

                            <NavLink
                                to="/generator"
                                className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors text-white hover:brightness-110 shadow-sm shrink-0 whitespace-nowrap"
                                style={{ backgroundColor: 'var(--hero-accent)' }}
                            >
                                <SparklesIcon className="w-4 h-4 shrink-0" />
                                <span>{t('header.nav.create')}</span>
                            </NavLink>
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
                                        className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--hero-accent)]/30 bg-[var(--hero-accent-soft)] text-[var(--hero-accent)] hover:brightness-110 transition-colors"
                                        title={t('header.creditsTooltip')}
                                    >
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        {user.credits.toLocaleString('pl-PL')}
                                    </button>
                                )}
                                <UserMenu user={user} onLogout={logout} />
                            </>
                        ) : (
                            <>
                                <div className="hidden sm:flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={onLoginClick}
                                        className="px-5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-white/15 hover:bg-slate-100/80 dark:hover:bg-white/5 transition-all duration-200"
                                    >
                                        {t('header.login')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onSignUpClick}
                                        className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white rounded-lg hover:brightness-110 transition-all duration-200"
                                        style={{ backgroundColor: 'var(--hero-accent)' }}
                                    >
                                        {t('header.signup')}
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={onSignUpClick}
                                    className="sm:hidden flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white rounded-lg active:scale-95 transition-all duration-200 hover:brightness-110"
                                    style={{ backgroundColor: 'var(--hero-accent)' }}
                                >
                                    {t('header.signup')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsMobileMenuOpen(true)}
                                    className="sm:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200/80 dark:border-white/10 transition-colors duration-200"
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
                    <div className={`absolute top-0 right-0 h-full w-4/5 max-w-sm bg-white dark:bg-[#0a1220] p-8 transition-transform duration-500 ease-out border-l border-slate-200 dark:border-white/10 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                        <div>
                            <div className="flex justify-between items-center mb-10">
                                <h2 id="mobile-menu-heading" className="font-display text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                    {t('header.nav.menu')}
                                </h2>
                                <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 dark:bg-white/5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>
                            <nav className="flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                                {user ? (
                                    <>
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 px-1 mb-1">
                                            {t('header.nav.sectionMain')}
                                        </p>
                                        {primaryItems.map(({ id, to, labelKey, icon: Icon, disabled }) => (
                                            <NavLink
                                                key={id}
                                                to={to}
                                                end={to === '/dashboard'}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${
                                                        isActive
                                                            ? 'bg-[var(--hero-accent)] text-white'
                                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                                                    } ${disabled ? 'opacity-35 pointer-events-none' : ''}`
                                                }
                                            >
                                                <Icon className="w-5 h-5 shrink-0" />
                                                {t(labelKey)}
                                            </NavLink>
                                        ))}
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 px-1 mt-4 mb-1">
                                            {t('header.nav.sectionMore')}
                                        </p>
                                        {moreItems.map(({ id, to, labelKey, icon: Icon, disabled }) => (
                                            <NavLink
                                                key={id}
                                                to={to}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${
                                                        isActive
                                                            ? 'bg-[var(--hero-accent-soft)] text-[var(--hero-accent)]'
                                                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                                                    } ${disabled ? 'opacity-35 pointer-events-none' : ''}`
                                                }
                                            >
                                                <Icon className="w-5 h-5 shrink-0" />
                                                {t(labelKey)}
                                            </NavLink>
                                        ))}
                                        <div className="my-4 border-t border-slate-200 dark:border-slate-800" />
                                        <NavLink
                                            to="/account"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={({ isActive }) =>
                                                `flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${
                                                    isActive
                                                        ? 'bg-[var(--hero-accent-soft)] text-[var(--hero-accent)]'
                                                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                                                }`
                                            }
                                        >
                                            <UserIcon className="w-5 h-5 shrink-0" />
                                            {t('userMenu.myAccount')}
                                        </NavLink>
                                        <div className="my-4 border-t border-slate-200 dark:border-slate-800" />
                                        <TeamSwitcher user={user} onSwitchTeam={(id) => { setCurrentTeamId(id); setIsMobileMenuOpen(false); }} />
                                    </>
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        <button type="button" onClick={() => { onLoginClick(); setIsMobileMenuOpen(false); }} className="w-full py-4 text-base font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-2xl transition-colors duration-200 hover:bg-slate-200 dark:hover:bg-slate-700">
                                            {t('header.login')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { onSignUpClick(); setIsMobileMenuOpen(false); }}
                                            className="w-full flex items-center justify-center gap-3 py-4 text-base font-semibold text-white rounded-xl shadow-md hover:brightness-110 transition-all duration-200"
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
            {isMobileCreateMenuOpen && <MobileCreateMenu createNavItems={CREATE_NAV_ITEMS} onClose={() => setIsMobileCreateMenuOpen(false)} />}

            {/* Bottom Navigation Bar */}
            {user && <BottomNavBar items={resolvedItems} onOpenCreateMenu={() => setIsMobileCreateMenuOpen(true)} onOpenMoreMenu={() => setIsMobileMenuOpen(true)} />}
        </>
    );
};

export default Header;
