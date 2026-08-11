import React from 'react';
import { useTranslation } from 'react-i18next';
import { SparklesIcon } from '../icons/SparklesIcon';
import { Spinner, ProgressBar } from '../ui/LoadingStates';

export const VIDEO_GENERATION_STEPS = [
    "Tworzenie scenariusza wideo...",
    "Inicjowanie generowania wideo...",
    "Analizowanie monitu...",
    "Alokowanie zasobów GPU...",
    "Rozpoczynanie procesu renderowania...",
    "Generowanie klatek początkowych...",
    "Komponowanie sceny...",
    "Stosowanie stylu wizualnego...",
    "Renderowanie klatek pośrednich...",
    "Dodawanie szczegółów i tekstur...",
    "Finalizowanie sekwencji wideo...",
    "Prawie gotowe, przeprowadzanie ostatecznych sprawdzeń...",
    "Wideo wygenerowane pomyślnie!",
];

export const STANDARD_GENERATION_STEP_KEYS = [
    'progress.streaming_text',
    'progress.generating_details',
    'progress.analyzing_content',
    'progress.finalizing'
];

export const ResultCardLoadingState: React.FC<{ progressMessage: string | null }> = ({ progressMessage }) => {
    const { t } = useTranslation();

    let progress = 0;
    let displayMessage = progressMessage;
    let showProgressBar = false;

    const isVideoGeneration = progressMessage && VIDEO_GENERATION_STEPS.includes(progressMessage);
    const isStandardGeneration = progressMessage && STANDARD_GENERATION_STEP_KEYS.includes(progressMessage);

    if (isVideoGeneration) {
        const stepIndex = VIDEO_GENERATION_STEPS.indexOf(progressMessage);
        progress = Math.round(((stepIndex + 1) / VIDEO_GENERATION_STEPS.length) * 100);
        showProgressBar = true;
    } else if (isStandardGeneration) {
        const stepIndex = STANDARD_GENERATION_STEP_KEYS.indexOf(progressMessage);
        progress = Math.round(((stepIndex + 1) / STANDARD_GENERATION_STEP_KEYS.length) * 100);
        displayMessage = t(progressMessage); // Przetłumacz klucz
        showProgressBar = true;
    } else if (!progressMessage) {
        displayMessage = t('resultCard.pleaseWait');
    }

    return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full space-y-8 animate-fade-in">
            <div className="relative">
                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                <Spinner size="lg" className="relative z-10" />
                <SparklesIcon className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-bounce" />
            </div>

            <div className="space-y-4 max-w-sm relative z-10">
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{displayMessage}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">To może potrwać do kilkunastu sekund. Nasza AI właśnie tworzy dla Ciebie unikalną treść.</p>

                {showProgressBar && (
                    <ProgressBar
                        progress={progress}
                        className="mt-6"
                        showPercentage={true}
                    />
                )}
            </div>
        </div>
    );
};

export const ResultCardReadyState: React.FC = () => {
    const { t } = useTranslation();
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center h-full space-y-6 animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-tr from-purple-500/20 to-blue-500/20 rounded-3xl flex items-center justify-center relative">
                <SparklesIcon className="w-10 h-10 text-blue-500 animate-pulse" />
                <div className="absolute -inset-2 bg-gradient-to-tr from-purple-500/10 to-blue-500/10 blur-xl rounded-full" />
            </div>
            <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{t('resultCard.ready.title')}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xs">{t('resultCard.ready.subtitle')}</p>
            </div>
        </div>
    );
};
