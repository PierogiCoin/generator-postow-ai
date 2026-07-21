/**
 * Storage utilities for managing Zustand persist state
 */

export const STORAGE_KEYS = {
  GENERATION: 'generation-storage',
  DATA: 'data-storage',
  HISTORY: 'generationHistory',
  NOTIFICATIONS: 'appNotifications',
  ONBOARDING: 'so_onboarding_done',
  // streakService.ts
  STREAK: 'so_activity_streak',
  // postMortemService.ts
  POST_MORTEMS: 'so_post_mortems',
  // competitorService.ts
  COMPETITORS: 'so_tracked_competitors',
  // trendAnalysisService.ts
  TREND_CACHE: 'trend_analysis_cache',
  TREND_ALERTS: 'trend_alerts',
  // hashtagService.ts
  HASHTAG_CACHE: 'hashtag_analysis_cache',
  HASHTAG_HISTORY: 'hashtag_history',
  // contentSafetyService.ts
  SAFETY_CACHE: 'content_safety_reports',
  // crossPlatformService.ts
  CROSS_PLATFORM_CACHE: 'cross_platform_analysis',
  // contentRepurposingService.ts
  REPURPOSE_CACHE: 'content_repurpose_plans',
  // scheduleOptimizationService.ts
  SCHEDULE_CACHE: 'schedule_optimization_cache',
  // engagementPrediction.ts
  ENGAGEMENT_PREDICTIONS: 'engagement_prediction_history',
  // videoGenerationService.ts
  VIDEO_CACHE: 'video_generation_jobs',
  // autoContentPipeline.ts
  PIPELINE_CACHE: 'auto_content_pipeline',
  // socialMediaApiService.ts
  SOCIAL_ACCOUNTS: 'social_media_accounts',
  OPTIMAL_POST_TIME: 'optimal_post_time',
  USER_NICHE: 'userNiche',
  USER_PLATFORM: 'userPlatform',
  USER_TONE: 'userTone',
  // analyticsService.ts — prefix + userId
  ANALYTICS_ANALYSIS: 'so_analytics_analysis_',
} as const;

/**
 * Clear all persisted Zustand stores
 * Call this on logout to reset application state
 */
export const clearAllPersistedStores = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  // Prefixed per-user caches
  const prefixes = [STORAGE_KEYS.ANALYTICS_ANALYSIS];
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && prefixes.some((p) => key.startsWith(p))) {
      localStorage.removeItem(key);
    }
  }
};

/**
 * Clear specific store by key
 */
export const clearPersistedStore = (key: keyof typeof STORAGE_KEYS): void => {
  localStorage.removeItem(STORAGE_KEYS[key]);
};

/**
 * Get storage size info for debugging
 */
export const getStorageInfo = (): { key: string; size: string }[] => {
  return Object.values(STORAGE_KEYS).map(key => {
    const item = localStorage.getItem(key);
    const size = item ? new Blob([item]).size : 0;
    return {
      key,
      size: `${(size / 1024).toFixed(2)} KB`
    };
  });
};

/**
 * Check if storage is available
 */
export const isStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};
