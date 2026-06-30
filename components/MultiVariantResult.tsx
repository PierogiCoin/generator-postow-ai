import React, { useState } from 'react';
import { MultiVariantPost, NotificationType } from '../types';
import { useNotifications } from '../hooks/useNotifications';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { SparklesIcon } from './icons/SparklesIcon';

interface MultiVariantResultProps {
  variants: MultiVariantPost[];
  onSelectVariant: (variant: MultiVariantPost) => void;
  selectedVariantId?: string;
}

const hookTypeLabels: Record<string, { label: string; emoji: string; color: string }> = {
  emotional: { label: 'Emocjonalny', emoji: '🔥', color: 'from-red-500 to-orange-500' },
  educational: { label: 'Edukacyjny', emoji: '💡', color: 'from-yellow-500 to-amber-500' },
  storytelling: { label: 'Storytelling', emoji: '📖', color: 'from-blue-500 to-indigo-500' },
  controversial: { label: 'Kontrowersyjny', emoji: '⚡', color: 'from-purple-500 to-pink-500' },
  curiosity: { label: 'Ciekawość', emoji: '🔮', color: 'from-teal-500 to-cyan-500' },
};

const engagementLabels: Record<string, { label: string; color: string }> = {
  high: { label: 'Wysokie', color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30' },
  medium: { label: 'Średnie', color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30' },
  low: { label: 'Niskie', color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/30' },
};

export const MultiVariantResult: React.FC<MultiVariantResultProps> = ({
  variants,
  onSelectVariant,
  selectedVariantId,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { addToast } = useNotifications();

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Błąd kopiowania do schowka';
      addToast(errorMessage, NotificationType.Error);
    }
  };

  if (!variants || variants.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        Brak wariantów do wyświetlenia
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl">
          <SparklesIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Wybierz najlepszy wariant
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Każdy wariant używa innej strategii hooka
          </p>
        </div>
      </div>

      {/* Variants Grid */}
      <div className="grid gap-4">
        {variants.map((variant, index) => {
          const hookInfo = hookTypeLabels[variant.hookType] || { label: variant.hookType, emoji: '✨', color: 'from-slate-500 to-slate-600' };
          const engagement = engagementLabels[variant.predictedEngagement] || engagementLabels.medium;
          const isSelected = selectedVariantId === variant.variant;
          const isExpanded = expandedId === variant.variant;

          return (
            <div
              key={variant.variant}
              className={`relative border-2 rounded-2xl overflow-hidden transition-all duration-300 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {/* Variant Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${hookInfo.color} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                  {variant.variant}
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800">
                  <span>{hookInfo.emoji}</span>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {hookInfo.label}
                  </span>
                </div>
              </div>

              {/* Engagement Badge */}
              <div className="absolute top-4 right-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${engagement.color}`}>
                  Zaangażowanie: {engagement.label}
                </span>
              </div>

              {/* Content */}
              <div className="pt-16 pb-4 px-4">
                <div className={`text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed ${
                  isExpanded ? '' : 'line-clamp-4'
                }`}>
                  {variant.postText}
                </div>

                {/* Hashtags */}
                {variant.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {variant.hashtags.map((tag, i) => (
                      <span
                        key={`tag-${tag}`}
                        className="text-xs text-blue-600 dark:text-blue-400 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Why It Works */}
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    <span className="font-semibold">Dlaczego działa:</span> {variant.whyItWorks}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => onSelectVariant(variant)}
                    aria-label={isSelected ? "Variant selected" : "Select this variant"}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                      isSelected
                        ? 'bg-green-500 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircleIcon className="w-4 h-4" />
                        Wybrano
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="w-4 h-4" />
                        Wybierz ten wariant
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleCopy(variant.postText, variant.variant)}
                    aria-label={copiedId === variant.variant ? "Copied to clipboard" : "Copy to clipboard"}
                    className="px-4 py-2.5 rounded-xl font-semibold text-sm border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                  >
                    {copiedId === variant.variant ? 'Skopiowano!' : 'Kopiuj'}
                  </button>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : variant.variant)}
                    aria-label={isExpanded ? "Collapse content" : "Expand content"}
                    className="px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all"
                  >
                    {isExpanded ? 'Zwiń' : 'Rozwiń'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Typy hooków:
        </h4>
        <div className="flex flex-wrap gap-2">
          {Object.entries(hookTypeLabels).map(([key, info]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <span>{info.emoji}</span>
              <span className="text-slate-600 dark:text-slate-400">{info.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MultiVariantResult;
