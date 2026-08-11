import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Zap, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Hash,
  TrendingUp,
  Target,
  MessageSquare,
  Loader2
} from 'lucide-react';
import { Platform, Tone } from '../types';

export interface PlatformOptimization {
  platform: Platform;
  text: string;
  hashtags: string[];
  characterCount: number;
  characterLimit: number;
  tips: string[];
  engagement: {
    score: number;
    prediction: string;
  };
}

interface MultiPlatformOptimizerProps {
  originalText: string;
  originalPlatform: Platform;
  tone: Tone;
  onOptimize: (platforms: Platform[]) => Promise<PlatformOptimization[]>;
  isOptimizing: boolean;
  optimizations: PlatformOptimization[] | null;
}

const platformConfig = {
  [Platform.X]: {
    name: 'X (Twitter)',
    icon: '𝕏',
    color: 'bg-black dark:bg-slate-800',
    limit: 280,
    tips: ['Użyj emoji', 'Max 2-3 hashtagi', 'Wątki dla długich treści']
  },
  [Platform.LinkedIn]: {
    name: 'LinkedIn',
    icon: '💼',
    color: 'bg-blue-600',
    limit: 3000,
    tips: ['Profesjonalny ton', 'Storytelling', 'Użyj nagłówków']
  },
  [Platform.Instagram]: {
    name: 'Instagram',
    icon: '📸',
    color: 'bg-gradient-to-br from-purple-500 to-pink-500',
    limit: 2200,
    tips: ['Więcej emoji', 'Call to action', 'Hashtagi na końcu']
  },
  [Platform.Facebook]: {
    name: 'Facebook',
    icon: '👥',
    color: 'bg-blue-500',
    limit: 63206,
    tips: ['Zadaj pytanie', 'Storytelling', 'CTA w pierwszej linii']
  },
  [Platform.TikTok]: {
    name: 'TikTok',
    icon: '🎵',
    color: 'bg-black dark:bg-slate-900',
    limit: 2200,
    tips: ['Trend hashtagi', 'Krótko i zwięźle', 'Emoji i slang']
  },
  [Platform.YouTube]: {
    name: 'YouTube',
    icon: '▶️',
    color: 'bg-red-600',
    limit: 5000,
    tips: ['Timestamps', 'Keywords', 'CTA w opisie']
  }
};

export const MultiPlatformOptimizer: React.FC<MultiPlatformOptimizerProps> = ({
  originalText,
  originalPlatform,
  tone,
  onOptimize,
  isOptimizing,
  optimizations
}) => {
  const { t } = useTranslation();
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [expandedPlatform, setExpandedPlatform] = useState<Platform | null>(null);
  const [copiedPlatform, setCopiedPlatform] = useState<Platform | null>(null);

  const availablePlatforms = Object.values(Platform).filter(p => p !== originalPlatform);

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleOptimize = async () => {
    if (selectedPlatforms.length === 0) return;
    try {
      await onOptimize(selectedPlatforms);
    } catch {
      // Błąd obsługiwany w onOptimize (toast)
    }
  };

  const handleSelectAll = () => {
    if (selectedPlatforms.length === availablePlatforms.length) {
      setSelectedPlatforms([]);
    } else {
      setSelectedPlatforms([...availablePlatforms]);
    }
  };

  const handleCopy = async (platform: Platform, text: string, hashtags: string[]) => {
    const fullText = `${text}\n\n${hashtags.join(' ')}`;
    await navigator.clipboard.writeText(fullText);
    setCopiedPlatform(platform);
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  const getEngagementColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-orange-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('multiPlatform.title', 'Multi-Platform Optimizer')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('multiPlatform.subtitle', 'Dostosuj swój post do każdej platformy')}
            </p>
          </div>
        </div>
      </div>

      {/* Platform Selection */}
      {!optimizations && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('multiPlatform.selectPlatforms', 'Wybierz platformy:')}
            </p>
            <button
              onClick={handleSelectAll}
              className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium"
            >
              {selectedPlatforms.length === availablePlatforms.length
                ? t('multiPlatform.deselectAll', 'Odznacz wszystkie')
                : t('multiPlatform.selectAll', 'Zaznacz wszystkie')}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availablePlatforms.map((platform) => {
              const config = platformConfig[platform];
              const isSelected = selectedPlatforms.includes(platform);
              
              return (
                <button
                  key={platform}
                  onClick={() => togglePlatform(platform)}
                  className={`p-4 rounded-xl border-2 transition text-left ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{config.icon}</span>
                    {isSelected && (
                      <div className="ml-auto w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {config.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {t('multiPlatform.charLimit', 'Max')}: {config.limit}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleOptimize}
            disabled={selectedPlatforms.length === 0 || isOptimizing}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('multiPlatform.optimizing', 'Optymalizowanie...')}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>{t('multiPlatform.optimize', `Optymalizuj dla ${selectedPlatforms.length} platform`)}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Optimizations Results */}
      {optimizations && optimizations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('multiPlatform.optimized', 'Zoptymalizowano dla')} <strong>{optimizations.length}</strong> {t('multiPlatform.platforms', 'platform')}
            </p>
            <button
              onClick={() => { onOptimize([]); }}
              className="text-sm text-blue-500 hover:text-blue-600 font-medium"
            >
              {t('multiPlatform.optimizeAgain', 'Zoptymalizuj ponownie')}
            </button>
          </div>

          {optimizations.map((opt) => {
            const config = platformConfig[opt.platform];
            const isExpanded = expandedPlatform === opt.platform;
            const isCopied = copiedPlatform === opt.platform;
            const charPercentage = (opt.characterCount / opt.characterLimit) * 100;

            return (
              <div
                key={opt.platform}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${config.color} rounded-lg flex items-center justify-center text-xl`}>
                      {config.icon}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {config.name}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span>{opt.characterCount}/{opt.characterLimit}</span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className={`w-3 h-3 ${getEngagementColor(opt.engagement.score)}`} />
                          <span className={getEngagementColor(opt.engagement.score)}>
                            {opt.engagement.score}%
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(opt.platform, opt.text, opt.hashtags)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                      title={t('common.copy', 'Kopiuj')}
                    >
                      {isCopied ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Copy className="w-5 h-5 text-slate-500" />
                      )}
                    </button>
                    <button
                      onClick={() => setExpandedPlatform(isExpanded ? null : opt.platform)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="px-4 pb-2">
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        charPercentage > 90 ? 'bg-red-500' : charPercentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(charPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
                    {/* Text */}
                    <div>
                      <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-2">
                        <MessageSquare className="w-3 h-3" />
                        {t('multiPlatform.optimizedText', 'Zoptymalizowany tekst')}
                      </label>
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg">
                        {opt.text}
                      </p>
                    </div>

                    {/* Hashtags */}
                    {opt.hashtags.length > 0 && (
                      <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-2">
                          <Hash className="w-3 h-3" />
                          {t('multiPlatform.hashtags', 'Hashtagi')}
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {opt.hashtags.map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs rounded-full font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tips */}
                    {opt.tips.length > 0 && (
                      <div>
                        <label className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-2">
                          <Target className="w-3 h-3" />
                          {t('multiPlatform.tips', 'Wskazówki')}
                        </label>
                        <ul className="space-y-1">
                          {opt.tips.map((tip, idx) => (
                            <li key={idx} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Engagement Prediction */}
                    <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className={`w-4 h-4 ${getEngagementColor(opt.engagement.score)}`} />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {t('multiPlatform.engagementPrediction', 'Prognoza zaangażowania')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {opt.engagement.prediction}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
