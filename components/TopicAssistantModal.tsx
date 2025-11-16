import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getTopicSuggestions } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckIcon } from './icons/CheckIcon';

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
    } catch (e: any) {
      setError(e.message || 'Failed to get suggestions.');
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
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fade-in"
      style={{ animationDuration: '0.3s' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl m-4 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <SparklesIcon className="w-6 h-6 text-blue-500" />
          {t('topicAssistant.title')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6">
          {t('topicAssistant.subtitle')}
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('topicAssistant.currentTopic')}
            </label>
            <div className="mt-1 p-3 bg-gray-100 dark:bg-gray-900/50 rounded-md text-sm text-gray-700 dark:text-gray-300 min-h-[4rem]" dangerouslySetInnerHTML={{ __html: currentTopic || '...' }} />
          </div>

          <div>
            <label htmlFor="assistant-prompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('topicAssistant.yourRequest')}
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="assistant-prompt"
                type="text"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder={t('topicAssistant.requestPlaceholder')}
                className="flex-grow w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleGenerate}
                disabled={isLoading || !userPrompt.trim()}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? t('topicAssistant.generating') : t('topicAssistant.generate')}
              </button>
            </div>
          </div>
          
          {error && <p className="text-red-500 text-sm">{error}</p>}
          
          {(isLoading || suggestions.length > 0) && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-2">{t('topicAssistant.suggestions')}</h3>
                {isLoading ? (
                    <div className="space-y-2 animate-pulse">
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                    </div>
                ) : suggestions.length > 0 ? (
                    <div className="space-y-3">
                        {suggestions.map((s, i) => (
                            <div key={i} className="group flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <p className="flex-grow text-sm text-gray-700 dark:text-gray-300">{s}</p>
                                <button onClick={() => handleApply(s)} className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-green-700 bg-green-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-300">
                                    <CheckIcon className="w-3 h-3"/>
                                    {t('topicAssistant.use')}
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    !isLoading && <p className="text-sm text-gray-500">{t('topicAssistant.noSuggestions')}</p>
                )}
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};