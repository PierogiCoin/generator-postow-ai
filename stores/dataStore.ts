import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
// FIX: Add missing NewCampaignPayload type import.
import { UsageStats, BrandVoiceProfile, FavoritePost, CustomTemplate, AIInsight, AudiencePersona, CampaignHistoryItem, ScheduledPost, GenerationResult, FormData, PostApprovalStatus, Comment, Draft, AchievementId, IntelligentCalendarPlanItem, StrategicAuditReport, AppError, NewCampaignPayload, Platform, GenerationType } from '../types'; 

// Services
import * as statsService from '../services/statsService';
import * as brandVoiceService from '../services/brandVoiceService';
import * as favoritesService from '../services/favoritesService';
import * as templateService from '../services/templateService';
import * as draftsService from '../services/draftsService';
import * as historyService from '../services/historyService';
import * as scheduledPostsService from '../services/scheduledPostsService';
import * as strategicAuditService from '../services/strategicAuditService';
import * as calendarPlanService from '../services/calendarPlanService';
import * as insightsService from '../services/insightsService';

type DataState = {
  stats: UsageStats | null;
  brandVoiceProfiles: BrandVoiceProfile[];
  activeBrandVoiceId: string | null;
  favorites: FavoritePost[];
  templates: CustomTemplate[];
  history: CampaignHistoryItem[];
  drafts: Draft[];
  scheduledPosts: ScheduledPost[];
  itemToSchedule: (Partial<ScheduledPost> & { formData: FormData; result: GenerationResult; }) | null;
  inspiration: CampaignHistoryItem | FavoritePost | Draft | null;
  isLearningStyle: boolean;
  learnedInsights: AIInsight[] | null;
  audiencePersona: AudiencePersona | null;
  unlockedAchievements: AchievementId[];
  intelligentCalendarPlan: IntelligentCalendarPlanItem[] | null;
  strategicAuditReport: StrategicAuditReport | null;
  isAuditing: boolean;
  auditError: AppError | null;

  // Actions
  setState: (newState: Partial<DataState>) => void; // For AuthContext to populate data

  // Stats
  clearStats: () => Promise<void>;
  addGenerationStat: (formData: FormData) => Promise<void>;

  // Brand Voice
  setActiveBrandVoiceId: (id: string | null) => void;
  saveBrandVoiceProfile: (profile: BrandVoiceProfile) => Promise<void>;
  deleteBrandVoiceProfile: (id: string) => Promise<void>;
  setIsLearningStyle: (isLearning: boolean) => void;

  // Favorites
  addFavorite: (favorite: FavoritePost) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  clearFavorites: () => Promise<void>;

  // Templates
  saveTemplate: (template: CustomTemplate) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  // History
  addGenerationToHistory: (item: NewCampaignPayload) => Promise<void>;
  clearHistory: () => Promise<void>;
  handleStatusChange: (itemId: string, status: PostApprovalStatus) => Promise<void>;
  onAddComment: (itemId: string, comment: Omit<Comment, 'id' | 'authorId' | 'authorName' | 'timestamp'>) => Promise<void>;
  setDueDate: (itemId: string, dueDate: number | null) => Promise<void>;

  // Drafts
  addDraft: (draft: Draft) => Promise<void>;
  removeDraft: (id: string) => Promise<void>;

  // Scheduled Posts
  addOrUpdateScheduledPost: (post: ScheduledPost) => Promise<void>;
  deleteScheduledPost: (id: string) => Promise<void>;
  clearScheduledPosts: () => Promise<void>;

  // Inspiration
  selectInspiration: (item: CampaignHistoryItem | FavoritePost | Draft | null) => void;

  // Item to Schedule
  setItemToSchedule: (item: (Partial<ScheduledPost> & { formData: FormData; result: GenerationResult; }) | null) => void;

  // Learned Insights
  setLearnedInsights: (insights: AIInsight[] | null) => void;

  // Achievements
  unlockAchievement: (achievementId: AchievementId) => void;

  // Intelligent Calendar
  setIntelligentCalendarPlan: (plan: IntelligentCalendarPlanItem[] | null) => void;
  updateIntelligentCalendarPlanItemDate: (itemId: string, newDate: string) => void;
  updateIntelligentCalendarPlanItem: (
    itemId: string,
    patch: Partial<Pick<IntelligentCalendarPlanItem, 'topic' | 'time' | 'platform' | 'strategy'>>
  ) => Promise<void>;
  removeIntelligentCalendarPlanItem: (itemId: string) => Promise<void>;
  clearIntelligentCalendarPlan: () => void;

  // AI Strategist
  startStrategicAudit: () => void;
  setStrategicAuditReport: (report: StrategicAuditReport) => void;
  clearStrategicAuditReport: () => void;
  setAuditError: (error: AppError) => void;
};

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
  stats: null,
  brandVoiceProfiles: [],
  activeBrandVoiceId: null,
  favorites: [],
  templates: [],
  history: [],
  drafts: [],
  scheduledPosts: [],
  itemToSchedule: null,
  inspiration: null,
  isLearningStyle: false,
  learnedInsights: null,
  audiencePersona: null,
  unlockedAchievements: [],
  intelligentCalendarPlan: null,
  strategicAuditReport: null,
  isAuditing: false,
  auditError: null,

  // ACTIONS
  setState: (newState) => set(newState),

  // Stats
  clearStats: async () => {
    await statsService.clearStats();
    set(state => ({ stats: { ...state.stats, byGenerationType: {}, totalGenerations: 0 } as UsageStats }));
  },
  addGenerationStat: async (formData) => {
    await statsService.recordGeneration(formData);
    // FIX: Implement local state update for stats to provide immediate UI feedback.
    set(state => {
      if (!state.stats) return {};

      const newStats = JSON.parse(JSON.stringify(state.stats));
      const newUsage = newStats.byGenerationType;

      switch (formData.generationType) {
        case GenerationType.PostWithImage:
          newUsage.text = (newUsage.text || 0) + 1;
          newUsage.image = (newUsage.image || 0) + 1;
          newStats.totalGenerations = (newStats.totalGenerations || 0) + 2;
          break;
        case GenerationType.Idea:
        case GenerationType.ABTest:
          newUsage.text = (newUsage.text || 0) + 1;
          newStats.totalGenerations = (newStats.totalGenerations || 0) + 1;
          break;
        case GenerationType.Video:
          newUsage.video = (newUsage.video || 0) + 1;
          newStats.totalGenerations = (newStats.totalGenerations || 0) + 1;
          break;
        case GenerationType.Campaign:
          newUsage.campaign = (newUsage.campaign || 0) + 1;
          newStats.totalGenerations = (newStats.totalGenerations || 0) + 1;
          break;
      }
      return { stats: newStats };
    });
  },

  // Brand Voice
  setActiveBrandVoiceId: (id) => set({ activeBrandVoiceId: id }),
  saveBrandVoiceProfile: async (profile) => {
    const savedProfile = await brandVoiceService.saveOrUpdateBrandVoiceProfile(profile);
    const profiles = get().brandVoiceProfiles;
    const existingIndex = profiles.findIndex(p => p.id === savedProfile.id);
    const updatedProfiles = existingIndex > -1
      ? profiles.map(p => p.id === savedProfile.id ? savedProfile : p)
      : [...profiles, savedProfile];
    set({ brandVoiceProfiles: updatedProfiles });
  },
  deleteBrandVoiceProfile: async (id) => {
    await brandVoiceService.deleteBrandVoiceProfile(id);
    const updatedProfiles = get().brandVoiceProfiles.filter(p => p.id !== id);
    if (get().activeBrandVoiceId === id) {
      set({ activeBrandVoiceId: updatedProfiles.length > 0 ? updatedProfiles[0].id : null });
    }
    set({ brandVoiceProfiles: updatedProfiles });
  },
  setIsLearningStyle: (isLearning) => set({ isLearningStyle: isLearning }),

  // Favorites
  addFavorite: async (favorite) => {
    const newFavorite = await favoritesService.addFavorite(favorite);
    set(state => ({ favorites: [newFavorite, ...state.favorites] }));
  },
  removeFavorite: async (id) => {
    await favoritesService.removeFavorite(id);
    set(state => ({ favorites: state.favorites.filter(f => f.id !== id) }));
  },
  clearFavorites: async () => {
    await favoritesService.clearFavorites();
    set({ favorites: [] });
  },

  // Templates
  saveTemplate: async (template) => {
    const savedTemplate = await templateService.saveTemplate(template);
    const templates = get().templates;
    const existingIndex = templates.findIndex(t => t.id === savedTemplate.id);
    const updatedTemplates = existingIndex > -1
      ? templates.map(t => t.id === savedTemplate.id ? savedTemplate : t)
      : [savedTemplate, ...templates];
    set({ templates: updatedTemplates });
  },
  deleteTemplate: async (id) => {
    await templateService.deleteTemplate(id);
    set(state => ({ templates: state.templates.filter(t => t.id !== id) }));
  },

  // History
  addGenerationToHistory: async (item) => {
    const newHistoryItem = await historyService.addHistoryItem(item);
    set(state => ({ history: [newHistoryItem, ...state.history] }));
  },
  clearHistory: async () => {
    await historyService.clearHistory();
    set({ history: [], inspiration: null });
  },
  handleStatusChange: async (itemId, status) => {
    await historyService.updateHistoryItem(itemId, { status });
    set(state => ({ history: state.history.map(item => item.id === itemId ? { ...item, status } : item) }));
  },
  onAddComment: async (itemId, comment) => {
    const newComment = await historyService.addComment(itemId, comment.text);
    if (newComment) {
      set(state => ({
        history: state.history.map(item => item.id === itemId ? { ...item, comments: [...item.comments, newComment] } : item)
      }));
    }
  },
  setDueDate: async (itemId, dueDate) => {
    await historyService.updateHistoryItem(itemId, { dueDate });
    set(state => ({ history: state.history.map(item => item.id === itemId ? { ...item, dueDate } : item) }));
  },

  // Drafts
  addDraft: async (draft) => {
    const newDraft = await draftsService.saveDraft(draft);
    set(state => ({ drafts: [newDraft, ...state.drafts] }));
  },
  removeDraft: async (id) => {
    await draftsService.deleteDraft(id);
    set(state => ({ drafts: state.drafts.filter(d => d.id !== id) }));
  },

  // Scheduled Posts
  addOrUpdateScheduledPost: async (post) => {
    const savedPost = await scheduledPostsService.saveScheduledPost(post);
    const posts = get().scheduledPosts;
    const existingIndex = posts.findIndex(p => p.id === savedPost.id);
    const newPosts = existingIndex > -1
      ? posts.map((p) => p.id === savedPost.id ? savedPost : p)
      : [...posts, savedPost];
    newPosts.sort((a, b) => a.scheduleTimestamp - b.scheduleTimestamp);
    set({ scheduledPosts: newPosts });
  },
  deleteScheduledPost: async (id) => {
    await scheduledPostsService.deleteScheduledPost(id);
    const newPosts = get().scheduledPosts.filter(p => p.id !== id);
    set({ scheduledPosts: newPosts });
  },
  clearScheduledPosts: async () => {
    await scheduledPostsService.clearScheduledPosts();
    set({ scheduledPosts: [] });
  },

  // Inspiration
  selectInspiration: (item) => set(state => ({ inspiration: state.inspiration?.id === item?.id ? null : item })),

  // Item to Schedule
  setItemToSchedule: (item) => set({ itemToSchedule: item }),

  // Learned Insights & Achievements
  setLearnedInsights: async (insights) => {
    if (insights) await insightsService.saveInsights(insights);
    else await insightsService.clearInsights();
    set({ learnedInsights: insights });
  },
  unlockAchievement: (achievementId) => {
    const achievements = get().unlockedAchievements;
    if (!achievements.includes(achievementId)) {
      const newAchievements = [...achievements, achievementId];
      set({ unlockedAchievements: newAchievements });
    }
  },

  // Intelligent Calendar
  setIntelligentCalendarPlan: async (plan) => {
    if (plan) await calendarPlanService.saveCalendarPlan(plan);
    set({ intelligentCalendarPlan: plan });
  },
  updateIntelligentCalendarPlanItemDate: async (itemId, newDate) => {
    const updated = (get().intelligentCalendarPlan || []).map(item =>
      item.id === itemId ? { ...item, date: newDate } : item
    );
    await calendarPlanService.saveCalendarPlan(updated);
    set({ intelligentCalendarPlan: updated });
  },
  updateIntelligentCalendarPlanItem: async (itemId, patch) => {
    const updated = (get().intelligentCalendarPlan || []).map((item) =>
      item.id === itemId ? { ...item, ...patch } : item
    );
    await calendarPlanService.saveCalendarPlan(updated);
    set({ intelligentCalendarPlan: updated });
  },
  removeIntelligentCalendarPlanItem: async (itemId) => {
    const updated = (get().intelligentCalendarPlan || []).filter((item) => item.id !== itemId);
    await calendarPlanService.saveCalendarPlan(updated);
    set({ intelligentCalendarPlan: updated.length > 0 ? updated : null });
  },
  clearIntelligentCalendarPlan: async () => {
    await calendarPlanService.clearCalendarPlans();
    set({ intelligentCalendarPlan: null });
  },

  // AI Strategist
  startStrategicAudit: () => set({ isAuditing: true, auditError: null, strategicAuditReport: null }),
  setStrategicAuditReport: async (report) => {
    if (report) await strategicAuditService.saveStrategicAudit(report);
    set({ strategicAuditReport: report, isAuditing: false, auditError: null });
  },
  clearStrategicAuditReport: () => set({ strategicAuditReport: null, auditError: null }),
  setAuditError: (error) => set({ isAuditing: false, auditError: error }),
}), {
  name: 'data-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({ 
    activeBrandVoiceId: state.activeBrandVoiceId,
    audiencePersona: state.audiencePersona,
    unlockedAchievements: state.unlockedAchievements,
  }),
})
);
