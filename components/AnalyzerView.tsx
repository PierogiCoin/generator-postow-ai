import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GoogleGenAI } from '@google/genai';
import { analyzeImage, analyzeVideo, performComplexQuery } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { VideoCameraIcon } from './icons/VideoCameraIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';

type AnalyzerTab = 'image' | 'video' | 'complex';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = (error) => reject(error);
    });
};

export const AnalyzerView: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<AnalyzerTab>('image');
    const [prompt, setPrompt] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(selectedFile);
        }
    };
    
    const resetState = (tab: AnalyzerTab) => {
        setActiveTab(tab);
        setPrompt('');
        setFile(null);
        setPreview(null);
        setResult(null);
        setError(null);
    }

    const handleSubmit = async () => {
        if (!user || (!prompt && activeTab !== 'complex') || (activeTab !== 'complex' && !file)) return;
        
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            let analysisResult: string;
            if (activeTab === 'image' && file) {
                const base64Image = await fileToBase64(file);
                analysisResult = await analyzeImage(base64Image, file.type, prompt, user.id);
            } else if (activeTab === 'video' && file) {
                const base64Video = await fileToBase64(file);
                analysisResult = await analyzeVideo(base64Video, file.type, prompt, user.id);
            } else if (activeTab === 'complex') {
                analysisResult = await performComplexQuery(prompt, user.id);
            } else {
                throw new Error("Invalid state for analysis.");
            }
            setResult(analysisResult);
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : "An error occurred during analysis.";
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const tabs = [
        { id: 'image', label: 'Image Analysis', icon: PhotoIcon },
        { id: 'video', label: 'Video Analysis', icon: VideoCameraIcon },
        { id: 'complex', label: 'Thinking Mode', icon: LightbulbIcon },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div>
                <p
                    className="text-[11px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: 'var(--hero-accent)' }}
                >
                    Insights
                </p>
                <h1 className="mt-2 font-display text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    AI Analyzer
                </h1>
                <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm md:text-base leading-relaxed max-w-xl">
                    Get deep insights from your media or solve complex problems with Gemini.
                </p>
            </div>

            <div className="bg-white/70 dark:bg-[#0a1220]/70 border border-slate-200/80 dark:border-white/10">
                <div className="p-2 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-2 flex-wrap">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => resetState(tab.id as AnalyzerTab)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                                    activeTab === tab.id
                                    ? 'text-white'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                                style={activeTab === tab.id ? { backgroundColor: 'var(--hero-accent)' } : undefined}
                            >
                                <tab.icon className="w-5 h-5"/>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6 space-y-6">
                    {activeTab !== 'complex' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Upload {activeTab === 'image' ? 'Image' : 'Video'}
                            </label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    {preview ? (
                                        activeTab === 'image' ? (
                                            <img src={preview} alt="Preview" className="mx-auto h-32 rounded-lg" />
                                        ) : (
                                            <video src={preview} controls className="mx-auto h-32 rounded-lg" />
                                        )
                                    ) : (
                                        <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                                    )}
                                    <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800/50 rounded-md font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 focus-within:outline-none">
                                            <span>Upload a file</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept={activeTab === 'image' ? 'image/*' : 'video/*'}/>
                                        </label>
                                        <p className="pl-1">or drag and drop</p>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-500">
                                        {activeTab === 'image' ? 'PNG, JPG, GIF up to 10MB' : 'MP4, MOV, WEBM up to 50MB'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {activeTab === 'complex' ? 'Enter your complex query' : `What do you want to know about this ${activeTab}?`}
                        </label>
                        <textarea
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            rows={activeTab === 'complex' ? 8 : 3}
                            placeholder={
                                activeTab === 'image' ? 'e.g., Describe this image in detail.' :
                                activeTab === 'video' ? 'e.g., Summarize this video and list key moments.' :
                                'e.g., Explain the theory of relativity as if I were a ten-year-old.'
                            }
                            className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-blue-500 transition"
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || !prompt.trim() || (activeTab !== 'complex' && !file)}
                            className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2.5 px-6 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            <SparklesIcon className="w-5 h-5" />
                            {isLoading ? 'Analyzing...' : 'Analyze'}
                        </button>
                    </div>
                    
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    
                    {(isLoading || result) && (
                         <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Result</h3>
                            {isLoading ? (
                                <div className="space-y-2 animate-pulse">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                </div>
                            ) : (
                                <div className="prose dark:prose-invert max-w-none text-sm whitespace-pre-wrap p-4 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                                    {result}
                                </div>
                            )}
                         </div>
                    )}
                </div>
            </div>
        </div>
    );
};