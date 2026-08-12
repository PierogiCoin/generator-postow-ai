'use client';

import React from 'react';
import { UserPlan } from '../types';
import { getDealTierConfig, type DealSource, type DealTier } from '@/config/dealTiers';
import { Infinity as InfinityIcon } from 'lucide-react';

interface DealPlanBadgeProps {
  plan: UserPlan;
  dealSource?: DealSource | null;
  dealTier?: DealTier | null;
  compact?: boolean;
}

export const DealPlanBadge: React.FC<DealPlanBadgeProps> = ({
  plan,
  dealSource,
  dealTier,
  compact = false,
}) => {
  if (plan !== UserPlan.Lifetime && !dealSource) return null;

  const tierConfig = getDealTierConfig(dealTier);
  const sourceLabel =
    dealSource === 'appsumo' ? 'AppSumo' : dealSource === 'own' ? 'Lifetime Deal' : 'Lifetime';
  const tierLabel = tierConfig ? ` · Tier ${tierConfig.tier}` : '';

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border border-[var(--hero-accent)]/30 bg-[var(--hero-accent-soft)] text-[var(--hero-accent)] ${
        compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      } font-semibold`}
      title={tierConfig?.descriptionPl}
    >
      <InfinityIcon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      <span>
        {sourceLabel}
        {tierLabel}
      </span>
    </div>
  );
};

export default DealPlanBadge;
