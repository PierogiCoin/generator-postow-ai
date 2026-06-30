import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CampaignHistoryItem } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { BeakerIcon } from './icons/BeakerIcon';

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToAnalyze: CampaignHistoryItem | null;
  onAnalyze: (prompt: string, item: CampaignHistoryItem) => Promise<void>;
  result: string | null;
  isLoading: boolean;
  error: string | null;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({
  isOpen,
  onClose,
  itemToAnalyze,
  onAnalyze,
  result,
  isLoading,
  error,
}) => {
  const [prompt, setPrompt] = useState('');
  const { t } = useTranslation();

  if (!isOpen || !itemToAnalyze) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onAnalyze(prompt, itemToAnalyze);
    }
  };
  
  const hasImage = !!itemToAnalyze.result.imageUrl;
  const placeholderText = hasImage 
    ? t('analysisModal.promptPlaceholderImage') 
    : t('analysisModal.promptPlaceholderText');

  return (
    <div
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      style={{ animationDuration: '0.3s' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl m-4 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
            <BeakerIcon className="w-6 h-6 text-blue-500" />
            {t('analysisModal.title')}
          </h2>
          <button onClick={onClose} aria-label="Close modal" className="p-2 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 text-2xl leading-none">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">{t('analysisModal.contentLabel')}</h3>
                    <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
                        {hasImage ? (
                            <img src={itemToAnalyze.result.imageUrl!} alt="Analizowany obraz" className="w-full h-auto rounded-md" />
                        ) : (
                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{itemToAnalyze.result.postText}</p>
                        )}
                    </div>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="analysis-prompt" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('analysisModal.promptLabel')}</label>
                        <textarea
                            id="analysis-prompt"
                            rows={4}
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            placeholder={placeholderText}
                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 transition text-sm"
                        />
                     </div>
                     <button
                        type="submit"
                        disabled={isLoading || !prompt.trim()}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2.5 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                     >
                        <SparklesIcon className="w-5 h-5"/>
                        {isLoading ? t('analysisModal.analyzing') : t('analysisModal.submit')}
                     </button>
                </form>
            </div>
            
            {(isLoading || result || error) && (
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">{t('analysisModal.resultTitle')}</h3>
                    {isLoading && (
                        <div className="space-y-2 animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        </div>
                    )}
                    {error && <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>}
                    {result && (
                        <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap p-4 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                            {result}
                        </div>
                    )}
                </div>
            )}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end flex-shrink-0">
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

// Default export for lazy loading
export default AnalysisModal;