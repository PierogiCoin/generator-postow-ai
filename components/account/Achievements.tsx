import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDataStore } from '../../stores/dataStore';
import { achievementsConfig } from '../../config/achievementsConfig';
import { AchievementId } from '../../types';
import { TrophyIcon } from '../icons/TrophyIcon';
import { CheckBadgeIcon } from '../icons/CheckBadgeIcon';

export const Achievements: React.FC = () => {
  const { t } = useTranslation();
  const { unlockedAchievements } = useDataStore();
  const allAchievementIds = Object.values(AchievementId);

  return (
    <div className="p-6 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
        <TrophyIcon className="w-6 h-6 text-yellow-500" />
        {t('achievements.title')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allAchievementIds.map(id => {
          const achievement = achievementsConfig[id];
          const isUnlocked = unlockedAchievements.includes(id);
          const Icon = achievement.icon;

          return (
            <div
              key={id}
              className={`p-4 rounded-lg border-2 transition-all ${isUnlocked ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/30' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${isUnlocked ? 'bg-yellow-100 dark:bg-yellow-900/50' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  <Icon className={`w-7 h-7 ${isUnlocked ? 'text-yellow-500' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h4 className={`font-bold ${isUnlocked ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{t(achievement.name)}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t(achievement.description)}</p>
                </div>
              </div>
              {isUnlocked && (
                  <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-green-600 dark:text-green-400">
                    <CheckBadgeIcon className="w-4 h-4" />
                    <span>{t('achievements.unlocked')}</span>
                  </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
