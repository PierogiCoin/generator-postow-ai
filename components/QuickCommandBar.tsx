import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useAppHandlers } from '../hooks/useAppHandlers';
import { useNotifications } from '../hooks/useNotifications';

import { SparklesIcon } from './icons/SparklesIcon';
import { executeCommand } from '../services/geminiService';
import type { ScheduledPost, FormData, GenerationResult, Platform } from '../types';
import { GenerationType, NotificationType } from '../types';


export const QuickCommandBar: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [command, setCommand] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { addToast } = useNotifications();
    const handlers = useAppHandlers(addToast, () => {});
    const { user } = useAuth();


    const handleCommand = async () => {
        if (!command.trim() || isLoading || !user) return;
        setIsLoading(true);
        setError(null);
        try {
            const result = await executeCommand(command, user.id);
            const functionCall = (result as unknown as { functionCalls?: Array<{ name: string; args: Record<string, unknown> }> }).functionCalls?.[0];

            if (functionCall) {
                const { name, args } = functionCall;
                switch (name) {
                    case 'navigateTo':
                        navigate(`/${args.view}`);
                        break;
                    case 'startNewPost':
                        navigate('/generator', { state: { prefillData: { ...args } } });
                        break;
                    case 'findTrend':
                        navigate('/trends', { state: { prefillNiche: args.niche } });
                        break;
                    case 'schedulePost': {
                        // FIX: Cast properties from `args` to their expected types, as they are of type `unknown`.
                        const scheduleTime = new Date(args.scheduleTime as string);
                        const content = args.content as string;
                        const platform = args.platform as Platform;

                        const dummyFormData: Partial<FormData> = { topic: content, platform: platform, generationType: GenerationType.PostWithImage };
                        const dummyResult: Partial<GenerationResult> = { postText: content, platform: platform, type: GenerationType.PostWithImage };

                        const newPost: ScheduledPost = {
                            id: crypto.randomUUID(),
                            userId: user.id,
                            teamId: user.currentTeamId || null,
                            formData: dummyFormData as FormData,
                            result: dummyResult as GenerationResult,
                            scheduleTimestamp: scheduleTime.getTime(),
                            status: 'scheduled',
                            approvalStatus: 'draft',
                            comments: [],
                            createdAt: Date.now(),
                        };
                        handlers.handleConfirmSchedule(newPost.scheduleTimestamp, [platform], [GenerationType.PostWithImage]);
                        addToast(t('quickCommand.scheduled', { platform: platform, time: scheduleTime.toLocaleString() }), NotificationType.Success);
                        break;
                    }
                    case 'publishPost': {
                        // Symulacja natychmiastowej publikacji
                        addToast(t('quickCommand.published', { platform: args.platform }), NotificationType.Success);
                        // Tutaj można by dodać do historii
                        break;
                    }
                    default:
                        // Unknown function - silently ignore
                }
                setCommand('');
            } else {
                setError("Nie udało mi się zrozumieć polecenia jako akcji. Spróbuj ponownie.");
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Wystąpił błąd podczas wykonywania polecenia.");
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="relative">
            <SparklesIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
                disabled={isLoading}
                placeholder="Co chcesz zrobić? np. 'zaplanuj post na X na jutro o 10:00: Hej!'"
                className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-full py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
            />
            {isLoading && (
                 <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                 </div>
            )}
            {error && <p className="text-xs text-red-500 text-center mt-2">{error}</p>}
        </div>
    );
};