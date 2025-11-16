import React from 'react';
import type { UsageStats } from '../types';
import { GenerationType, UserPlan } from '../types';
import { USAGE_LIMITS } from '../constants';
import { UsageBar } from './UsageBar';
import { PostIcon } from './icons/PostIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { CampaignIcon } from './icons/CampaignIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface SubscriptionStatusProps {
  stats: UsageStats | null;
  userPlan: UserPlan;
  onUpgrade: () => void;
}

const planNames: Record<UserPlan, string> = {
    [UserPlan.Free]: 'Darmowy',
    [UserPlan.Creator]: 'Twórca',
    [UserPlan.Pro]: 'Pro',
    [UserPlan.Agency]: 'Agencja',
    [UserPlan.Business]: 'Biznes',
}

export const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({ stats, userPlan, onUpgrade }) => {
  const limits = USAGE_LIMITS[userPlan];
  const usage = stats?.byGenerationType || {};

  // FIX: Use correct keys ('text', 'image', etc.) from the byGenerationType object.
  const textUsage = usage.text || 0;
  const imageUsage = usage.image || 0;
  const videoUsage = usage.video || 0;
  const campaignUsage = usage.campaign || 0;
  
  const isFreePlan = userPlan === UserPlan.Free;

  return (
    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Status subskrypcji</h2>
        <span className="px-3 py-1 text-xs font-bold text-white bg-gradient-to-r from-purple-500 to-blue-500 rounded-full shadow-md">
            Plan: {planNames[userPlan]}
        </span>
      </div>

      {isFreePlan && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          Twój darmowy plan obejmuje miesięczne limity. Ulepsz plan, aby uzyskać więcej generacji i odblokować zaawansowane funkcje.
        </p>
      )}
      
      <div className="space-y-4">
        <UsageBar 
            icon={<PostIcon className="w-4 h-4 text-slate-500" />}
            label="Tekst / Pomysły"
            value={textUsage}
            limit={limits.text}
        />
        <UsageBar 
            icon={<PhotoIcon className="w-4 h-4 text-slate-500" />}
            label="Obrazy"
            value={imageUsage}
            limit={limits.image}
        />
        <UsageBar 
            icon={<VideoCameraIcon className="w-4 h-4 text-slate-500" />}
            label="Wideo"
            value={videoUsage}
            limit={limits.video}
        />
         <UsageBar 
            icon={<CampaignIcon className="w-4 h-4 text-slate-500" />}
            label="Kampanie AI"
            value={campaignUsage}
            limit={limits.campaign}
        />
      </div>

      {userPlan !== UserPlan.Business && (
          <button 
            onClick={onUpgrade}
            className="w-full mt-6 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition-all shadow-md focus:outline-none focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800"
          >
            <SparklesIcon className="w-5 h-5"/>
            {isFreePlan ? 'Ulepsz plan' : 'Zmień plan'}
          </button>
      )}
    </div>
  );
};