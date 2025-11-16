import React from 'react';
import type { SentimentAnalysisResult } from '../types';
import { ChartPieIcon } from './icons/ChartPieIcon';
import { SentimentPositiveIcon } from './icons/SentimentPositiveIcon';
import { SentimentNeutralIcon } from './icons/SentimentNeutralIcon';
import { SentimentNegativeIcon } from './icons/SentimentNegativeIcon';

interface SentimentDisplayProps {
  result: SentimentAnalysisResult | null;
  isLoading: boolean;
}

export const SentimentDisplay: React.FC<SentimentDisplayProps> = ({ result, isLoading }) => {
    if (isLoading) {
        return (
            <div className="mt-2">
                <h3 className="font-semibold text-base text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
                    <ChartPieIcon className="w-5 h-5 text-gray-400" />
                    Analiza sentymentu
                </h3>
                <div className="h-24 bg-gray-200 dark:bg-gray-700/50 rounded-lg animate-pulse"></div>
            </div>
        );
    }
    
    if (!result) return null;
    
    const sentimentConfig = {
        'Pozytywny': {
            icon: SentimentPositiveIcon,
            color: 'text-green-500 dark:text-green-400',
            bgColor: 'bg-green-100 dark:bg-green-900/50',
            label: 'Pozytywny'
        },
        'Neutralny': {
            icon: SentimentNeutralIcon,
            color: 'text-gray-500 dark:text-gray-400',
            bgColor: 'bg-gray-100 dark:bg-gray-700/50',
            label: 'Neutralny'
        },
        'Negatywny': {
            icon: SentimentNegativeIcon,
            color: 'text-red-500 dark:text-red-400',
            bgColor: 'bg-red-100 dark:bg-red-900/50',
            label: 'Negatywny'
        },
    };

    const config = sentimentConfig[result.sentiment];
    if (!config) return null;
    
    const Icon = config.icon;

    return (
        <div className="mt-2">
             <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-400 flex items-center gap-2 mb-2">
                <ChartPieIcon className="w-4 h-4" />
                Sentyment
            </h3>
            <div className={`flex items-center justify-between gap-4 p-4 rounded-lg ${config.bgColor}`}>
                <div className="flex items-center gap-3">
                    <Icon className={`w-7 h-7 ${config.color}`} />
                    <div>
                        <p className={`font-bold text-lg ${config.color}`}>{config.label}</p>
                    </div>
                </div>
                <div className="text-right" title="Wynik na podstawie analizy słów kluczowych">
                    <p className="text-2xl font-bold text-gray-800 dark:text-white">{result.score}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Wynik</p>
                </div>
            </div>
        </div>
    );
};