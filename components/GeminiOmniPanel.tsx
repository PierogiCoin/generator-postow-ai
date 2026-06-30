import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  generateWithOmni,
  generateImageOmni,
  generateVideoOmni,
  analyzeImageOmni,
  analyzeVideoOmni,
  generateWithGrounding,
  generateAndExecuteCode,
  getOmniCapabilities,
  getModelInfo,
  GeminiModel,
  OmniGenerationResult,
} from '../services/geminiOmniService';
import { Platform, Tone, ContentType, NotificationType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { XMarkIcon } from './icons/XMarkIcon';
import { CollectionIcon } from './icons/CollectionIcon';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { GlobeIcon } from './icons/GlobeIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';

interface GeminiOmniPanelProps {
  initialPrompt?: string;
  platform?: Platform;
  tone?: Tone;
  contentType?: ContentType;
}

type OmniTab = 'capabilities' | 'text' | 'image' | 'video' | 'analysis' | 'grounding' | 'code';

const CAPABILITY_COLORS: Record<string, string> = {
  text_generation: 'bg-blue-500',
  image_generation: 'bg-pink-500',
  video_generation: 'bg-purple-500',
  image_analysis: 'bg-green-500',
  video_analysis: 'bg-orange-500',
  audio_analysis: 'bg-yellow-500',
  grounding: 'bg-cyan-500',
  code_execution: 'bg-red-500',
  long_context: 'bg-indigo-500',
  multimodal_chat: 'bg-teal-500',
};

export const GeminiOmniPanel: React.FC<GeminiOmniPanelProps> = ({
  initialPrompt = '',
  platform = Platform.LinkedIn,
  tone = Tone.Professional,
  contentType = ContentType.Post,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const notifications = useNotifications();

  const [activeTab, setActiveTab] = useState<OmniTab>('capabilities');
  const [selectedModel, setSelectedModel] = useState<GeminiModel>('gemini-2.0-flash-exp');
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<OmniGenerationResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Image generation state
  const [imageStyle, setImageStyle] = useState<string>('photorealistic');
  const [imageAspectRatio, setImageAspectRatio] = useState<string>('1:1');
  const [imageCount, setImageCount] = useState(1);

  // Video generation state
  const [videoDuration, setVideoDuration] = useState<4 | 8 | 10>(4);
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoMotion, setVideoMotion] = useState<'low' | 'medium' | 'high'>('medium');

  // Analysis state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<string>('describe');

  // Code state
  const [codeLanguage, setCodeLanguage] = useState<string>('javascript');
  const [codeInput, setCodeInput] = useState('');

  // Grounding state
  const [useGrounding, setUseGrounding] = useState(false);
  const [useCodeExecution, setUseCodeExecution] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const capabilities = getOmniCapabilities();
  const modelInfo = getModelInfo(selectedModel);

  const handleGenerate = useCallback(async (mode: OmniTab) => {
    if (!user?.id || !prompt.trim()) {
      notifications.addToast('Wpisz prompt i zaloguj się', NotificationType.Info);
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      let response: OmniGenerationResult;

      switch (mode) {
        case 'text':
          response = await generateWithOmni({
            prompt,
            mode: 'text',
            platform,
            tone,
            contentType,
            config: {
              model: selectedModel,
              enableGrounding: useGrounding,
              enableCodeExecution: useCodeExecution,
            },
          }, user.id);
          break;

        case 'image':
          response = await generateImageOmni(
            prompt,
            imageStyle as any,
            imageAspectRatio as any,
            imageCount,
            user.id
          );
          break;

        case 'video':
          response = await generateVideoOmni(
            prompt,
            videoDuration,
            videoAspectRatio,
            videoMotion,
            user.id
          );
          break;

        case 'analysis':
          if (uploadedImage) {
            response = await analyzeImageOmni(uploadedImage, analysisType as any, user.id);
          } else if (uploadedVideo) {
            response = await analyzeVideoOmni(uploadedVideo, analysisType as any, user.id);
          } else {
            throw new Error('Dodaj obraz lub wideo do analizy');
          }
          break;

        case 'grounding':
          response = await generateWithGrounding(prompt, platform, tone, contentType, user.id);
          break;

        case 'code':
          response = await generateAndExecuteCode(codeInput || prompt, codeLanguage as any, user.id);
          break;

        default:
          throw new Error('Nieznany tryb');
      }

      if (isMountedRef.current) {
        setResult(response);
        notifications.addToast('Wygenerowano pomyślnie!', NotificationType.Success);
      }
    } catch (error: unknown) {
      if (isMountedRef.current) {
        const errorMessage = error instanceof Error ? error.message : 'Błąd generowania';
        notifications.addToast(errorMessage, NotificationType.Error);
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [prompt, selectedModel, platform, tone, contentType, imageStyle, imageAspectRatio, imageCount, videoDuration, videoAspectRatio, videoMotion, uploadedImage, uploadedVideo, analysisType, useGrounding, codeLanguage, codeInput, useCodeExecution, user, notifications]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (type === 'image') {
        setUploadedImage(base64);
        setUploadedVideo(null);
      } else {
        setUploadedVideo(base64);
        setUploadedImage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopy = () => {
    if (result?.text) {
      navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderCapabilitiesTab = () => (
    <div className="space-y-6">
      <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          🤖 Gemini 2.0 (Omni) - Pełne możliwości
        </h3>
        <p className="text-slate-600 dark:text-slate-400">
          Najbardziej zaawansowany model AI Google. Rozumie i generuje tekst, obrazy, wideo, audio natywnie.
        </p>
      </div>

      {/* Model Selector */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
          Wybierz model
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(['gemini-2.0-flash-exp', 'gemini-2.0-flash-thinking-exp', 'gemini-2.0-pro-exp', 'gemini-1.5-pro', 'gemini-1.5-flash'] as GeminiModel[]).map((model) => {
            const info = getModelInfo(model);
            return (
              <button
                key={model}
                onClick={() => setSelectedModel(model)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  selectedModel === model
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:border-blue-200'
                }`}
              >
                <p className="font-bold text-slate-900 dark:text-white text-sm">{info.name}</p>
                <p className="text-xs text-slate-500 mt-1">{info.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {info.strengths.map(s => (
                    <span key={s} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-[10px] rounded">
                      {s}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Capabilities Grid */}
      <div className="grid grid-cols-2 gap-3">
        {capabilities.map((cap) => (
          <div
            key={cap.id}
            onClick={() => {
              if (cap.id === 'text_generation') setActiveTab('text');
              if (cap.id === 'image_generation') setActiveTab('image');
              if (cap.id === 'video_generation') setActiveTab('video');
              if (['image_analysis', 'video_analysis', 'audio_analysis'].includes(cap.id)) setActiveTab('analysis');
              if (cap.id === 'grounding') setActiveTab('grounding');
              if (cap.id === 'code_execution') setActiveTab('code');
            }}
            className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all group"
          >
            <div className={`w-10 h-10 ${CAPABILITY_COLORS[cap.id]} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{cap.name}</h4>
            <p className="text-xs text-slate-500 mt-1">{cap.description}</p>
            <div className="flex items-center gap-1 mt-2 text-blue-500 text-xs">
              <ArrowRightIcon className="w-3 h-3" />
              <span>Wypróbuj</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTextTab = () => (
    <div className="space-y-4">
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
        <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-1">📝 Generowanie tekstu</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Generuj treści z zaawansowanym reasoningiem. Możesz włączyć grounding (Google Search) i wykonanie kodu.
        </p>
      </div>

      <div className="flex gap-2">
        <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={useGrounding}
            onChange={(e) => setUseGrounding(e.target.checked)}
            className="rounded"
          />
          <GlobeIcon className="w-4 h-4 text-cyan-500" />
          <span className="text-sm">Google Search</span>
        </label>
        <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={useCodeExecution}
            onChange={(e) => setUseCodeExecution(e.target.checked)}
            className="rounded"
          />
          <span className="text-red-500 font-mono font-bold">&lt;/&gt;</span>
          <span className="text-sm">Wykonaj kod</span>
        </label>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Wpisz prompt... np. 'Napisz post o AI w marketingu z najnowszymi danymi'"
        className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        onClick={() => handleGenerate('text')}
        disabled={isLoading || !prompt.trim()}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl disabled:opacity-50"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <SparklesIcon className="w-5 h-5" />
        )}
        Generuj tekst
      </button>

      {result?.groundingInfo && (
        <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl">
          <h4 className="font-medium text-cyan-900 dark:text-cyan-200 mb-2">
            🔍 Źródła (Google Search)
          </h4>
          <div className="space-y-2">
            {result.groundingInfo.sources.map((source, i) => (
              <a
                key={`source-${source.url}`}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 bg-white dark:bg-slate-800 rounded-lg hover:bg-slate-50"
              >
                <p className="text-sm font-medium text-blue-600">{source.title}</p>
                <p className="text-xs text-slate-500 truncate">{source.url}</p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderImageTab = () => (
    <div className="space-y-4">
      <div className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-xl">
        <h3 className="font-bold text-pink-900 dark:text-pink-200 mb-1">🎨 Generowanie obrazów (Imagen 3)</h3>
        <p className="text-sm text-pink-700 dark:text-pink-300">
          Generuj fotorealistyczne i artystyczne obrazy bezpośrednio przez Gemini.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Styl</label>
          <select
            value={imageStyle}
            onChange={(e) => setImageStyle(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
          >
            <option value="photorealistic">Fotorealistyczny</option>
            <option value="anime">Anime/Manga</option>
            <option value="digital_art">Digital Art</option>
            <option value="oil_painting">Oil Painting</option>
            <option value="watercolor">Watercolor</option>
            <option value="3d">3D Render</option>
            <option value="sketch">Sketch</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Ratio</label>
          <select
            value={imageAspectRatio}
            onChange={(e) => setImageAspectRatio(e.target.value)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
          >
            <option value="1:1">1:1 (Square)</option>
            <option value="16:9">16:9 (Wide)</option>
            <option value="9:16">9:16 (Vertical)</option>
            <option value="4:3">4:3 (Classic)</option>
          </select>
        </div>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Opisz obraz... np. 'Futuristic city at sunset with flying cars, neon lights, cyberpunk style'"
        className="w-full h-24 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none"
      />

      <button
        onClick={() => handleGenerate('image')}
        disabled={isLoading || !prompt.trim()}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl disabled:opacity-50"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <PhotoIcon className="w-5 h-5" />
        )}
        Generuj obraz
      </button>
    </div>
  );

  const renderVideoTab = () => (
    <div className="space-y-4">
      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
        <h3 className="font-bold text-purple-900 dark:text-purple-200 mb-1">🎬 Generowanie wideo (Veo 2)</h3>
        <p className="text-sm text-purple-700 dark:text-purple-300">
          Generuj filmowe wideo z płynnym ruchem i profesjonalną kompozycją.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Długość</label>
          <select
            value={videoDuration}
            onChange={(e) => setVideoDuration(Number(e.target.value) as 4 | 8 | 10)}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
          >
            <option value={4}>4 sekundy</option>
            <option value={8}>8 sekund</option>
            <option value={10}>10 sekund</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Ratio</label>
          <select
            value={videoAspectRatio}
            onChange={(e) => setVideoAspectRatio(e.target.value as '16:9' | '9:16')}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
          >
            <option value="16:9">16:9 (Wide)</option>
            <option value="9:16">9:16 (Vertical)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Ruch</label>
          <select
            value={videoMotion}
            onChange={(e) => setVideoMotion(e.target.value as 'low' | 'medium' | 'high')}
            className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
          >
            <option value="low">Spokojny</option>
            <option value="medium">Średni</option>
            <option value="high">Dynamiczny</option>
          </select>
        </div>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Opisz wideo... np. 'Aerial shot of a bustling Tokyo street at night, neon signs reflecting on wet pavement, slow camera drift'"
        className="w-full h-24 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none"
      />

      <button
        onClick={() => handleGenerate('video')}
        disabled={isLoading || !prompt.trim()}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl disabled:opacity-50"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <VideoCameraIcon className="w-5 h-5" />
        )}
        Generuj wideo ({videoDuration}s)
      </button>
    </div>
  );

  const renderAnalysisTab = () => (
    <div className="space-y-4">
      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
        <h3 className="font-bold text-green-900 dark:text-green-200 mb-1">🔍 Analiza multimodalna</h3>
        <p className="text-sm text-green-700 dark:text-green-300">
          Analizuj obrazy i wideo natywnie. Rozpoznawanie obiektów, OCR, style, transkrypcja.
        </p>
      </div>

      {/* Upload */}
      <div className="flex gap-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 p-4 border-2 border-dashed rounded-xl transition-all ${
            uploadedImage ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-slate-300 hover:border-green-400'
          }`}
        >
          <PhotoIcon className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-center">{uploadedImage ? '✓ Obraz załadowany' : 'Kliknij lub przeciągnij obraz'}</p>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileUpload(e, 'image')}
          className="hidden"
        />

        <button
          onClick={() => videoInputRef.current?.click()}
          className={`flex-1 p-4 border-2 border-dashed rounded-xl transition-all ${
            uploadedVideo ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-slate-300 hover:border-green-400'
          }`}
        >
          <VideoCameraIcon className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm text-center">{uploadedVideo ? '✓ Wideo załadowane' : 'Kliknij lub przeciągnij wideo'}</p>
        </button>
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={(e) => handleFileUpload(e, 'video')}
          className="hidden"
        />
      </div>

      {/* Preview */}
      {uploadedImage && (
        <div className="relative">
          <img src={uploadedImage} alt="Preview" className="w-full max-h-64 object-contain rounded-xl bg-slate-900" />
          <button
            onClick={() => setUploadedImage(null)}
            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full"
          >
            <XMarkIcon className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      {uploadedVideo && (
        <div className="relative">
          <video src={uploadedVideo} controls className="w-full max-h-64 rounded-xl" />
          <button
            onClick={() => setUploadedVideo(null)}
            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full"
          >
            <XMarkIcon className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      <select
        value={analysisType}
        onChange={(e) => setAnalysisType(e.target.value)}
        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
      >
        <option value="describe">Szczegółowy opis</option>
        <option value="extract_text">OCR - Ekstrakcja tekstu</option>
        <option value="analyze_style">Analiza stylu wizualnego</option>
        <option value="creative_brief">Brief kreatywny</option>
      </select>

      <button
        onClick={() => handleGenerate('analysis')}
        disabled={isLoading || (!uploadedImage && !uploadedVideo)}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold rounded-xl disabled:opacity-50"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <ChartBarIcon className="w-5 h-5" />
        )}
        Analizuj
      </button>
    </div>
  );

  const renderGroundingTab = () => (
    <div className="space-y-4">
      <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl">
        <h3 className="font-bold text-cyan-900 dark:text-cyan-200 mb-1">🔍 Google Search Grounding</h3>
        <p className="text-sm text-cyan-700 dark:text-cyan-300">
          Generuj treści z aktualnymi danymi z Google Search. Zawiera cytowania źródeł.
        </p>
      </div>

      <div className="flex items-center gap-2 p-3 bg-cyan-100 dark:bg-cyan-900/40 rounded-lg">
        <GlobeIcon className="w-5 h-5 text-cyan-600" />
        <span className="text-sm font-medium text-cyan-800 dark:text-cyan-200">
          Google Search jest włączony automatycznie
        </span>
      </div>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Zadaj pytanie wymagające aktualnych danych... np. 'Jakie są najnowsze trendy w AI marketingu w 2026?'"
        className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none"
      />

      <button
        onClick={() => handleGenerate('grounding')}
        disabled={isLoading || !prompt.trim()}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-xl disabled:opacity-50"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <GlobeIcon className="w-5 h-5" />
        )}
        Generuj z Google Search
      </button>
    </div>
  );

  const renderCodeTab = () => (
    <div className="space-y-4">
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
        <h3 className="font-bold text-red-900 dark:text-red-200 mb-1">💻 Code Execution</h3>
        <p className="text-sm text-red-700 dark:text-red-300">
          Gemini generuje kod, wykonuje go i zwraca wyniki. Python, JS, SQL i więcej.
        </p>
      </div>

      <select
        value={codeLanguage}
        onChange={(e) => setCodeLanguage(e.target.value)}
        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
      >
        <option value="javascript">JavaScript</option>
        <option value="python">Python</option>
        <option value="typescript">TypeScript</option>
        <option value="sql">SQL</option>
      </select>

      <textarea
        value={codeInput || prompt}
        onChange={(e) => setCodeInput(e.target.value)}
        placeholder="Opisz co ma zrobić kod... np. 'Napisz funkcję do obliczania ROI kampanii marketingowej z przykładowymi danymi'"
        className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl resize-none font-mono text-sm"
      />

      <button
        onClick={() => handleGenerate('code')}
        disabled={isLoading || !(codeInput || prompt).trim()}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-xl disabled:opacity-50"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <ArrowRightIcon className="w-5 h-5" />
        )}
        Generuj i wykonaj kod
      </button>
    </div>
  );

  const renderResult = () => {
    if (!result) return null;

    return (
      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
            <span className="font-medium text-slate-900 dark:text-white">
              Wygenerowano przez {modelInfo.name}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Input: {result.tokensUsed.input}</span>
            <span>Output: {result.tokensUsed.output}</span>
            <span>Total: {result.tokensUsed.total}</span>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Wynik:</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
            >
              {copied ? (
                <CheckCircleIcon className="w-4 h-4" />
              ) : (
                <ClipboardIcon className="w-4 h-4" />
              )}
              {copied ? 'Skopiowano!' : 'Kopiuj'}
            </button>
          </div>
          <div className="whitespace-pre-wrap text-slate-900 dark:text-white text-sm leading-relaxed">
            {result.text}
          </div>
        </div>

        {/* Code execution results */}
        {result.codeExecution && (
          <div className="space-y-2">
            <div className="p-4 bg-slate-900 rounded-xl">
              <p className="text-xs text-slate-400 mb-2">📝 Kod:</p>
              <pre className="text-xs text-green-400 overflow-x-auto">
                <code>{result.codeExecution.code}</code>
              </pre>
            </div>
            <div className="p-4 bg-slate-800 rounded-xl">
              <p className="text-xs text-slate-400 mb-2">▶️ Wynik:</p>
              <pre className="text-xs text-blue-400 overflow-x-auto">
                {result.codeExecution.output}
              </pre>
            </div>
          </div>
        )}

        {/* Function calls */}
        {result.functionCalls && result.functionCalls.length > 0 && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-2">
              🔧 Wywołania funkcji:
            </p>
            {result.functionCalls.map((call, i) => (
              <div key={`warning-${i}`} className="text-xs text-amber-700 dark:text-amber-300">
                {call.name}({JSON.stringify(call.arguments)})
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-xl">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Gemini 2.0 (Omni)
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tekst • Obraz • Wideo • Audio • Kod
            </p>
          </div>
        </div>
        <div className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold rounded-full">
          {modelInfo.name}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'capabilities', label: 'Możliwości', icon: CollectionIcon },
          { id: 'text', label: 'Tekst', icon: SparklesIcon },
          { id: 'image', label: 'Obraz', icon: PhotoIcon },
          { id: 'video', label: 'Wideo', icon: VideoCameraIcon },
          { id: 'analysis', label: 'Analiza', icon: ChartBarIcon },
          { id: 'grounding', label: 'Grounding', icon: GlobeIcon },
          { id: 'code', label: 'Kod', icon: ArrowRightIcon },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as OmniTab)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium text-sm transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'capabilities' && renderCapabilitiesTab()}
      {activeTab === 'text' && renderTextTab()}
      {activeTab === 'image' && renderImageTab()}
      {activeTab === 'video' && renderVideoTab()}
      {activeTab === 'analysis' && renderAnalysisTab()}
      {activeTab === 'grounding' && renderGroundingTab()}
      {activeTab === 'code' && renderCodeTab()}

      {/* Result */}
      {renderResult()}
    </div>
  );
};

export default GeminiOmniPanel;
