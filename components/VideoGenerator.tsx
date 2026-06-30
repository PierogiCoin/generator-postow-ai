import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  generateVideoStoryboard,
  generateVideo,
  generateVideoFromStoryboard,
  getVideoTemplates,
  getTemplatesByPlatform,
  getProviderInfo,
  VideoTemplate,
  VideoProvider,
  VideoStoryboard,
  VideoGenerationResult,
  VideoGenerationJob,
} from '../services/videoGenerationService';
import { Platform, Tone, ContentType, NotificationType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CollectionIcon } from './icons/CollectionIcon';
import { ClockIcon } from './icons/ClockIcon';
import { XMarkIcon } from './icons/XMarkIcon';

interface VideoGeneratorProps {
  topic: string;
  platform: Platform;
  tone: Tone;
  contentType: ContentType;
}

const PROVIDER_COLORS: Record<VideoProvider, string> = {
  runway: 'bg-gradient-to-r from-purple-500 to-pink-500',
  pika: 'bg-gradient-to-r from-yellow-400 to-orange-500',
  luma: 'bg-gradient-to-r from-blue-500 to-cyan-500',
  kling: 'bg-gradient-to-r from-red-500 to-pink-500',
  haiper: 'bg-gradient-to-r from-green-500 to-teal-500',
  stability: 'bg-gradient-to-r from-slate-600 to-slate-800',
  leonardo: 'bg-gradient-to-r from-indigo-500 to-purple-500',
};

const PLATFORM_ASPECT_RATIOS: Record<Platform, string> = {
  [Platform.TikTok]: '9:16',
  [Platform.Instagram]: '9:16',
  [Platform.YouTube]: '16:9',
  [Platform.LinkedIn]: '9:16',
  [Platform.X]: '16:9',
  [Platform.Facebook]: '1:1',
};

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({
  topic,
  platform,
  tone,
  contentType,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const notifications = useNotifications();

  const [activeTab, setActiveTab] = useState('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<VideoProvider>('runway');
  const [duration, setDuration] = useState(15);
  const [storyboard, setStoryboard] = useState<VideoStoryboard | null>(null);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generationJob, setGenerationJob] = useState<VideoGenerationJob | null>(null);
  const [generatedVideos, setGeneratedVideos] = useState<VideoGenerationResult[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const templates = getTemplatesByPlatform(platform);
  const allProviders: VideoProvider[] = ['runway', 'pika', 'luma', 'kling', 'haiper', 'stability'];

  const handleSelectTemplate = (template: VideoTemplate) => {
    setSelectedTemplate(template);
    setDuration(template.duration);
    setActiveTab('storyboard');
  };

  const handleGenerateStoryboard = useCallback(async () => {
    if (!user?.id || !topic.trim()) {
      notifications.addToast('Wpisz temat aby wygenerować storyboard', NotificationType.Info);
      return;
    }

    setIsGeneratingStoryboard(true);
    try {
      const result = await generateVideoStoryboard(
        topic,
        platform,
        selectedTemplate?.duration || duration,
        tone,
        contentType,
        user.id
      );
      setStoryboard(result);
      notifications.addToast('Storyboard wygenerowany!', NotificationType.Success);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd generowania storyboardu';
      notifications.addToast(errorMessage, NotificationType.Error);
    } finally {
      setIsGeneratingStoryboard(false);
    }
  }, [topic, platform, duration, tone, contentType, selectedTemplate, user, notifications]);

  const handleGenerateVideo = useCallback(async () => {
    if (!user?.id) return;

    setIsGeneratingVideo(true);
    try {
      let job: VideoGenerationJob;

      if (storyboard) {
        // Generate from storyboard
        job = await generateVideoFromStoryboard(storyboard, selectedProvider, user.id);
      } else {
        // Direct generation
        const result = await generateVideo(
          {
            prompt: topic,
            provider: selectedProvider,
            duration,
            aspectRatio: (selectedTemplate?.aspectRatio || PLATFORM_ASPECT_RATIOS[platform]) as '9:16' | '16:9' | '1:1' | '4:3',
          },
          user.id
        );
        job = {
          id: `direct-${Date.now()}`,
          request: {
            prompt: topic,
            provider: selectedProvider,
            duration,
          },
          results: [result],
          status: 'completed',
          progress: 100,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      setGenerationJob(job);
      setGeneratedVideos(job.results);
      notifications.addToast('Wideo wygenerowane!', NotificationType.Success);
      setActiveTab('generate');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd generowania wideo';
      notifications.addToast(errorMessage, NotificationType.Error);
    } finally {
      setIsGeneratingVideo(false);
    }
  }, [topic, storyboard, selectedProvider, duration, selectedTemplate, platform, user, notifications]);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getProviderName = (provider: VideoProvider): string => {
    const names: Record<VideoProvider, string> = {
      runway: 'Runway Gen-3',
      pika: 'Pika 1.5',
      luma: 'Luma Dream Machine',
      kling: 'Kling AI',
      haiper: 'Haiper',
      stability: 'Stability Video',
      leonardo: 'Leonardo Motion',
    };
    return names[provider];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
            <VideoCameraIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              AI Video Generator
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Twórz filmy AI z storyboardem
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'templates', label: 'Szablony', icon: CollectionIcon, badge: templates.length },
          { id: 'storyboard', label: 'Storyboard', icon: ClipboardIcon, badge: storyboard ? '✓' : null },
          { id: 'generate', label: 'Wideo', icon: VideoCameraIcon, badge: generatedVideos.length > 0 ? generatedVideos.length : null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.badge && (
              <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <h3 className="font-medium text-purple-900 dark:text-purple-200 mb-2">
              🎬 Wybierz szablon wideo
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Szablone zoptymalizowane pod {platform}. Każdy szablon ma odpowiedni aspect ratio i styl.
            </p>
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedTemplate?.id === template.id
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl text-2xl">
                    {template.thumbnail}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 dark:text-white">
                      {template.name}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {template.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded">
                        {template.duration}s
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded">
                        {template.aspectRatio}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs rounded">
                        {template.musicGenre}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 italic">
                      "{template.examplePrompt.slice(0, 60)}..."
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {templates.length === 0 && (
            <div className="text-center p-8 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <CollectionIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 dark:text-slate-400">
                Brak szablonów dla {platform}. Użyj trybu bez szablonu.
              </p>
            </div>
          )}

          {/* Custom Video Option */}
          <div
            onClick={() => {
              setSelectedTemplate(null);
              setActiveTab('storyboard');
            }}
            className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-purple-400 cursor-pointer transition-all text-center"
          >
            <SparklesIcon className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Lub stwórz wideo bez szablonu
            </p>
          </div>
        </div>
      )}

      {/* Storyboard Tab */}
      {activeTab === 'storyboard' && (
        <div className="space-y-4">
          {selectedTemplate && (
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedTemplate.thumbnail}</span>
                <div>
                  <p className="font-medium text-purple-900 dark:text-purple-200">
                    Wybrany szablon: {selectedTemplate.name}
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    {selectedTemplate.duration}s • {selectedTemplate.aspectRatio} • {selectedTemplate.style}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="ml-auto p-1 text-purple-400 hover:text-purple-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                <ClockIcon className="w-4 h-4 inline mr-1" />
                Długość (sekundy)
              </label>
              <input
                type="range"
                min="3"
                max="60"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>3s</span>
                <span className="font-bold text-purple-600">{duration}s</span>
                <span>60s</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Aspect Ratio
              </label>
              <div className="flex gap-2">
                {['16:9', '9:16', '1:1'].map((ratio) => (
                  <button
                    key={ratio}
                    onClick={() => {}}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      ratio === (selectedTemplate?.aspectRatio || PLATFORM_ASPECT_RATIOS[platform])
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Provider Selection */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Wybierz model AI
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allProviders.map((provider) => {
                const info = getProviderInfo(provider);
                return (
                  <button
                    key={provider}
                    onClick={() => setSelectedProvider(provider)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedProvider === provider
                        ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                        : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-purple-200'
                    }`}
                  >
                    <div className={`w-full h-2 rounded-full mb-2 ${PROVIDER_COLORS[provider]}`} />
                    <p className="font-medium text-slate-900 dark:text-white text-sm">
                      {getProviderName(provider)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {info.maxDuration}s max • ${info.costPerSecond}/s
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate Storyboard Button */}
          <button
            onClick={handleGenerateStoryboard}
            disabled={isGeneratingStoryboard || !topic.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white font-medium rounded-xl transition-all"
          >
            {isGeneratingStoryboard ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generuję storyboard...
              </>
            ) : (
              <>
                <ClipboardIcon className="w-5 h-5" />
                Generuj Storyboard
              </>
            )}
          </button>

          {/* Storyboard Display */}
          {storyboard && (
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                <h3 className="font-bold text-purple-900 dark:text-purple-200 mb-2">
                  🎬 {storyboard.title}
                </h3>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded">
                    {storyboard.totalScenes} scen
                  </span>
                  <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded">
                    {storyboard.totalDuration}s
                  </span>
                  <span className="px-2 py-1 bg-white dark:bg-slate-800 rounded">
                    {storyboard.aspectRatio}
                  </span>
                </div>
              </div>

              {/* Scenes */}
              <div className="space-y-3">
                {storyboard.scenes.map((scene, index) => (
                  <div
                    key={`scene-${scene.sceneNumber}`}
                    className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">
                        {scene.sceneNumber}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">
                          Scena {scene.sceneNumber} • {scene.timestamp}
                        </p>
                        <p className="text-xs text-slate-500">
                          {scene.duration}s • {scene.cameraMotion}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg mb-3">
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-1">
                        🎥 Visual:
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {scene.visualDescription}
                      </p>
                    </div>

                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg mb-3">
                      <p className="text-sm text-purple-800 dark:text-purple-300 font-medium mb-1">
                        🤖 AI Prompt:
                      </p>
                      <p className="text-sm text-purple-700 dark:text-purple-400 font-mono">
                        {scene.aiPrompt}
                      </p>
                      <button
                        onClick={() => handleCopy(scene.aiPrompt, index)}
                        className="mt-2 text-xs px-2 py-1 bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded"
                      >
                        {copiedIndex === index ? 'Skopiowano!' : 'Kopiuj prompt'}
                      </button>
                    </div>

                    {scene.narrationScript && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-1">
                          🎙️ Narracja:
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          "{scene.narrationScript}"
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Music Suggestions */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">
                  🎵 Sugestie muzyczne
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-white dark:bg-slate-700 rounded">
                    <span className="text-slate-500">Gatunek:</span>
                    <span className="ml-2 font-medium">{storyboard.musicSuggestions.genre}</span>
                  </div>
                  <div className="p-2 bg-white dark:bg-slate-700 rounded">
                    <span className="text-slate-500">Tempo:</span>
                    <span className="ml-2 font-medium">{storyboard.musicSuggestions.tempo}</span>
                  </div>
                </div>
              </div>

              {/* Generate Video Button */}
              <button
                onClick={handleGenerateVideo}
                disabled={isGeneratingVideo}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all"
              >
                {isGeneratingVideo ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generuję wideo przez {getProviderName(selectedProvider)}...
                  </>
                ) : (
                  <>
                    <VideoCameraIcon className="w-5 h-5" />
                    Generuj Wideo ({duration}s • {getProviderName(selectedProvider)})
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Generate Tab - Results */}
      {activeTab === 'generate' && (
        <div className="space-y-4">
          {generatedVideos.length === 0 ? (
            <div className="text-center p-8 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <VideoCameraIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 dark:text-slate-400">
                Jeszcze nie wygenerowano żadnych wideo.
              </p>
              <button
                onClick={() => setActiveTab('storyboard')}
                className="mt-4 px-4 py-2 bg-purple-500 text-white rounded-lg"
              >
                Przejdź do generowania
              </button>
            </div>
          ) : (
            <>
              {/* Generation Stats */}
              {generationJob && (
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <h4 className="font-bold text-purple-900 dark:text-purple-200 mb-2">
                    📊 Status generowania
                  </h4>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all"
                        style={{ width: `${generationJob.progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-purple-700">{Math.round(generationJob.progress)}%</span>
                  </div>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    Wygenerowano {generatedVideos.length} wideo
                  </p>
                </div>
              )}

              {/* Video Results */}
              <div className="grid gap-4">
                {generatedVideos.map((video, index) => (
                  <div
                    key={video.id}
                    className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg text-white ${PROVIDER_COLORS[video.provider]}`}>
                        <VideoCameraIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          Wideo {index + 1} • {getProviderName(video.provider)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {video.duration}s • {video.aspectRatio}
                        </p>
                      </div>
                      <span className={`ml-auto px-2 py-1 rounded text-xs ${
                        video.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : video.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {video.status === 'completed' ? '✓ Gotowe' : 
                         video.status === 'failed' ? '✗ Błąd' : 
                         '⏳ Przetwarzanie'}
                      </span>
                    </div>

                    {/* Video Preview Placeholder */}
                    {video.thumbnailUrl && (
                      <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden mb-3">
                        <img
                          src={video.thumbnailUrl}
                          alt="Video thumbnail"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                            <VideoCameraIcon className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                          {video.duration}s
                        </div>
                      </div>
                    )}

                    {/* Cost Info */}
                    <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Koszt:
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {video.cost.credits} kredytów (~${video.cost.estimatedUsd.toFixed(2)})
                      </span>
                    </div>

                    {video.videoUrl && (
                      <div className="flex gap-2 mt-3">
                        <a
                          href={video.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                        >
                          <ArrowRightIcon className="w-4 h-4" />
                          Pobierz wideo
                        </a>
                        <button
                          onClick={() => handleCopy(video.videoUrl!, 100 + index)}
                          className="p-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                        >
                          {copiedIndex === 100 + index ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-500" />
                          ) : (
                            <ClipboardIcon className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoGenerator;
