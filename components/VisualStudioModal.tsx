import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  /** Opens CreativeCanvas (Studio napisu) — sole place for movable captions */
  onOpenTextStudio?: () => void;
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
};

export const VisualStudioModal: React.FC<VisualStudioModalProps> = ({
  isOpen,
  onClose,
  onApply,
  originalImageUrl,
  user,
  onOpenTextStudio,
}) => {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [edits, setEdits] = useState<ImageEdits>(defaultEdits);
  const [activeTab, setActiveTab] = useState<'ai' | 'adjust'>('ai');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHistory([originalImageUrl]);
      setHistoryIndex(0);
      setEdits(defaultEdits);
      setPrompt('');
      setError(null);
      setIsLoading(false);
      setActiveTab('ai');
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Nie udało się edytować obrazu.');
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
    };
  }, [currentImageUrl, edits, onApply, t]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = () => canUndo && setHistoryIndex((i) => i - 1);
  const redo = () => canRedo && setHistoryIndex((i) => i + 1);

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEdits((prev) => ({ ...prev, [name]: parseInt(value, 10) }));
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
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fade-in"
      style={{ animationDuration: '0.3s' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0a1220] border border-slate-200 dark:border-white/10 rounded-lg shadow-xl w-full max-w-4xl m-4 transform transition-all flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex-shrink-0">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'var(--hero-accent)' }}
          >
            AI / Filtry
          </p>
          <h2 className="font-display text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('visualStudio.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('visualStudio.subtitle')}</p>
        </div>

        <div className="flex-grow p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-y-auto">
          <div className="flex flex-col gap-4">
            <div
              ref={containerRef}
              className="relative w-full aspect-square bg-slate-100 dark:bg-[#071018] rounded-lg overflow-hidden flex-grow flex items-center justify-center"
            >
              <img
                src={currentImageUrl}
                alt="Podgląd edycji"
                className="max-w-full max-h-full object-contain pointer-events-none"
                style={imageStyle}
              />

              {isLoading && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white z-20">
                  <svg
                    className="animate-spin h-8 w-8 text-white mb-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>{t('visualStudio.editing')}</span>
                </div>
              )}
            </div>
            {history.length > 1 && (
              <div className="flex-shrink-0">
                <h3 className="text-sm font-semibold mb-2">{t('visualStudio.history')}</h3>
                <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-[#071018] rounded-lg overflow-x-auto">
                  {history.map((imgSrc, index) => (
                    <button
                      key={`history-${imgSrc.slice(-20)}-${index}`}
                      type="button"
                      onClick={() => setHistoryIndex(index)}
                      className={`w-16 h-16 rounded-md overflow-hidden flex-shrink-0 transition-all ${
                        historyIndex === index
                          ? 'ring-2 ring-[var(--hero-accent)]'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={imgSrc}
                        alt={`Wersja ${index + 1}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`flex-1 min-h-[40px] py-2 text-xs font-semibold uppercase tracking-widest rounded-lg transition-all ${
                  activeTab === 'ai'
                    ? 'bg-[var(--hero-accent)] text-white'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                }`}
              >
                AI Edytor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('adjust')}
                className={`flex-1 min-h-[40px] py-2 text-xs font-semibold uppercase tracking-widest rounded-lg transition-all ${
                  activeTab === 'adjust'
                    ? 'bg-[var(--hero-accent)] text-white'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                }`}
              >
                Filtry
              </button>
            </div>

            {onOpenTextStudio && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTextStudio();
                }}
                className="w-full min-h-[44px] px-4 py-3 text-left rounded-lg border border-slate-200 dark:border-white/10 bg-[var(--hero-accent-soft)] hover:brightness-95 transition touch-manipulation"
              >
                <span
                  className="block text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--hero-accent)' }}
                >
                  Studio napisu
                </span>
                <span className="block text-sm text-slate-700 dark:text-slate-200 mt-0.5">
                  {t(
                    'visualStudio.openTextStudio',
                    'Przesuń napis, logo i maskotkę — otwórz dedykowany edytor'
                  )}
                </span>
              </button>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-2">
                  {t('visualStudio.editWithAI')}
                </h3>
                <textarea
                  id="edit-prompt"
                  rows={3}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t('visualStudio.promptPlaceholder')}
                  className="w-full bg-slate-50 dark:bg-[#071018] border border-slate-200 dark:border-white/10 rounded-lg p-2 focus:ring-2 focus:ring-[var(--hero-accent)] transition text-sm"
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => void handleGenerate()}
                    disabled={isLoading || !prompt.trim()}
                    className="flex-grow min-h-[44px] inline-flex items-center justify-center gap-2 text-white font-semibold py-2.5 px-4 rounded-lg hover:brightness-110 disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: 'var(--hero-accent)' }}
                  >
                    <SparklesIcon className="w-5 h-5" />
                    {t('visualStudio.generateEdit')}
                  </button>
                  <button
                    type="button"
                    onClick={undo}
                    disabled={!canUndo || isLoading}
                    className="p-2.5 min-h-[44px] min-w-[44px] bg-slate-200 dark:bg-white/10 rounded-lg hover:bg-slate-300 dark:hover:bg-white/15 disabled:opacity-50 transition-colors"
                    title={t('visualStudio.undo')}
                  >
                    <ArrowLeftIcon className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={redo}
                    disabled={!canRedo || isLoading}
                    className="p-2.5 min-h-[44px] min-w-[44px] bg-slate-200 dark:bg-white/10 rounded-lg hover:bg-slate-300 dark:hover:bg-white/15 disabled:opacity-50 transition-colors"
                    title={t('visualStudio.redo')}
                  >
                    <ArrowRightIcon className="w-5 h-5" />
                  </button>
                </div>
                {error && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>
                )}
              </div>
            )}

            {activeTab === 'adjust' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                    {t('visualStudio.manualAdjust')}
                  </h3>
                  <button
                    type="button"
                    onClick={handleResetEdits}
                    className="text-xs font-semibold text-[var(--hero-accent)] hover:underline"
                  >
                    {t('visualStudio.reset')}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium">
                      {t('visualStudio.brightness')} ({edits.brightness}%)
                    </label>
                    <input
                      type="range"
                      name="brightness"
                      min="50"
                      max="150"
                      value={edits.brightness}
                      onChange={handleEditChange}
                      className="w-full h-1.5 accent-[var(--hero-accent)]"
                    />
                  </div>
                  <div>
                    <label className="font-medium">
                      {t('visualStudio.contrast')} ({edits.contrast}%)
                    </label>
                    <input
                      type="range"
                      name="contrast"
                      min="50"
                      max="150"
                      value={edits.contrast}
                      onChange={handleEditChange}
                      className="w-full h-1.5 accent-[var(--hero-accent)]"
                    />
                  </div>
                  <div>
                    <label className="font-medium">
                      {t('visualStudio.sepia')} ({edits.sepia}%)
                    </label>
                    <input
                      type="range"
                      name="sepia"
                      min="0"
                      max="100"
                      value={edits.sepia}
                      onChange={handleEditChange}
                      className="w-full h-1.5 accent-[var(--hero-accent)]"
                    />
                  </div>
                  <div>
                    <label className="font-medium">
                      {t('visualStudio.grayscale')} ({edits.grayscale}%)
                    </label>
                    <input
                      type="range"
                      name="grayscale"
                      min="0"
                      max="100"
                      value={edits.grayscale}
                      onChange={handleEditChange}
                      className="w-full h-1.5 accent-[var(--hero-accent)]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setEdits((p) => ({ ...p, rotate: p.rotate - 90 }))}
                    className="p-2 flex flex-col items-center gap-1 bg-slate-200 dark:bg-white/10 rounded-lg text-xs hover:bg-slate-300 dark:hover:bg-white/15"
                  >
                    <RotateCcwIcon className="w-5 h-5" /> {t('visualStudio.rotateLeft')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEdits((p) => ({ ...p, rotate: p.rotate + 90 }))}
                    className="p-2 flex flex-col items-center gap-1 bg-slate-200 dark:bg-white/10 rounded-lg text-xs hover:bg-slate-300 dark:hover:bg-white/15"
                  >
                    <RotateCwIcon className="w-5 h-5" /> {t('visualStudio.rotateRight')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEdits((p) => ({ ...p, scaleX: p.scaleX * -1 }))}
                    className="p-2 flex flex-col items-center gap-1 bg-slate-200 dark:bg-white/10 rounded-lg text-xs hover:bg-slate-300 dark:hover:bg-white/15"
                  >
                    <FlipHorizontalIcon className="w-5 h-5" /> {t('visualStudio.flipHorizontal')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEdits((p) => ({ ...p, scaleY: p.scaleY * -1 }))}
                    className="p-2 flex flex-col items-center gap-1 bg-slate-200 dark:bg-white/10 rounded-lg text-xs hover:bg-slate-300 dark:hover:bg-white/15"
                  >
                    <FlipVerticalIcon className="w-5 h-5" /> {t('visualStudio.flipVertical')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-[#071018] border-t border-slate-200 dark:border-white/10 flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-white/10 rounded-lg hover:bg-slate-300 dark:hover:bg-white/15 transition"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="min-h-[44px] px-4 py-2 text-sm font-semibold text-white rounded-lg hover:brightness-110 transition"
            style={{ backgroundColor: 'var(--hero-accent)' }}
          >
            {t('visualStudio.apply')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VisualStudioModal;
