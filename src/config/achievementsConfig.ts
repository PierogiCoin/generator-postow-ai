import { Achievement, AchievementId } from '../types';
import { TrophyIcon } from '../components/icons/TrophyIcon';
import { SparklesIcon } from '../components/icons/SparklesIcon';
import { CampaignIcon } from '../components/icons/CampaignIcon';
import { RocketIcon } from '../components/icons/RocketIcon';
import { AwardIcon } from '../components/icons/AwardIcon';

export const achievementsConfig: Record<AchievementId, Achievement> = {
  [AchievementId.FirstPost]: {
    id: AchievementId.FirstPost,
    name: 'achievements.firstPost.name',
    description: 'achievements.firstPost.description',
    icon: SparklesIcon,
  },
  [AchievementId.CreativeStreak]: {
    id: AchievementId.CreativeStreak,
    name: 'achievements.creativeStreak.name',
    description: 'achievements.creativeStreak.description',
    icon: AwardIcon,
  },
  [AchievementId.CampaignMaster]: {
    id: AchievementId.CampaignMaster,
    name: 'achievements.campaignMaster.name',
    description: 'achievements.campaignMaster.description',
    icon: CampaignIcon,
  },
  [AchievementId.PowerUser]: {
    id: AchievementId.PowerUser,
    name: 'achievements.powerUser.name',
    description: 'achievements.powerUser.description',
    icon: TrophyIcon,
  },
  [AchievementId.Visionary]: {
    id: AchievementId.Visionary,
    name: 'achievements.visionary.name',
    description: 'achievements.visionary.description',
    icon: RocketIcon,
  },
};
