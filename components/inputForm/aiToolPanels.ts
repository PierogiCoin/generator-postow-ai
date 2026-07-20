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

export function createAiToolPanels(openers: AiToolPanelOpeners): AiToolPanelCategory[] {
  return [
    {
      title: 'Inspiracja i Trendy',
      tools: [
        {
          id: 'reverse-image',
          title: 'Reverse Image Prompting',
          description: 'Analizuj viralowe obrazy konkurencji',
          icon: PhotoIcon,
          iconGradient: 'from-purple-500 to-pink-500',
          onClick: () => openers.setIsReverseImageOpen(true),
        },
        {
          id: 'tech-radar',
          title: 'Znajdź nowinki w niszy',
          description: 'Live newsy z Google Search → temat lub kalendarz',
          icon: GlobeIcon,
          iconGradient: 'from-cyan-500 to-blue-600',
          onClick: () => openers.setIsTechRadarOpen(true),
        },
        {
          id: 'trends',
          title: 'Trend Analysis',
          description: 'Analizuj trendy w Twojej niszy',
          icon: TrendingUpIcon,
          iconGradient: 'from-indigo-500 to-blue-500',
          onClick: () => openers.setIsTrendAnalysisOpen(true),
        },
      ],
    },
    {
      title: 'Optymalizacja i Jakość',
      tools: [
        {
          id: 'safety',
          title: 'Content Safety Scanner',
          description: 'Ochrona przed shadowbanem',
          icon: CheckCircleIcon,
          iconGradient: 'from-emerald-500 to-teal-500',
          onClick: () => openers.setIsContentSafetyOpen(true),
        },
        {
          id: 'schedule',
          title: 'Auto-Schedule Optimization',
          description: 'Znajdź najlepszy czas publikacji',
          icon: ClockIcon,
          iconGradient: 'from-amber-500 to-orange-500',
          onClick: () => openers.setIsScheduleOptimizerOpen(true),
        },
        {
          id: 'workflow',
          title: 'AI Workflow Automation',
          description: 'Pipeline, odpowiedzi, predykcja',
          icon: SparklesIcon,
          iconGradient: 'from-purple-500 to-pink-500',
          onClick: () => openers.setIsAIWorkflowOpen(true),
        },
      ],
    },
    {
      title: 'Dystrybucja i Wideo',
      tools: [
        {
          id: 'repurpose',
          title: 'Content Repurposing',
          description: 'Jedna treść → wiele platform',
          icon: CollectionIcon,
          iconGradient: 'from-violet-500 to-purple-500',
          onClick: () => openers.setIsRepurposingOpen(true),
        },
        {
          id: 'cross-platform',
          title: 'Cross-Platform Center',
          description: 'Inbox, adaptacja, analiza',
          icon: GlobeIcon,
          iconGradient: 'from-indigo-500 to-blue-500',
          onClick: () => openers.setIsCrossPlatformOpen(true),
        },
        {
          id: 'publisher',
          title: 'Social Media Publisher',
          description: 'Publikuj na FB, IG, TikTok, LinkedIn',
          icon: GlobeIcon,
          iconGradient: 'from-blue-500 to-cyan-500',
          onClick: () => openers.setIsSocialMediaOpen(true),
        },
        {
          id: 'video',
          title: 'AI Video Generator',
          description: 'Twórz filmy z AI',
          icon: VideoCameraIcon,
          iconGradient: 'from-purple-500 to-pink-500',
          onClick: () => openers.setIsVideoGeneratorOpen(true),
        },
        {
          id: 'omni',
          title: 'Gemini 2.0 (Omni)',
          description: 'Tekst, obraz, wideo, audio, kod',
          icon: SparklesIcon,
          iconGradient: 'from-indigo-500 to-violet-500',
          onClick: () => openers.setIsOmniOpen(true),
        },
      ],
    },
  ];
}
