import type { FC } from 'react';
import { PhotoIcon } from '../icons/PhotoIcon';
import { TrendingUpIcon } from '../icons/TrendingUpIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { CollectionIcon } from '../icons/CollectionIcon';
import { GlobeIcon } from '../icons/GlobeIcon';
import { VideoCameraIcon } from '../icons/VideoCameraIcon';

export interface AiToolPanel {
  id: string;
  title: string;
  description: string;
  icon: FC<{ className?: string }>;
  iconGradient: string;
  onClick: () => void;
}

export interface AiToolPanelCategory {
  title: string;
  tools: AiToolPanel[];
}

export interface AiToolPanelOpeners {
  setIsReverseImageOpen: (open: boolean) => void;
  setIsTrendAnalysisOpen: (open: boolean) => void;
  setIsTechRadarOpen: (open: boolean) => void;
  setIsScheduleOptimizerOpen: (open: boolean) => void;
  setIsAIWorkflowOpen: (open: boolean) => void;
  setIsContentSafetyOpen: (open: boolean) => void;
  setIsRepurposingOpen: (open: boolean) => void;
  setIsCrossPlatformOpen: (open: boolean) => void;
  setIsSocialMediaOpen: (open: boolean) => void;
  setIsVideoGeneratorOpen: (open: boolean) => void;
  setIsOmniOpen: (open: boolean) => void;
}

type Translate = (key: string, fallback?: string, options?: Record<string, unknown>) => string;

export function createAiToolPanels(
  openers: AiToolPanelOpeners,
  t: Translate = (_key, fallback) => fallback ?? ''
): AiToolPanelCategory[] {
  return [
    {
      title: t('aiTools.categories.inspiration', 'Inspiracja i Trendy'),
      tools: [
        {
          id: 'reverse-image',
          title: t('aiTools.reverseImage.title', 'Analiza obrazu konkurencji'),
          description: t('aiTools.reverseImage.desc', 'Analizuj viralowe obrazy konkurencji'),
          icon: PhotoIcon,
          iconGradient: 'from-purple-500 to-pink-500',
          onClick: () => openers.setIsReverseImageOpen(true),
        },
        {
          id: 'tech-radar',
          title: t('aiTools.techRadar.title', 'Znajdź nowinki w niszy'),
          description: t('aiTools.techRadar.desc', 'Live newsy z Google Search → temat lub kalendarz'),
          icon: GlobeIcon,
          iconGradient: 'from-cyan-500 to-blue-600',
          onClick: () => openers.setIsTechRadarOpen(true),
        },
        {
          id: 'trends',
          title: t('aiTools.trends.title', 'Analiza trendów'),
          description: t('aiTools.trends.desc', 'Analizuj trendy w Twojej niszy'),
          icon: TrendingUpIcon,
          iconGradient: 'from-indigo-500 to-blue-500',
          onClick: () => openers.setIsTrendAnalysisOpen(true),
        },
      ],
    },
    {
      title: t('aiTools.categories.quality', 'Optymalizacja i Jakość'),
      tools: [
        {
          id: 'safety',
          title: t('aiTools.safety.title', 'Skaner bezpieczeństwa treści'),
          description: t('aiTools.safety.desc', 'Ochrona przed shadowbanem'),
          icon: CheckCircleIcon,
          iconGradient: 'from-emerald-500 to-teal-500',
          onClick: () => openers.setIsContentSafetyOpen(true),
        },
        {
          id: 'schedule',
          title: t('aiTools.schedule.title', 'Optymalizacja harmonogramu'),
          description: t('aiTools.schedule.desc', 'Znajdź najlepszy czas publikacji'),
          icon: ClockIcon,
          iconGradient: 'from-amber-500 to-orange-500',
          onClick: () => openers.setIsScheduleOptimizerOpen(true),
        },
        {
          id: 'workflow',
          title: t('aiTools.workflow.title', 'Automatyzacja AI Workflow'),
          description: t('aiTools.workflow.desc', 'Pipeline, odpowiedzi, predykcja'),
          icon: SparklesIcon,
          iconGradient: 'from-purple-500 to-pink-500',
          onClick: () => openers.setIsAIWorkflowOpen(true),
        },
      ],
    },
    {
      title: t('aiTools.categories.distribution', 'Dystrybucja i Wideo'),
      tools: [
        {
          id: 'repurpose',
          title: t('aiTools.repurpose.title', 'Przetwarzanie treści'),
          description: t('aiTools.repurpose.desc', 'Jedna treść → wiele platform'),
          icon: CollectionIcon,
          iconGradient: 'from-violet-500 to-purple-500',
          onClick: () => openers.setIsRepurposingOpen(true),
        },
        {
          id: 'cross-platform',
          title: t('aiTools.crossPlatform.title', 'Centrum wieloplatformowe'),
          description: t('aiTools.crossPlatform.desc', 'Inbox, adaptacja, analiza'),
          icon: GlobeIcon,
          iconGradient: 'from-indigo-500 to-blue-500',
          onClick: () => openers.setIsCrossPlatformOpen(true),
        },
        {
          id: 'publisher',
          title: t('aiTools.publisher.title', 'Publikacja w social media'),
          description: t('aiTools.publisher.desc', 'Publikuj bezpośrednio na kontach'),
          icon: GlobeIcon,
          iconGradient: 'from-blue-500 to-cyan-500',
          onClick: () => openers.setIsSocialMediaOpen(true),
        },
        {
          id: 'video',
          title: t('aiTools.video.title', 'Generator wideo AI'),
          description: t('aiTools.video.desc', 'Twórz krótkie wideo z posta'),
          icon: VideoCameraIcon,
          iconGradient: 'from-rose-500 to-orange-500',
          onClick: () => openers.setIsVideoGeneratorOpen(true),
        },
        {
          id: 'omni',
          title: t('aiTools.omni.title', 'Gemini Omni'),
          description: t('aiTools.omni.desc', 'Zaawansowany asystent multimodalny'),
          icon: SparklesIcon,
          iconGradient: 'from-fuchsia-500 to-indigo-500',
          onClick: () => openers.setIsOmniOpen(true),
        },
      ],
    },
  ];
}
