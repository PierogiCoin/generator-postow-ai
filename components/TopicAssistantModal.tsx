import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getTopicSuggestions } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ModernButton } from './ui/ModernButton';
import { ModernInput } from './ui/ModernInput';

interface TopicAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTopic: string;
  onApplySuggestion: (suggestion: string) => void;
}

export const TopicAssistantModal: React.FC<TopicAssistantModalProps> = ({
  isOpen,
  onClose,
  currentTopic,
  onApplySuggestion,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [userPrompt, setUserPrompt] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!userPrompt.trim()) return;
    setIsLoading(true);
    setError(null);
    setSuggestions([]);
    try {
      if (!user) throw new Error('Musisz być zalogowany, aby używać asystenta tematów.');
      const result = await getTopicSuggestions(currentTopic, userPrompt, user.id);
      setSuggestions(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to get suggestions.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (suggestion: string) => {
    onApplySuggestion(suggestion);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 transition-opacity"
      onClick={onClose}
    >
      <div
        className="bg-white/80 dark:bg-slate-900/80 border border-white/20 dark:border-slate-700/50 rounded-3xl shadow-2xl p-6 md:p-10 w-full max-w-2xl m-4 transform transition-all glass animate-scale-in overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Decorative Blobs */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <SparklesIcon className="w-8 h-8 text-blue-500 animate-pulse" />
            </div>
            <span className="gradient-text">{t('topicAssistant.title')}</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md text-sm md:text-base">
            {t('topicAssistant.subtitle')}
          </p>

          <div className="space-y-8">
            <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 ml-1">
                {t('topicAssistant.currentTopic')}
              </label>
              <div
                className="p-5 bg-white/50 dark:bg-slate-950/50 rounded-2xl text-slate-700 dark:text-slate-300 min-h-[4rem] border border-slate-200/50 dark:border-slate-800 shadow-inner italic leading-relaxed text-sm"
              >
                {currentTopic?.replace(/<[^>]*>?/gm, '') || '...'}
              </div>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="flex flex-col sm:flex-row gap-4">
                <ModernInput
                  type="text"
                  value={userPrompt}
                  onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setUserPrompt(e.target.value)}
                  placeholder={t('topicAssistant.requestPlaceholder')}
                  className="flex-grow"
                  fullWidth
                />
                <ModernButton
                  onClick={handleGenerate}
                  disabled={isLoading || !userPrompt.trim()}
                  loading={isLoading}
                  icon={<SparklesIcon className="w-5 h-5" />}
                  className="sm:w-auto w-full whitespace-nowrap px-8"
                  variant="gradient"
                  size="lg"
                >
                  {isLoading ? t('topicAssistant.generating') : t('topicAssistant.generate')}
                </ModernButton>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-medium">
                {error}
              </div>
            )}

            {(isLoading || suggestions.length > 0) && (
              <div className="pt-8 border-t border-slate-200/50 dark:border-slate-700/30 animate-fade-in">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 ml-1">
                  {t('topicAssistant.suggestions')}
                </h3>

                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-14 bg-slate-100 dark:bg-slate-800/50 rounded-2xl shimmer border border-slate-200/50 dark:border-slate-700/30" />
                    ))}
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {suggestions.map((s, i) => (
                      <div
                        key={`suggestion-${i}`}
                        className="group flex items-center gap-4 p-4 bg-white/40 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 hover:border-blue-500/30 dark:hover:border-blue-400/30 transition-all duration-300 animate-fade-in-up shadow-sm hover:shadow-md cursor-pointer"
                        style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'both' }}
                        onClick={() => handleApply(s)}
                      >
                        <div className="w-8 h-8 flex-shrink-0 bg-blue-500/10 rounded-full flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                          <CheckIcon className="w-4 h-4 text-blue-500 group-hover:text-white" />
                        </div>
                        <p className="flex-grow text-sm font-medium text-slate-700 dark:text-slate-300 leading-snug">{s}</p>
                        <div className="text-xs font-bold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          {t('topicAssistant.use')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !isLoading && <p className="text-sm text-slate-500 italic px-2">{t('topicAssistant.noSuggestions')}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end mt-10 border-t border-slate-200/50 dark:border-slate-700/30 pt-6">
            <ModernButton
              onClick={onClose}
              variant="ghost"
              size="md"
            >
              {t('common.close')}
            </ModernButton>
          </div>
        </div>
      </div>
    </div>
  );
};