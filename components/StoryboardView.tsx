import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { useTranslation } from 'react-i18next';
import type { Scene } from '../types';
import { generateStoryboard, generateVideoFromText, getVideoOperationStatus, generateSpeech } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { SparklesIcon } from './icons/SparklesIcon';
import { FilmIcon } from './icons/FilmIcon';
import { VideoPlayer } from './VideoPlayer';
import { SpeakerWaveIcon } from './icons/SpeakerWaveIcon';

// Audio Context for playing TTS narration
const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
const outputNode = outputAudioContext.createGain();
outputNode.connect(outputAudioContext.destination);
let currentAudioSource: AudioBufferSourceNode | null = null;

const SceneCard: React.FC<{
  scene: Scene;
  onGenerateVideo: (scene: Scene) => void;
  onPlayNarration: (scene: Scene) => void;
  videoUrl?: string;
  isGeneratingVideo?: boolean;
  isGeneratingAudio?: boolean;
}> = ({ scene, onGenerateVideo, onPlayNarration, videoUrl, isGeneratingVideo, isGeneratingAudio }) => {
    const { t } = useTranslation();
    return (
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('storyboard.sceneHeader', { number: scene.sceneNumber })}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-sm text-slate-500 dark:text-slate-400 mb-2">{t('storyboard.visualDescription')}</h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md">{scene.visualDescription}</p>
                </div>
                <div>
                    <h4 className="font-semibold text-sm text-slate-500 dark:text-slate-400 mb-2">{t('storyboard.narration')}</h4>
                    <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-md italic">"{scene.narrationText}"</p>
                </div>
            </div>
             <div className="flex flex-col md:flex-row gap-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                <div className="md:w-1/2">
                    {videoUrl ? (
                        <div>
                            <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">{t('storyboard.videoReady')}</p>
                            <div className="aspect-video rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600">
                                <VideoPlayer src={videoUrl} />
                            </div>
                        </div>
                    ) : (
                        <button onClick={() => onGenerateVideo(scene)} disabled={isGeneratingVideo} className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 transition disabled:opacity-50">
                            {isGeneratingVideo ? t('storyboard.generatingVideo') : t('storyboard.generateVideo')}
                        </button>
                    )}
                </div>
                <div className="md:w-1/2">
                     <button onClick={() => onPlayNarration(scene)} disabled={isGeneratingAudio} className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-2 px-4 rounded-md hover:bg-purple-700 transition disabled:opacity-50">
                        <SpeakerWaveIcon className="w-5 h-5" />
                        {isGeneratingAudio ? t('storyboard.playingNarration') : t('storyboard.playNarration')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const StoryboardView: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useNotifications();
  const { t } = useTranslation();
  const [topic, setTopic] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoStates, setVideoStates] = useState<Record<number, { isLoading: boolean; url: string | null }>>({});
  const [audioStates, setAudioStates] = useState<Record<number, { isLoading: boolean }>>({});

  const handleGenerateScenes = async () => {
    if (!topic.trim() || !user) return;
    setIsLoading(true);
    setError(null);
    setScenes([]);
        try {
            const result = await generateStoryboard(topic, user.id);
      setScenes(result);
    } catch (e: any) {
      setError(e.message || 'Failed to generate storyboard.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateVideo = useCallback(async (scene: Scene) => {
    setVideoStates(prev => ({ ...prev, [scene.sceneNumber]: { isLoading: true, url: null } }));
    try {
                if (!user) throw new Error('Musisz być zalogowany, aby generować wideo.');
                let operation = await generateVideoFromText(scene.visualDescription, '16:9', user.id);
                while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
                        operation = await getVideoOperationStatus(operation, user.id);
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (!downloadLink) throw new Error("Video generation finished, but no download link was provided.");
        
    const videoResponse = await fetch(`${downloadLink}&key=${import.meta.env.VITE_GEMINI_API_KEY}`);
        if (!videoResponse.ok) throw new Error("Failed to download the generated video.");

        const videoBlob = await videoResponse.blob();
        const videoUrl = URL.createObjectURL(videoBlob);

        setVideoStates(prev => ({ ...prev, [scene.sceneNumber]: { isLoading: false, url: videoUrl } }));

    } catch (e: any) {
        setError(e.message);
        setVideoStates(prev => ({ ...prev, [scene.sceneNumber]: { isLoading: false, url: null } }));
    }
  }, []);

  const handlePlayNarration = useCallback(async (scene: Scene) => {
    if (currentAudioSource) {
        currentAudioSource.stop();
        currentAudioSource = null;
    }

    setAudioStates(prev => ({ ...prev, [scene.sceneNumber]: { isLoading: true } }));
    try {
        if (!user) throw new Error('Musisz być zalogowany, aby generować narrację.');
        const base64Audio = await generateSpeech(scene.narrationText, user.id);
        const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
        
        const source = outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(outputNode);
        source.start();
        currentAudioSource = source;
        source.onended = () => {
            if (currentAudioSource === source) {
                currentAudioSource = null;
            }
        };

    } catch (e: any) {
        setError(e.message);
    } finally {
        setAudioStates(prev => ({ ...prev, [scene.sceneNumber]: { isLoading: false } }));
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center">
            <FilmIcon className="w-16 h-16 mx-auto text-blue-500 mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('storyboard.title')}</h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">{t('storyboard.subtitle')}</p>
        </div>
        <div className="p-6 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg">
            <label htmlFor="topic-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('storyboard.topicLabel')}</label>
            <div className="flex flex-col sm:flex-row gap-4">
                <input
                    type="text"
                    id="topic-input"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder={t('storyboard.topicPlaceholder')}
                    className="flex-grow w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
                <button
                    onClick={handleGenerateScenes}
                    disabled={isLoading || !topic.trim()}
                    className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <SparklesIcon className="w-5 h-5" />
                    {isLoading ? t('storyboard.generatingScenes') : t('storyboard.generateScenes')}
                </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </div>

        <div className="space-y-6">
            {scenes.map(scene => (
                <SceneCard
                    key={scene.sceneNumber}
                    scene={scene}
                    onGenerateVideo={handleGenerateVideo}
                    onPlayNarration={handlePlayNarration}
                    videoUrl={videoStates[scene.sceneNumber]?.url || undefined}
                    isGeneratingVideo={videoStates[scene.sceneNumber]?.isLoading || false}
                    isGeneratingAudio={audioStates[scene.sceneNumber]?.isLoading || false}
                />
            ))}
        </div>
    </div>
  );
};