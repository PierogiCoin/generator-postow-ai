import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  analyzeViralImage, 
  generateReversePrompts, 
  fetchImageAsBase64,
  reverseImageWorkflow,
  ImageAnalysisResult,
  ReverseImagePrompt 
} from '../services/reverseImageService';
import { Platform, NotificationType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { XMarkIcon } from './icons/XMarkIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { generateImages } from '../services/mediaService';

interface ReverseImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string, caption: string) => void;
  platform: Platform;
  brandVoice?: string;
}

const STEPS = {
  UPLOAD: 'upload',
  ANALYZING: 'analyzing',
  RESULTS: 'results',
  GENERATING: 'generating',
} as const;

export const ReverseImageModal: React.FC<ReverseImageModalProps> = ({
  isOpen,
  onClose,
  onSelectPrompt,
  platform,
  brandVoice,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const notifications = useNotifications();
  
  const [currentStep, setCurrentStep] = useState<string>(STEPS.UPLOAD);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [analysis, setAnalysis] = useState<ImageAnalysisResult | null>(null);
  const [prompts, setPrompts] = useState<ReverseImagePrompt | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState<number | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const handleClose = useCallback(() => {
    // Reset state
    setCurrentStep(STEPS.UPLOAD);
    setImageUrl('');
    setUploadedImage(null);
    setTopic('');
    setAnalysis(null);
    setPrompts(null);
    setSelectedVariation(null);
    setGeneratedImage(null);
    onClose();
  }, [onClose]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleClose]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      notifications.addToast('Wybierz plik obrazu', NotificationType.Error);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      notifications.addToast('Maksymalny rozmiar pliku to 5MB', NotificationType.Error);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      setImageUrl('');
    };
    reader.readAsDataURL(file);
  }, [notifications]);

  const handleAnalyze = useCallback(async () => {
    if (!user?.id) {
      notifications.addToast('Musisz być zalogowany', NotificationType.Error);
      return;
    }

    const imageToAnalyze = uploadedImage || imageUrl;
    if (!imageToAnalyze) {
      notifications.addToast('Wgraj lub podaj URL obrazu', NotificationType.Error);
      return;
    }

    if (!topic.trim()) {
      notifications.addToast('Podaj temat dla generowanego obrazu', NotificationType.Error);
      return;
    }

    setIsLoading(true);
    setCurrentStep(STEPS.ANALYZING);

    try {
      let base64: string;
      let mimeType: string;

      if (uploadedImage) {
        const [header, data] = uploadedImage.split(',');
        base64 = data;
        mimeType = header.split(':')[1]?.split(';')[0] || 'image/jpeg';
      } else {
        const fetched = await fetchImageAsBase64(imageUrl);
        base64 = fetched.base64;
        mimeType = fetched.mimeType;
      }

      // Analyze the image
      const analysisResult = await analyzeViralImage(
        base64,
        mimeType,
        platform,
        user.id
      );
      
      setAnalysis(analysisResult);

      // Generate reverse prompts
      const promptResult = await generateReversePrompts(
        analysisResult,
        topic,
        brandVoice,
        user.id
      );
      
      setPrompts(promptResult);
      setCurrentStep(STEPS.RESULTS);
      notifications.addToast('Analiza zakończona! Wygenerowano 3 warianty.', NotificationType.Success);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
      notifications.addToast(
        `Błąd analizy: ${errorMessage}`,
        NotificationType.Error
      );
      setCurrentStep(STEPS.UPLOAD);
    } finally {
      setIsLoading(false);
    }
  }, [uploadedImage, imageUrl, topic, platform, user, notifications]);

  const handleGenerateImage = useCallback(async (prompt: string, index: number) => {
    if (!user?.id || isLoading) return;
    if (!prompt.trim()) {
      notifications.addToast('Prompt jest pusty', NotificationType.Error);
      return;
    }

    setSelectedVariation(index);
    setCurrentStep(STEPS.GENERATING);
    setIsLoading(true);

    try {
      const platformAspectRatio: Record<Platform, string> = {
        [Platform.Instagram]: '1:1',
        [Platform.TikTok]: '9:16',
        [Platform.YouTube]: '16:9',
        [Platform.Facebook]: '1:1',
        [Platform.X]: '16:9',
        [Platform.LinkedIn]: '1:1',
      };
      const result = await generateImages(
        prompt,
        {
          numberOfImages: 1,
          aspectRatio: platformAspectRatio[platform] || '1:1',
        },
        user.id
      );

      if (result.images && result.images.length > 0) {
        setGeneratedImage(result.images[0].url);
        notifications.addToast('Obraz wygenerowany pomyślnie!', NotificationType.Success);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Błąd generowania obrazu';
      notifications.addToast(errorMessage, NotificationType.Error);
    } finally {
      setIsLoading(false);
      setCurrentStep(STEPS.RESULTS);
    }
  }, [platform, user, notifications]);

  const handleCopyPrompt = useCallback(async (prompt: string, index: number) => {
    try {
      await navigator.clipboard.writeText(prompt);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      setCopiedPrompt(index);
      copyTimeoutRef.current = setTimeout(() => setCopiedPrompt(null), 2000);
      notifications.addToast('Prompt skopiowany!', NotificationType.Success);
    } catch (err) {
      notifications.addToast('Nie udało się skopiować do schowka', NotificationType.Error);
    }
  }, [notifications]);

  const handleUsePrompt = useCallback((prompt: string, captionIndex: number) => {
    const caption = prompts?.suggestedCaptions?.[captionIndex] || '';
    onSelectPrompt(prompt, caption);
    onClose();
  }, [prompts, onSelectPrompt, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <PhotoIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Reverse Image Prompting
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Analizuj viralowe obrazy i twórz podobne
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === STEPS.UPLOAD && (
            <div className="space-y-6">
              {/* Upload Methods */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* File Upload */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl hover:border-purple-500 dark:hover:border-purple-500 transition-all cursor-pointer text-center"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <PhotoIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                    Wgraj z dysku
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    PNG, JPG do 5MB
                  </p>
                </div>

                {/* URL Input */}
                <div className="p-6 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <LightbulbIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-center mb-1">
                    Lub podaj URL
                  </h3>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setUploadedImage(null);
                    }}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              {/* Preview */}
              {(uploadedImage || imageUrl) && (
                <div className="relative rounded-2xl overflow-hidden max-h-64">
                  <img
                    src={uploadedImage || imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => {
                      notifications.addToast('Nie udało się załadować obrazu', NotificationType.Error);
                      setImageUrl('');
                      setUploadedImage(null);
                    }}
                  />
                </div>
              )}

              {/* Topic Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Jaki temat ma mieć Twój obraz? *
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Np: Moja nowa linia kosmetyków, Kurs online, Restauracja..."
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  AI zachowa styl analizowanego obrazu, ale zastosuje go do Twojego tematu
                </p>
              </div>

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={isLoading || (!uploadedImage && !imageUrl) || !topic.trim()}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analizowanie...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    Analizuj i generuj prompty
                  </>
                )}
              </button>
            </div>
          )}

          {currentStep === STEPS.ANALYZING && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 rounded-full animate-spin" />
              <p className="text-lg font-medium text-slate-900 dark:text-white">
                AI analizuje obraz...
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
                Identyfikowanie kolorów, kompozycji, nastroju i elementów viralowych
              </p>
            </div>
          )}

          {currentStep === STEPS.RESULTS && analysis && prompts && (
            <div className="space-y-6">
              {/* Analysis Summary */}
              <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl border border-purple-200 dark:border-purple-800">
                <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <SparklesIcon className="w-5 h-5 text-purple-600" />
                  Analiza obrazu
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Styl:</span>
                    <p className="font-medium text-slate-900 dark:text-white">{analysis.visualStyle}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Kompozycja:</span>
                    <p className="font-medium text-slate-900 dark:text-white">{analysis.composition}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Nastrój:</span>
                    <p className="font-medium text-slate-900 dark:text-white">{analysis.mood}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Emocja docelowa:</span>
                    <p className="font-medium text-slate-900 dark:text-white">{analysis.targetEmotion}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-800">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">Dlaczego działa:</span> {analysis.whyItWorks}
                  </p>
                </div>
              </div>

              {/* Generated Prompts */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <LightbulbIcon className="w-5 h-5 text-amber-500" />
                  Wygenerowane prompty (3 warianty)
                </h3>

                {prompts.variationPrompts.map((prompt, index) => {
                  const variationLabels = ['🎨 Wariant A - Dramatyczny', '✨ Wariant B - Minimalny', '🌟 Wariant C - Kreatywny'];
                  const variationColors = ['from-red-500 to-orange-500', 'from-blue-500 to-cyan-500', 'from-purple-500 to-pink-500'];
                  
                  return (
                    <div
                      key={`variation-${index}`}
                      className={`p-4 border-2 rounded-2xl transition-all ${
                        selectedVariation === index
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/10'
                          : 'border-slate-200 dark:border-slate-800 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${variationColors[index]} text-white text-xs font-bold`}>
                          {variationLabels[index]}
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 line-clamp-4">
                        {prompt}
                      </p>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopyPrompt(prompt, index)}
                          className="flex-1 py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          {copiedPrompt === index ? (
                            <>
                              <CheckCircleIcon className="w-4 h-4 text-green-500" />
                              Skopiowano!
                            </>
                          ) : (
                            <>
                              <ClipboardIcon className="w-4 h-4" />
                              Kopiuj prompt
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleGenerateImage(prompt, index)}
                          disabled={isLoading}
                          className="flex-1 py-2 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          {isLoading && selectedVariation === index ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <SparklesIcon className="w-4 h-4" />
                              Generuj obraz
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Generated Image Preview */}
              {generatedImage && (
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
                    Wygenerowany obraz:
                  </h4>
                  <img
                    src={generatedImage}
                    alt="Generated"
                    className="w-full rounded-xl"
                  />
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleUsePrompt(prompts.variationPrompts[selectedVariation || 0], 0)}
                      aria-label="Użyj tego obrazu"
                      className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircleIcon className="w-5 h-5" />
                      Użyj tego obrazu
                    </button>
                    <button
                      onClick={() => setGeneratedImage(null)}
                      aria-label="Generuj inny obraz"
                      className="px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Generuj inny
                    </button>
                  </div>
                </div>
              )}

              {/* Suggested Captions */}
              {prompts.suggestedCaptions && prompts.suggestedCaptions.length > 0 && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
                  <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-3 flex items-center gap-2">
                    <LightbulbIcon className="w-4 h-4" />
                    Sugerowane napisy:
                  </h4>
                  <ul className="space-y-2">
                    {prompts.suggestedCaptions.map((caption, idx) => (
                      <li
                        key={idx}
                        onClick={() => handleUsePrompt(prompts.generatedPrompt, idx)}
                        className="p-3 bg-white dark:bg-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 cursor-pointer hover:ring-2 hover:ring-amber-400 transition-all"
                      >
                        {idx + 1}. {caption}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {currentStep === STEPS.GENERATING && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="w-16 h-16 border-4 border-purple-200 dark:border-purple-900 border-t-purple-600 rounded-full animate-spin" />
              <p className="text-lg font-medium text-slate-900 dark:text-white">
                Generowanie obrazu...
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                To może potrwać do 30 sekund
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReverseImageModal;
