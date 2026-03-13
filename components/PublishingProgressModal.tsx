import React, { useState, useEffect } from 'react';
import { CheckCircle2, Loader2, Rocket, Share2, ShieldCheck, Globe, X } from 'lucide-react';
import { ModernButton } from './ui/ModernButton';

interface PublishingProgressModalProps {
    isOpen: boolean;
    onClose: () => void;
    platform: string;
}

const STEPS = [
    { id: 'auth', label: 'Weryfikacja uprawnień', icon: ShieldCheck },
    { id: 'media', label: 'Przesyłanie multimediów', icon: Share2 },
    { id: 'api', label: 'Łączenie z API platformy', icon: Globe },
    { id: 'final', label: 'Finalizacja publikacji', icon: Rocket }
];

export const PublishingProgressModal: React.FC<PublishingProgressModalProps> = ({ isOpen, onClose, platform }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        if (isOpen && !isComplete) {
            const timer = setInterval(() => {
                setCurrentStep(prev => {
                    if (prev >= STEPS.length - 1) {
                        clearInterval(timer);
                        setIsComplete(true);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1500);
            return () => clearInterval(timer);
        }
    }, [isOpen, isComplete]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] animate-fade-in p-4">
            <div className="bg-white dark:bg-slate-900 border border-white/10 rounded-[3rem] shadow-2xl p-8 w-full max-w-md relative overflow-hidden glass">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Publikowanie</h2>
                            <p className="text-xs font-black text-blue-500 uppercase tracking-widest mt-1">Platforma: {platform}</p>
                        </div>
                        {isComplete && (
                            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        )}
                    </div>

                    <div className="space-y-6">
                        {STEPS.map((step, idx) => {
                            const Icon = step.icon;
                            const isActive = idx === currentStep;
                            const isPast = idx < currentStep || isComplete;

                            return (
                                <div key={step.id} className={`flex items-center gap-4 transition-all duration-500 ${isActive ? 'scale-105' : isPast ? 'opacity-100' : 'opacity-30'}`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isPast ? 'bg-green-500 text-white' : isActive ? 'bg-blue-500 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                        {isPast && !isActive ? <CheckCircle2 className="w-6 h-6" /> : isActive ? <Loader2 className="w-6 h-6 animate-spin" /> : <Icon className="w-6 h-6" />}
                                    </div>
                                    <div className="flex-grow">
                                        <p className={`text-sm font-black uppercase tracking-tight ${isPast ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{step.label}</p>
                                        {isActive && <div className="h-1 bg-blue-500/20 rounded-full mt-2 overflow-hidden w-24">
                                            <div className="h-full bg-blue-500 animate-loading-bar" />
                                        </div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {isComplete && (
                        <div className="mt-10 animate-scale-in">
                            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex items-center gap-3 mb-6">
                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                                <p className="text-sm font-bold text-green-600 dark:text-green-400">Sukces! Twój post został opublikowany.</p>
                            </div>
                            <ModernButton onClick={onClose} variant="primary" fullWidth size="lg">
                                Zamknij
                            </ModernButton>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes loading-bar {
                    0% { width: 0%; transform: translateX(-100%); }
                    100% { width: 100%; transform: translateX(100%); }
                }
                .animate-loading-bar {
                    animation: loading-bar 1.5s infinite;
                    width: 100%;
                }
            `}</style>
        </div>
    );
};
