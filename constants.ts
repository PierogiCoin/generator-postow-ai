import { Platform, Tone, ContentType, VisualStyle, GenerationType, AIModel, UserPlan } from './types';

export const PLATFORMS = Object.values(Platform);
export const TONES = Object.values(Tone);
export const CONTENT_TYPES = Object.values(ContentType);
export const VISUAL_STYLES = Object.values(VisualStyle);
export const GENERATION_TYPES = Object.values(GenerationType);
export const AI_MODELS = Object.values(AIModel);

export const USAGE_LIMITS = {
  [UserPlan.Free]: {
    text: 10,
    image: 3,
    video: 0, // Wideo usunięte z planu darmowego
    campaign: 1,
  },
  [UserPlan.Creator]: {
    text: 100,
    image: 20,
    video: 2, // Wideo dodane do planu Creator
    campaign: 5,
  },
  [UserPlan.Pro]: {
    text: 500,
    image: 100,
    video: 10, // Znacznie zwiększony limit wideo
    campaign: 20,
  },
  [UserPlan.Agency]: {
    text: 2000,
    image: 300,
    video: 30, // Duży skok dla agencji
    campaign: Infinity, // Bez limitu kampanii
  },
  [UserPlan.Business]: {
    text: Infinity,
    image: Infinity,
    video: Infinity,
    campaign: Infinity,
  }
};
