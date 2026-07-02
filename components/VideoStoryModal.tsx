import React, { useState } from 'react';
import { X, Instagram, Video, Download, Sparkles, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { GenerationResult } from '../types';
import type { VideoStoryProgressStatus } from '../services/videoStoryService';
import { VideoStoryProgress } from './VideoStoryProgress';

interface VideoStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToPost?: () => void;
  post: GenerationResult | null;
  onGenerate: (style: VideoStoryStyle, provider: VideoStoryProvider) => Promise<void>;
  isGenerating: boolean;
  progressStatus?: VideoStoryProgressStatus | null;
  generatedVideo?: {
    url: string;
    thumbnail: string;
    duration: number;
  };
}

export type VideoStoryStyle = 
  | 'instagram-story' 
  | 'tiktok-vertical' 
  | 'animated-quote' 
  | 'kinetic-typography'
  | 'carousel-slides';

export type VideoStoryProvider = 'auto' | 'veo' | 'luma';

interface StyleOption {
  id: VideoStoryStyle;
  name: string;
  description: string;
  icon: string;
  aspectRatio: string;
  duration: string;
}

export const VideoStoryModal: React.FC<VideoStoryModalProps> = ({
  isOpen,
  onClose,
  onApplyToPost,
  post,
  onGenerate,
  isGenerating,
  progressStatus,
  generatedVideo
}) => {
  const { t } = useTranslation();
  const [selectedStyle, setSelectedStyle] = useState<VideoStoryStyle>('instagram-story');
  const [selectedProvider, setSelectedProvider] = useState<VideoStoryProvider>('veo');

  const providerOptions: { id: VideoStoryProvider; name: string; description: string; icon: string }[] = [
    {
      id: 'veo',
      name: t('videoStory.providers.veo', 'Google Veo 3.1'),
      description: t('videoStory.providers.veoDesc', 'Gemini API, natywny dźwięk, 8s'),
      icon: '✨',
    },
    {
      id: 'luma',
      name: t('videoStory.providers.luma', 'Luma Dream Machine'),
      description: t('videoStory.providers.lumaDesc', 'Każda proporcja, cinematic'),
      icon: '🎬',
    },
    {
      id: 'auto',
      name: t('videoStory.providers.auto', 'Auto'),
      description: t('videoStory.providers.autoDesc', 'Najlepszy dostępny dostawca'),
      icon: '⚙️',
    },
  ];

  const styleOptions: StyleOption[] = [
    {
      id: 'instagram-story',
      name: t('videoStory.styles.instagramStory', 'Instagram Story'),
      description: t('videoStory.styles.instagramStoryDesc', '9:16, 15s, dynamiczne przejścia'),
      icon: '📱',
      aspectRatio: '9:16',
      duration: '15s'
    },
    {
      id: 'tiktok-vertical',
      name: t('videoStory.styles.tiktok', 'TikTok Video'),
      description: t('videoStory.styles.tiktokDesc', '9:16, trendy efekty, 30s'),
      icon: '🎵',
      aspectRatio: '9:16',
      duration: '30s'
    },
    {
      id: 'animated-quote',
      name: t('videoStory.styles.animatedQuote', 'Animowany Cytat'),
      description: t('videoStory.styles.animatedQuoteDesc', 'Elegancka typografia w ruchu'),
      icon: '💭',
      aspectRatio: '1:1',
      duration: '10s'
    },
    {
      id: 'kinetic-typography',
      name: t('videoStory.styles.kinetic', 'Kinetic Typography'),
      description: t('videoStory.styles.kineticDesc', 'Dynamiczny tekst z efektami'),
      icon: '⚡',
      aspectRatio: '16:9',
      duration: '20s'
    },
    {
      id: 'carousel-slides',
      name: t('videoStory.styles.carousel', 'Carousel Slides'),
      description: t('videoStory.styles.carouselDesc', 'Seria slajdów z kluczowymi punktami'),
      icon: '📊',
      aspectRatio: '1:1',
      duration: '25s'
    }
  ];

  if (!isOpen) return null;

  const handleGenerate = async () => {
    await onGenerate(selectedStyle, selectedProvider);
  };

  const selectedOption = styleOptions.find(opt => opt.id === selectedStyle);

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {t('videoStory.title', 'AI Video Stories')}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('videoStory.subtitle', 'Przekształć swój post w wideo story')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: Style Selection */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                {t('videoStory.selectStyle', 'Wybierz styl wideo')}
              </h3>
              <div className="space-y-3">
                {styleOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedStyle(option.id)}
                    className={`w-full p-4 rounded-xl border-2 transition text-left ${
                      selectedStyle === option.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{option.icon}</span>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {option.name}
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {option.description}
                        </div>
                        <div className="flex gap-3 mt-2 text-xs text-slate-400">
                          <span>📐 {option.aspectRatio}</span>
                          <span>⏱️ {option.duration}</span>
                        </div>
                      </div>
                      {selectedStyle === option.id && (
                        <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Provider selection */}
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mt-6 mb-3">
                {t('videoStory.selectProvider', 'Silnik AI')}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {providerOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedProvider(option.id)}
                    className={`p-3 rounded-xl border-2 transition text-left ${
                      selectedProvider === option.id
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
                    }`}
                  >
                    <div className="text-xl mb-1">{option.icon}</div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white leading-tight">
                      {option.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-tight">
                      {option.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Preview/Result */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                {t('videoStory.preview', 'Podgląd')}
              </h3>
              
              {!generatedVideo && !isGenerating && (
                <div className="aspect-[9/16] max-h-[500px] bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl flex flex-col items-center justify-center p-6 border-2 border-dashed border-purple-300 dark:border-purple-700">
                  <Sparkles className="w-16 h-16 text-purple-500 mb-4" />
                  <p className="text-center text-slate-600 dark:text-slate-400 mb-2">
                    {t('videoStory.selectAndGenerate', 'Wybierz styl i kliknij Generuj')}
                  </p>
                  {selectedOption && (
                    <div className="text-center mt-4 space-y-1">
                      <p className="text-sm text-slate-500">
                        <strong>{selectedOption.name}</strong>
                      </p>
                      <p className="text-xs text-slate-400">
                        {selectedOption.aspectRatio} • {selectedOption.duration}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {isGenerating && progressStatus && (
                <div className="aspect-[9/16] max-h-[500px] bg-slate-100 dark:bg-slate-900 rounded-2xl flex flex-col items-center justify-center p-6">
                  <VideoStoryProgress status={progressStatus} />
                </div>
              )}

              {isGenerating && !progressStatus && (
                <div className="aspect-[9/16] max-h-[500px] bg-slate-100 dark:bg-slate-900 rounded-2xl flex flex-col items-center justify-center p-6">
                  <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
                  <p className="text-slate-900 dark:text-white font-semibold">
                    {t('videoStory.generating', 'Generowanie wideo...')}
                  </p>
                </div>
              )}

              {generatedVideo && !isGenerating && (
                <div className="space-y-4">
                  <div className="aspect-[9/16] max-h-[500px] bg-slate-900 rounded-2xl overflow-hidden relative">
                    <video 
                      src={generatedVideo.url}
                      poster={generatedVideo.thumbnail}
                      controls
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const filename = `video-story-${Date.now()}.mp4`;
                        try {
                          // Pobranie przez blob działa cross-origin (CDN/Supabase) tam, gdzie samo `download` zawodzi.
                          const res = await fetch(generatedVideo.url);
                          const blob = await res.blob();
                          const objectUrl = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = objectUrl;
                          a.download = filename;
                          a.click();
                          URL.revokeObjectURL(objectUrl);
                        } catch {
                          window.open(generatedVideo.url, '_blank', 'noopener');
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      {t('videoStory.download', 'Pobierz')}
                    </button>
                    {onApplyToPost && (
                      <button
                        type="button"
                        onClick={onApplyToPost}
                        className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition flex items-center justify-center gap-2 font-semibold"
                      >
                        <Video className="w-4 h-4" />
                        {t('videoStory.applyToPost', 'Użyj w poście')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Post Preview */}
          {post && (
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                {t('videoStory.originalPost', 'Oryginalny post:')}
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3">
                {post.postText}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-4 h-4" />
            <span>{t('videoStory.poweredBy', 'Powered by Google Veo & Luma AI')}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
            >
              {t('common.cancel', 'Anuluj')}
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('videoStory.generating', 'Generowanie...')}
                </>
              ) : (
                <>
                  <Video className="w-4 h-4" />
                  {t('videoStory.generate', 'Generuj Video')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Default export for lazy loading
export default VideoStoryModal;
