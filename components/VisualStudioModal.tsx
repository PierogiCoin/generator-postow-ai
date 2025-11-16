import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { User } from '../types';
import { editImageWithPrompt } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { RotateCcwIcon } from './icons/RotateCcwIcon';
import { RotateCwIcon } from './icons/RotateCwIcon';
import { FlipHorizontalIcon } from './icons/FlipHorizontalIcon';
import { FlipVerticalIcon } from './icons/FlipVerticalIcon';

interface VisualStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (newImageUrl: string) => void;
  originalImageUrl: string;
  user: User;
}

interface ImageEdits {
  brightness: number;
  contrast: number;
  sepia: number;
  grayscale: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
}

const defaultEdits: ImageEdits = {
  brightness: 100,
  contrast: 100,
  sepia: 0,
  grayscale: 0,
  rotate: 0,
  scaleX: 1,
  scaleY: 1,
};

const dataUrlToBlob = async (dataUrl: string) => {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return { blob, base64: dataUrl.split(',')[1] };
}

export const VisualStudioModal: React.FC<VisualStudioModalProps> = ({
  isOpen, onClose, onApply, originalImageUrl, user
}) => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [edits, setEdits] = useState<ImageEdits>(defaultEdits);

  useEffect(() => {
    if (isOpen) {
      setHistory([originalImageUrl]);
      setHistoryIndex(0);
      setEdits(defaultEdits);
      setPrompt('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen, originalImageUrl]);

  const currentImageUrl = history[historyIndex];

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
  try {
  const { blob, base64 } = await dataUrlToBlob(currentImageUrl);
  if (!user) throw new Error('Musisz być zalogowany, aby używać edytora obrazów.');
  const newImageUrl = await editImageWithPrompt(base64, blob.type, prompt, user.id);

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newImageUrl);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setPrompt('');
    } catch (e: any) {
      setError(e.message || 'Nie udało się edytować obrazu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = useCallback(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        setError(t('visualStudio.errorInit'));
        return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = currentImageUrl;

    img.onload = () => {
        const { naturalWidth, naturalHeight } = img;
        const rotated = edits.rotate % 180 !== 0;
        canvas.width = rotated ? naturalHeight : naturalWidth;
        canvas.height = rotated ? naturalWidth : naturalHeight;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((edits.rotate * Math.PI) / 180);
        ctx.scale(edits.scaleX, edits.scaleY);
        
        ctx.filter = `brightness(${edits.brightness}%) contrast(${edits.contrast}%) sepia(${edits.sepia}%) grayscale(${edits.grayscale}%)`;
        
        ctx.drawImage(img, -naturalWidth / 2, -naturalHeight / 2, naturalWidth, naturalHeight);

        const dataUrl = canvas.toDataURL('image/png');
        onApply(dataUrl);
    };
    img.onerror = () => {
        setError(t('visualStudio.errorLoad'));
    }
  }, [currentImageUrl, edits, onApply, t]);
  
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = () => canUndo && setHistoryIndex(i => i - 1);
  const redo = () => canRedo && setHistoryIndex(i => i + 1);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEdits(prev => ({...prev, [name]: parseInt(value, 10)}));
  };

  const handleResetEdits = () => setEdits(defaultEdits);

  const imageStyle = {
    filter: `brightness(${edits.brightness}%) contrast(${edits.contrast}%) sepia(${edits.sepia}%) grayscale(${edits.grayscale}%)`,
    transform: `rotate(${edits.rotate}deg) scaleX(${edits.scaleX}) scaleY(${edits.scaleY})`,
    transition: 'transform 0.2s ease-out, filter 0.2s ease-out',
  };

  if (!isOpen) return null;

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
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{t('visualStudio.title')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('visualStudio.subtitle')}</p>
        </div>
        <div className="flex-grow p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto">
            {/* Left Column - Image & History */}
            <div className="flex flex-col gap-4">
                <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-900/50 rounded-lg overflow-hidden flex-grow flex items-center justify-center">
                    <img src={currentImageUrl} alt="Podgląd edycji" className="max-w-full max-h-full object-contain" style={imageStyle} />
                    {isLoading && (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                             <svg className="animate-spin h-8 w-8 text-white mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>{t('visualStudio.editing')}</span>
                        </div>
                    )}
                </div>
                {history.length > 1 && (
                    <div className="flex-shrink-0">
                        <h3 className="text-sm font-semibold mb-2">{t('visualStudio.history')}</h3>
                        <div className="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-900/50 rounded-lg">
                            {history.map((imgSrc, index) => (
                                <button key={index} onClick={() => setHistoryIndex(index)} className={`w-16 h-16 rounded-md overflow-hidden flex-shrink-0 transition-all duration-200 ${historyIndex === index ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-800' : 'opacity-60 hover:opacity-100'}`}>
                                    <img src={imgSrc} alt={`Wersja ${index + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Right Column - Controls */}
            <div className="flex flex-col gap-6">
                 <div>
                    <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-2">{t('visualStudio.editWithAI')}</h3>
                    <textarea
                        id="edit-prompt"
                        rows={3}
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder={t('visualStudio.promptPlaceholder')}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 transition text-sm"
                    />
                    <div className="flex items-center gap-2 mt-2">
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading || !prompt.trim()}
                            className="flex-grow flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2.5 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            <SparklesIcon className="w-5 h-5"/>
                            {t('visualStudio.generateEdit')}
                        </button>
                        <button onClick={undo} disabled={!canUndo || isLoading} className="p-2.5 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors" title={t('visualStudio.undo')}>
                            <ArrowLeftIcon className="w-5 h-5"/>
                        </button>
                        <button onClick={redo} disabled={!canRedo || isLoading} className="p-2.5 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors" title={t('visualStudio.redo')}>
                            <ArrowRightIcon className="w-5 h-5"/>
                        </button>
                    </div>
                    {error && <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>}
                 </div>

                 <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <h3 className="text-base font-semibold text-gray-800 dark:text-white">{t('visualStudio.manualAdjust')}</h3>
                        <button onClick={handleResetEdits} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">{t('visualStudio.reset')}</button>
                     </div>
                      {/* Filters */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <label className="font-medium">{t('visualStudio.brightness')} ({edits.brightness}%)</label>
                            <input type="range" name="brightness" min="50" max="150" value={edits.brightness} onChange={handleEditChange} className="w-full h-1.5 accent-blue-500" />
                        </div>
                         <div>
                            <label className="font-medium">{t('visualStudio.contrast')} ({edits.contrast}%)</label>
                            <input type="range" name="contrast" min="50" max="150" value={edits.contrast} onChange={handleEditChange} className="w-full h-1.5 accent-blue-500" />
                        </div>
                        <div>
                            <label className="font-medium">{t('visualStudio.sepia')} ({edits.sepia}%)</label>
                            <input type="range" name="sepia" min="0" max="100" value={edits.sepia} onChange={handleEditChange} className="w-full h-1.5 accent-blue-500" />
                        </div>
                        <div>
                            <label className="font-medium">{t('visualStudio.grayscale')} ({edits.grayscale}%)</label>
                            <input type="range" name="grayscale" min="0" max="100" value={edits.grayscale} onChange={handleEditChange} className="w-full h-1.5 accent-blue-500" />
                        </div>
                    </div>
                     {/* Transforms */}
                    <div className="grid grid-cols-4 gap-2">
                        <button onClick={() => setEdits(p => ({...p, rotate: p.rotate - 90}))} className="p-2 flex flex-col items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-md text-xs hover:bg-gray-300 dark:hover:bg-gray-600"><RotateCcwIcon className="w-5 h-5" /> {t('visualStudio.rotateLeft')}</button>
                        <button onClick={() => setEdits(p => ({...p, rotate: p.rotate + 90}))} className="p-2 flex flex-col items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-md text-xs hover:bg-gray-300 dark:hover:bg-gray-600"><RotateCwIcon className="w-5 h-5" /> {t('visualStudio.rotateRight')}</button>
                        <button onClick={() => setEdits(p => ({...p, scaleX: p.scaleX * -1}))} className="p-2 flex flex-col items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-md text-xs hover:bg-gray-300 dark:hover:bg-gray-600"><FlipHorizontalIcon className="w-5 h-5" /> {t('visualStudio.flipHorizontal')}</button>
                        <button onClick={() => setEdits(p => ({...p, scaleY: p.scaleY * -1}))} className="p-2 flex flex-col items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-md text-xs hover:bg-gray-300 dark:hover:bg-gray-600"><FlipVerticalIcon className="w-5 h-5" /> {t('visualStudio.flipVertical')}</button>
                    </div>
                 </div>
            </div>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition">{t('common.cancel')}</button>
            <button onClick={handleApply} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 transition">{t('visualStudio.apply')}</button>
        </div>
      </div>
    </div>
  );
};