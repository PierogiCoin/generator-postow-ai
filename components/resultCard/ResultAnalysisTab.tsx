import React from 'react';
import { useTranslation } from 'react-i18next';
import type {
  FormData,
  PerformancePrediction,
  SEOAnalysisResult,
  SentimentAnalysisResult,
} from '../../types';
import { ModernButton } from '../ui/ModernButton';
import { PerformancePredictionDisplay } from './PerformancePredictionDisplay';
import { SentimentDisplay } from '../SentimentDisplay';
import { SEOAnalysisDisplay } from '../SEOAnalysisDisplay';
import { TrendingUpIcon } from '../icons/TrendingUpIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { HashIcon } from '../icons/HashIcon';

interface ResultAnalysisTabProps {
  formData: FormData | null | undefined;
  performancePrediction: PerformancePrediction | null;
  isPredictingPerformance: boolean;
  sentimentAnalysis: SentimentAnalysisResult | null;
  isAnalyzingSentiment: boolean;
  seoAnalysis: SEOAnalysisResult | null;
  isAnalyzingSEO: boolean;
  onPredict: () => void;
  onAnalyzeSEO: () => void;
  onOpenHashtagGenerator: () => void;
}

export const ResultAnalysisTab: React.FC<ResultAnalysisTabProps> = ({
  formData,
  performancePrediction,
  isPredictingPerformance,
  sentimentAnalysis,
  isAnalyzingSentiment,
  seoAnalysis,
  isAnalyzingSEO,
  onPredict,
  onAnalyzeSEO,
  onOpenHashtagGenerator,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 animate-fade-in">
      {(performancePrediction || isPredictingPerformance) && (
        <PerformancePredictionDisplay
          result={performancePrediction}
          isLoading={isPredictingPerformance}
        />
      )}
      {(sentimentAnalysis || isAnalyzingSentiment) && (
        <SentimentDisplay result={sentimentAnalysis} isLoading={isAnalyzingSentiment} />
      )}
      {(seoAnalysis || isAnalyzingSEO) && (
        <SEOAnalysisDisplay result={seoAnalysis} isLoading={isAnalyzingSEO} />
      )}

      {!performancePrediction && !isPredictingPerformance && (
        <ModernButton
          onClick={onPredict}
          variant="secondary"
          fullWidth
          loading={isPredictingPerformance}
          icon={<TrendingUpIcon className="w-4 h-4" />}
        >
          {t('resultCard.analysis.predict', 'Prognozuj zaangażowanie')}
        </ModernButton>
      )}

      {!seoAnalysis && !isAnalyzingSEO && (
        <ModernButton
          onClick={onAnalyzeSEO}
          variant="secondary"
          fullWidth
          loading={isAnalyzingSEO}
          icon={<SearchIcon className="w-4 h-4" />}
        >
          {t('resultCard.analysis.seo', 'Analiza SEO')}
        </ModernButton>
      )}

      {formData && (
        <button
          type="button"
          onClick={onOpenHashtagGenerator}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20 border-2 border-blue-300 dark:border-blue-700 rounded-xl transition-all group"
        >
          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg group-hover:scale-110 transition-transform">
            <HashIcon className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <span className="text-sm font-bold text-blue-700 dark:text-blue-300 block">
              {t('resultCard.analysis.hashtags', 'Smart Hashtag Generator')}
            </span>
            <span className="text-xs text-blue-600/70 dark:text-blue-400/70">
              {t(
                'resultCard.analysis.hashtagsHint',
                'Reach, Engagement, Niche, Viral, Branded'
              )}
            </span>
          </div>
        </button>
      )}
    </div>
  );
};
