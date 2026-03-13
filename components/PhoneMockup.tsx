import React from 'react';
import { PostPreview } from './PostPreview';
import type { GenerationResult, FormData } from '../types';

interface PhoneMockupProps {
    result: GenerationResult;
    formData: FormData;
}

export const PhoneMockup: React.FC<PhoneMockupProps> = ({ result, formData }) => {
    return (
        <div className="flex justify-center items-center py-10 perspective-1000">
            <div className="relative w-[320px] h-[640px] bg-slate-900 rounded-[3rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden ring-1 ring-white/10 transform transition-all hover:rotate-y-5 hover:rotate-x-5 duration-500 group">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-30" />

                {/* Screen Content */}
                <div className="absolute inset-0 bg-white dark:bg-slate-950 overflow-y-auto no-scrollbar pt-8 pb-4 px-2">
                    {/* App Header Mock */}
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
                        <span className="text-xs font-black dark:text-white uppercase tracking-tighter">Social AI</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    </div>

                    <PostPreview
                        result={result}
                        formData={formData}
                        onUpdateResult={() => { }}
                        onAIAssistantAction={() => { }}
                        isAssistantLoading={false}
                        lite={true} // Special mode for phone mockup
                    />
                </div>

                {/* Reflection Overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none group-hover:from-white/10 transition-all duration-700" />

                {/* Buttons Mock */}
                <div className="absolute left-[-10px] top-24 w-1 h-12 bg-slate-700 rounded-r-lg" />
                <div className="absolute right-[-10px] top-32 w-1 h-20 bg-slate-700 rounded-l-lg" />
            </div>

            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .rotate-y-5 { transform: rotateY(5deg); }
                .rotate-x-5 { transform: rotateX(2deg); }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};
