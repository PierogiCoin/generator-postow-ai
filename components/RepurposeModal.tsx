import React, { useState } from 'react';
import type { AppError, RepurposedContent, RepurposedContentItem, Platform, GenerationResult } from '../types';
import { platformConfig } from '../config/platformConfig';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckIcon } from './icons/CheckIcon';
import { PhotoIcon } from './icons/PhotoIcon';

interface RepurposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRepurposing: boolean;
  repurposedContent: RepurposedContent | null;
  error: AppError | null;
  onUse: (content: RepurposedContentItem | string) => void;
  originalPost: GenerationResult | null;
}


const CopyButton: React.FC<{ textToCopy: string }> = ({ textToCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <button
            onClick={handleCopy}
            className="p-2 bg-gray-200 dark:bg-gray-700/50 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Kopiuj do schowka"
            title="Kopiuj do schowka"
        >
            {copied ? (
                <CheckIcon className="w-4 h-4 text-green-500" />
            ) : (
                <ClipboardIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
            )}
        </button>
    );
};

const ContentDisplay: React.FC<{
    platformContent: string | RepurposedContentItem[];
    onUse: (content: string | RepurposedContentItem) => void;
}> = ({ platformContent, onUse }) => {
    if (typeof platformContent === 'string') {
        const parts = platformContent.split(/\s*---\s*/);
        return (
            <div className="space-y-4">
                {parts.map((part, index) => (
                    <div key={`part-${index}`} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg relative group border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{part}</p>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                             <button onClick={() => onUse(part)} title="Użyj tej treści" className="p-2 bg-gray-200 dark:bg-gray-700/50 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600">
                                <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </button>
                            <CopyButton textToCopy={part} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {platformContent.map((item, index) => (
                <div key={`item-${item.title}-${index}`} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg relative group border border-gray-200 dark:border-gray-700">
                    <h5 className="font-semibold text-gray-900 dark:text-white">{item.title}</h5>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{item.text}</p>
                    {item.visualIdea && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <h6 className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                                <PhotoIcon className="w-4 h-4" />
                                Pomysł na wizualizację
                            </h6>
                            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 italic">"{item.visualIdea}"</p>
                        </div>
                    )}
                     <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button onClick={() => onUse(item)} title="Użyj tej treści" className="p-2 bg-gray-200 dark:bg-gray-700/50 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600">
                            <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </button>
                        <CopyButton textToCopy={`${item.title}\n\n${item.text}${item.visualIdea ? `\n\n[Wizualizacja: ${item.visualIdea}]` : ''}`} />
                    </div>
                </div>
            ))}
        </div>
    );
};

export const RepurposeModal: React.FC<RepurposeModalProps> = ({ isOpen, onClose, isRepurposing, repurposedContent, error, onUse }) => {
  const platforms = repurposedContent ? (Object.keys(repurposedContent) as Platform[]) : [];
  const [activeTab, setActiveTab] = useState<Platform | null>(null);

  React.useEffect(() => {
    if (repurposedContent && (!activeTab || !platforms.includes(activeTab))) {
      const availablePlatforms = Object.keys(repurposedContent) as Platform[];
      if (availablePlatforms.length > 0) {
        setActiveTab(availablePlatforms[0]);
      }
    } else if (!repurposedContent) {
        setActiveTab(null);
    }
  }, [repurposedContent, activeTab, platforms]);

  if (!isOpen) return null;

  const renderModalContent = () => {
    if (isRepurposing) {
      return (
        <div className="flex flex-col items-center justify-center h-80 text-gray-500 dark:text-gray-400">
          <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="font-semibold text-lg">Przetwarzanie treści...</p>
          <p className="text-sm mt-1">AI dostosowuje Twój post do różnych platform.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6 text-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg">
            <h4 className="font-semibold">Wystąpił błąd</h4>
            <p className="text-sm mt-1">{error.message}</p>
        </div>
      );
    }

    if (!repurposedContent || platforms.length === 0) {
      return <div className="p-6 text-center text-gray-500 dark:text-gray-400">Brak treści do wyświetlenia.</div>;
    }
    
    return (
        <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/4 flex md:flex-col gap-2 overflow-x-auto pb-2 -mx-2 px-2 md:pb-0 md:mx-0 md:px-0 md:overflow-x-visible">
                {platforms.map(platform => {
                    const config = platformConfig[platform];
                    if (!config) return null;
                    const Icon = config.icon;
                    return (
                        <button key={platform} onClick={() => setActiveTab(platform)} className={`flex-shrink-0 w-full flex items-center gap-3 p-3 text-sm font-semibold rounded-lg text-left transition-colors ${activeTab === platform ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-600 dark:text-gray-300'}`}>
                            <Icon className="w-5 h-5" />
                            {config.name}
                        </button>
                    );
                })}
            </div>
            <div className="md:w-3/4">
                {activeTab && repurposedContent[activeTab] && <ContentDisplay platformContent={repurposedContent[activeTab]!} onUse={onUse} />}
            </div>
        </div>
    );
  };


  return (
    <div 
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fade-in"
      style={{ animationDuration: '0.3s' }}
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl w-full max-w-4xl m-4 transform transition-all flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <SparklesIcon className="w-6 h-6 text-blue-500"/> Przetworzona treść
          </h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {renderModalContent()}
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end flex-shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};

export default RepurposeModal;