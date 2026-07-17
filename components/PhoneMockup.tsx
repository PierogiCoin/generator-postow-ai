import React, { useState } from 'react';
import { PostPreview } from './PostPreview';
import type { GenerationResult, FormData } from '../types';
import { Sun, Moon, Type, Smartphone, Compass } from 'lucide-react';

interface PhoneMockupProps {
    result: GenerationResult;
    formData: FormData;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({ result, formData }) => {
    const [phoneTheme, setPhoneTheme] = useState<'light' | 'dark'>('light');
    const [deviceType, setDeviceType] = useState<'ios' | 'android'>('ios');
    const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');

    const getFontSizeClass = () => {
        switch (fontSize) {
            case 'sm': return 'text-xs';
            case 'lg': return 'text-base';
            default: return 'text-sm';
        }
    };

    return (
        <div className="flex flex-col items-center py-6 space-y-6">
            {/* Control Panel */}
            <div className="flex flex-wrap items-center justify-center gap-3 bg-slate-100 dark:bg-slate-900/80 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
                {/* Theme Toggle */}
                <button
                    onClick={() => setPhoneTheme(prev => prev === 'light' ? 'dark' : 'light')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${phoneTheme === 'dark' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                    title="Przełącz motyw telefonu"
                >
                    {phoneTheme === 'light' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                    <span className="uppercase tracking-wider">{phoneTheme === 'light' ? 'Jasny' : 'Ciemny'}</span>
                </button>

                {/* Device Type Toggle */}
                <button
                    onClick={() => setDeviceType(prev => prev === 'ios' ? 'android' : 'ios')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                    title="Zmień system operacyjny"
                >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span className="uppercase tracking-wider">{deviceType === 'ios' ? 'iOS' : 'Android'}</span>
                </button>

                {/* Font Size Toggle */}
                <div className="flex items-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-0.5">
                    {(['sm', 'base', 'lg'] as const).map((sz) => (
                        <button
                            key={sz}
                            onClick={() => setFontSize(sz)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${fontSize === sz ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {sz === 'sm' ? 'A-' : sz === 'base' ? 'A' : 'A+'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Smartphone Mockup */}
            <div className="flex justify-center items-center perspective-1000">
                <div className="relative w-[340px] h-[680px] bg-slate-950 rounded-[3.2rem] border-[10px] border-slate-900 shadow-2xl overflow-hidden ring-1 ring-white/10 transform transition-all hover:rotate-y-3 hover:rotate-x-3 duration-500 group">
                    {/* Speaker & Notch / Camera hole */}
                    {deviceType === 'ios' ? (
                        <>
                            {/* iPhone Dynamic Island / Notch */}
                            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-900 rounded-full z-30 flex items-center justify-between px-4 ring-1 ring-white/5">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-900/80" />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Android Punch Hole Camera */}
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-4.5 h-4.5 bg-slate-900 rounded-full z-30 flex items-center justify-center ring-1 ring-white/5">
                                <div className="w-2 h-2 rounded-full bg-blue-900/60" />
                            </div>
                        </>
                    )}

                    {/* Status Bar */}
                    <div className={`absolute top-0 left-0 right-0 h-8 z-20 flex items-center justify-between px-6 text-[10px] font-bold ${phoneTheme === 'dark' ? 'text-white bg-slate-950/80' : 'text-slate-900 bg-white/80'} backdrop-blur-sm select-none`}>
                        <div>12:45</div>
                        <div className="flex items-center gap-1.5">
                            {/* Signal */}
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M2 22h20V2z" opacity="0.3"/><path d="M17 22H2V7z"/></svg>
                            {/* WiFi */}
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21l-12-18h24z"/></svg>
                            {/* Battery */}
                            <div className="w-5 h-2.5 border border-current rounded-sm p-0.5 flex items-center">
                                <div className="h-full w-3.5 bg-current rounded-2xs" />
                            </div>
                        </div>
                    </div>

                    {/* Screen Content Wrapper (Injected Dark Mode Class) */}
                    <div className={`absolute inset-0 overflow-y-auto no-scrollbar pt-10 pb-6 px-3 ${phoneTheme === 'dark' ? 'dark bg-slate-950' : 'bg-slate-50'}`}>
                        {/* Simulated App Bar */}
                        <div className="flex items-center justify-between px-2 py-2.5 border-b border-slate-100 dark:border-slate-800 mb-3 text-slate-800 dark:text-slate-200">
                            <span className="text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                                <Compass className="w-3.5 h-3.5 text-blue-500 animate-spin-slow" />
                                Podgląd Feed
                            </span>
                            <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Live</span>
                            </div>
                        </div>

                        <div className={getFontSizeClass()}>
                            <PostPreview
                                result={result}
                                formData={formData}
                                onUpdateResult={() => { }}
                                onAIAssistantAction={() => { }}
                                isAssistantLoading={false}
                                lite={true}
                            />
                        </div>
                    </div>

                    {/* Home Indicator Bar */}
                    <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-700/50 rounded-full z-30" />

                    {/* Glass Reflection Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none group-hover:from-white/10 transition-all duration-700" />

                    {/* Physical Buttons Mock */}
                    <div className="absolute left-[-10px] top-24 w-1 h-12 bg-slate-800 rounded-r-lg" />
                    <div className="absolute left-[-10px] top-40 w-1 h-16 bg-slate-800 rounded-r-lg" />
                    <div className="absolute right-[-10px] top-32 w-1 h-20 bg-slate-800 rounded-l-lg" />
                </div>
            </div>

            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .rotate-y-3 { transform: rotateY(3deg); }
                .rotate-x-3 { transform: rotateX(1deg); }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default PhoneMockup;

