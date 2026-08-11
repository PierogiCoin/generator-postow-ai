import type { ComponentType } from 'react';
import { UserPlan, GenerationType } from '../types';
import { LayoutGridIcon } from '../components/icons/LayoutGridIcon';
import { PostIcon } from '../components/icons/PostIcon';
import { CalendarIcon } from '../components/icons/CalendarIcon';
import { ChartPieIcon } from '../components/icons/ChartPieIcon';
import { BrainCircuitIcon } from '../components/icons/BrainCircuitIcon';
import { UsersIcon } from '../components/icons/UsersIcon';
import { TrendingUpIcon } from '../components/icons/TrendingUpIcon';
import { BeakerIcon } from '../components/icons/BeakerIcon';
import { FilmIcon } from '../components/icons/FilmIcon';
import { CampaignIcon } from '../components/icons/CampaignIcon';

export type NavIcon = ComponentType<{ className?: string }>;

export interface AppNavItem {
  id: string;
  to: string;
  labelKey: string;
  icon: NavIcon;
  section: 'main' | 'strategy' | 'tools';
  /** Minimal plan required to unlock the item. */
  minPlan?: UserPlan;
  /** If true, the item is additionally gated by an external runtime flag (e.g. calendar enabled). */
  gated?: boolean;
  /** i18n key for the tooltip when the item is enabled. */
  enabledTooltipKey?: string;
  /** i18n key for the tooltip when the item is disabled. */
  disabledTooltipKey?: string;
}

export interface CreateNavItem {
  id: string;
  to: string;
  labelKey: string;
  icon: NavIcon;
  state?: { prefillData?: Record<string, unknown> };
}

export const PLAN_RANK: Record<UserPlan, number> = {
  [UserPlan.Free]: 0,
  [UserPlan.Creator]: 1,
  [UserPlan.Pro]: 2,
  [UserPlan.Business]: 3,
  [UserPlan.Agency]: 4,
  [UserPlan.Enterprise]: 5,
};

export function planMeets(userPlan: UserPlan, requiredPlan: UserPlan): boolean {
  return PLAN_RANK[userPlan] >= PLAN_RANK[requiredPlan];
}

/**
 * Jedno źródło prawdy nawigacji aplikacji.
 * Kolejność decyduje o układzie: sekcja `main` = główny pasek nav,
 * pozostałe wyświetlane w dropdownie „Więcej" (pogrupowane po `section`).
 */
export const APP_NAV_ITEMS: AppNavItem[] = [
  { id: 'dashboard', to: '/dashboard', labelKey: 'header.nav.dashboard', icon: LayoutGridIcon, section: 'main' },
  { id: 'generator', to: '/generator', labelKey: 'header.nav.generator', icon: PostIcon, section: 'main' },
  {
    id: 'calendar',
    to: '/calendar',
    labelKey: 'header.nav.calendar',
    icon: CalendarIcon,
    section: 'main',
    gated: true,
    enabledTooltipKey: 'header.calendarTooltip',
    disabledTooltipKey: 'header.calendarDisabledTooltip',
  },
  {
    id: 'analytics',
    to: '/analytics',
    labelKey: 'header.nav.analytics',
    icon: ChartPieIcon,
    section: 'main',
    minPlan: UserPlan.Pro,
    enabledTooltipKey: 'header.analyticsTooltip',
    disabledTooltipKey: 'header.analyticsDisabledTooltip',
  },
  {
    id: 'strategist',
    to: '/strategist',
    labelKey: 'header.nav.strategist',
    icon: BrainCircuitIcon,
    section: 'strategy',
    minPlan: UserPlan.Pro,
    enabledTooltipKey: 'header.strategistTooltip',
    disabledTooltipKey: 'header.strategistDisabledTooltip',
  },
  { id: 'competitors', to: '/competitors', labelKey: 'header.nav.competitors', icon: UsersIcon, section: 'strategy' },
  { id: 'trends', to: '/trends', labelKey: 'header.nav.trends', icon: TrendingUpIcon, section: 'tools' },
  { id: 'analyzer', to: '/analyzer', labelKey: 'header.nav.analyzer', icon: BeakerIcon, section: 'tools' },
  { id: 'storyboard', to: '/storyboard', labelKey: 'header.nav.storyboard', icon: FilmIcon, section: 'tools' },
];

export const CREATE_NAV_ITEMS: CreateNavItem[] = [
  { id: 'new-post', to: '/generator', labelKey: 'header.nav.newPost', icon: PostIcon },
  {
    id: 'new-campaign',
    to: '/generator',
    labelKey: 'header.nav.newCampaign',
    icon: CampaignIcon,
    state: { prefillData: { generationType: GenerationType.Campaign } },
  },
  { id: 'new-storyboard', to: '/storyboard', labelKey: 'header.nav.newStoryboard', icon: FilmIcon },
];
