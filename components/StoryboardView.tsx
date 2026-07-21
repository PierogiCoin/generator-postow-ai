import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { useTranslation } from 'react-i18next';
import type { Scene } from '../types';
import { generateStoryboard, generateVideoFromText, getVideoOperationStatus, generateSpeech, type VideoOperation } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';
import { SparklesIcon } from './icons/SparklesIcon';
import { FilmIcon } from './icons/FilmIcon';
import { VideoPlayer } from './VideoPlayer';
import { SpeakerWaveIcon } from './icons/SpeakerWaveIcon';

import { ModernButton } from './ui/ModernButton';
import { ModernCard } from './ui/ModernCard';
import { ModernInput } from './ui/ModernInput';

// Audio Context for playing TTS narration
const outputAudioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)({ sampleRate: 24000 });
const outputNode = outputAudioContext.createGain();
outputNode.connect(outputAudioContext.destination);
let currentAudioSource: AudioBufferSourceNode | null = null;

const SceneCard: React.FC<{
    scene: Scene;
    index: number;
    onGenerateVideo: (scene: Scene) => void;
    onPlayNarration: (scene: Scene) => void;
    videoUrl?: string;
    isGeneratingVideo?: boolean;
    isGeneratingAudio?: boolean;
}> = ({ scene, index, onGenerateVideo, onPlayNarration, videoUrl, isGeneratingVideo, isGeneratingAudio }) => {
    const { t } = useTranslation();
    return (
        <div
            className="animate-fade-in-up"
            style={{ animationDelay: `${index * 0.15}s`, animationFillMode: 'both' }}
        >
            <ModernCard hover glass padding="lg" className="relative overflow-hidden group">
                {/* Scene Badge */}
                <div className="absolute top-0 right-0 p-4">
                    <span className="px-3 py-1 bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest rounded-full border border-blue-500/20">
                        {t('storyboard.sceneHeader', { number: scene.sceneNumber })}
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
                    <div className="space-y-4">
                        <div>
                            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                                {t('storyboard.visualDescription')}
                            </h4>
                            <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-950/50 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800 leading-relaxed min-h-[100px]">
                                {scene.visualDescription}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <ModernButton
                                onClick={() => onPlayNarration(scene)}
                                disabled={isGeneratingAudio}
                                loading={isGeneratingAudio}
                                variant="ghost"
                                size="sm"
                                className="text-xs font-bold"
                                icon={<SpeakerWaveIcon className="w-4 h-4" />}
                            >
                                {isGeneratingAudio ? t('storyboard.playingNarration') : t('storyboard.playNarration')}
                            </ModernButton>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                                {t('storyboard.narration')}
                            </h4>
                            <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-950/50 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800 italic leading-relaxed min-h-[100px]">
                                "{scene.narrationText}"
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-800/50">
                    {videoUrl ? (
                        <div className="animate-fade-in">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm font-bold text-green-600 dark:text-green-400 flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    {t('storyboard.videoReady')}
                                </p>
                            </div>
                            <div className="aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xl group/player relative">
                                <VideoPlayer src={videoUrl} />
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-md mx-auto">
                            <ModernButton
                                onClick={() => onGenerateVideo(scene)}
                                disabled={isGeneratingVideo}
                                loading={isGeneratingVideo}
                                variant="gradient"
                                fullWidth
                                size="lg"
                                icon={<FilmIcon className="w-5 h-5" />}
                            >
                                {isGeneratingVideo ? t('storyboard.generatingVideo') : t('storyboard.generateVideo')}
                            </ModernButton>
                            {isGeneratingVideo && (
                                <p className="text-[10px] text-center text-slate-400 mt-3 animate-pulse font-medium uppercase tracking-tighter">
                                    AI is crafting your visual scene... this might take a minute
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </ModernCard>
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
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Failed to generate storyboard.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateVideo = useCallback(async (scene: Scene) => {
        setVideoStates(prev => ({ ...prev, [scene.sceneNumber]: { isLoading: true, url: null } }));
        try {
            if (!user) throw new Error('Musisz być zalogowany, aby generować wideo.');
            let operation: VideoOperation = await generateVideoFromText(scene.visualDescription, '16:9', user.id);
            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 5000)); // Reduced interval for better feel
                operation = await getVideoOperationStatus(operation, user.id);
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!downloadLink) throw new Error("Video generation finished, but no download link was provided.");

            const videoResponse = await fetch(`${downloadLink}&key=${import.meta.env.VITE_GEMINI_API_KEY}`);
            if (!videoResponse.ok) throw new Error("Failed to download the generated video.");

            const videoBlob = await videoResponse.blob();
            const videoUrl = URL.createObjectURL(videoBlob);

            setVideoStates(prev => ({ ...prev, [scene.sceneNumber]: { isLoading: false, url: videoUrl } }));

        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Unknown error');
            setVideoStates(prev => ({ ...prev, [scene.sceneNumber]: { isLoading: false, url: null } }));
        }
    }, [user]);

    const handlePlayNarration = useCallback(async (scene: Scene) => {
        if (currentAudioSource) {
            currentAudioSource.stop();
            currentAudioSource = null;
        }

        setAudioStates(prev => ({ ...prev, [scene.sceneNumber]: { isLoading: true } }));
        try {
            if (!user) throw new Error('Musisz być zalogowany, aby generować narrację.');
            const base64Audio = await generateSpeech(scene.narrationText, user.id);
            if (!base64Audio) return;

            const audioBuffer = await decodeAudioData(decode(base64Audio as string), outputAudioContext, 24000, 1);

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

        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Unknown error');
        } finally {
            setAudioStates(prev => ({ ...prev, [scene.sceneNumber]: { isLoading: false } }));
        }
    }, [user]);

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-12 min-h-screen">
            <header className="space-y-3 animate-fade-in-down max-w-2xl">
                <p
                    className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: 'var(--hero-accent)' }}
                >
                    {t('storyboard.ai')}
                </p>
                <h1 className="font-display text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {t('storyboard.title')}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg leading-relaxed">
                    {t('storyboard.subtitle')}
                </p>
            </header>

            <ModernCard glass padding="lg" className="border-white/20 dark:border-slate-800 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="flex flex-col md:flex-row gap-4">
                    <ModernInput
                        type="text"
                        value={topic}
                        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setTopic(e.target.value)}
                        placeholder={t('storyboard.topicPlaceholder')}
                        className="flex-grow text-lg"
                        fullWidth
                    />
                    <ModernButton
                        onClick={handleGenerateScenes}
                        disabled={isLoading || !topic.trim()}
                        loading={isLoading}
                        icon={<SparklesIcon className="w-6 h-6" />}
                        size="lg"
                        className="md:w-auto w-full px-10"
                        variant="gradient"
                    >
                        {isLoading ? t('storyboard.generatingScenes') : t('storyboard.generateScenes')}
                    </ModernButton>
                </div>
                {error && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-bold flex items-center gap-2 animate-shake">
                        <span className="w-2 h-2 bg-red-500 rounded-full" />
                        {error}
                    </div>
                )}
            </ModernCard>

            <div className="grid grid-cols-1 gap-6 pb-20">
                {scenes.map((scene, idx) => (
                    <SceneCard
                        key={scene.sceneNumber}
                        scene={scene}
                        index={idx}
                        onGenerateVideo={handleGenerateVideo}
                        onPlayNarration={handlePlayNarration}
                        videoUrl={videoStates[scene.sceneNumber]?.url || undefined}
                        isGeneratingVideo={videoStates[scene.sceneNumber]?.isLoading || false}
                        isGeneratingAudio={audioStates[scene.sceneNumber]?.isLoading || false}
                    />
                ))}
            </div>

            {scenes.length === 0 && !isLoading && (
                <div className="text-center py-20 opacity-20 animate-fade-in grayscale">
                    <FilmIcon className="w-32 h-32 mx-auto mb-4" />
                    <p className="text-2xl font-black uppercase tracking-widest">{t('storyboard.emptyState') || 'Nothing here yet'}</p>
                </div>
            )}
        </div>
    );
};