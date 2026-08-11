import type { FormData } from '../../types';
import {
  Tone,
  Platform,
  ContentType,
  VisualStyle,
  GenerationType,
  AIModel,
  CopywritingFramework,
  GenerationMode,
  ContentLanguage,
} from '../../types';

import { loadAutoPublishPrefs } from '../../utils/autoPublishPrefs';

const savedAutoPublish = typeof window !== 'undefined' ? loadAutoPublishPrefs() : { autoPublishToConnected: false, autoOptimizePerPlatform: true };

export const DEFAULT_FORM_DATA: FormData = {
  topic: '',
  audience: '',
  keywords: '',
  tone: Tone.Casual,
  platform: Platform.Facebook,
  contentType: ContentType.Post,
  visualStyle: VisualStyle.PlatformSpecific,
  generationType: GenerationType.PostWithImage,
  model: AIModel.Flash,
  videoTranscript: '',
  campaignGoal: '',
  campaignDuration: 7,
  campaignPlatforms: [Platform.Facebook],
  useMascot: 'auto',
  includeLogo: true,
  copywritingFramework: CopywritingFramework.Auto,
  generationMode: GenerationMode.Single,
  contentLanguage: ContentLanguage.Polish,
  autoPublishToConnected: savedAutoPublish.autoPublishToConnected,
  autoOptimizePerPlatform: savedAutoPublish.autoOptimizePerPlatform,
};

/** Uzupełnia brakujące pola (stare szablony, historia, persisted state). */
export function normalizeFormData(data: Partial<FormData> | null | undefined): FormData {
  return {
    ...DEFAULT_FORM_DATA,
    ...data,
    contentLanguage: data?.contentLanguage ?? ContentLanguage.Polish,
    platform: data?.platform ?? Platform.Facebook,
    tone: data?.tone ?? Tone.Casual,
    generationType: data?.generationType ?? GenerationType.PostWithImage,
  };
}
