import React, { useState } from 'react';
import type { SEOAnalysisResult } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ClipboardIcon } from './icons/ClipboardIcon';

interface SEOAnalysisDisplayProps {
  result: SEOAnalysisResult | null;
  isLoading: boolean;
}

const SEOScoreCircle: React.FC<{ score: number }> = ({ score }) => {
    const radius = 22;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    let colorClass = 'stroke-yellow-500';
    if (score >= 80) {
        colorClass = 'stroke-green-500';
    } else if (score < 50) {
        colorClass = 'stroke-red-500';
    }

    return (
        <div className="relative w-16 h-16">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 50 50">
                <circle className="text-gray-200 dark:text-gray-700" strokeWidth="5" stroke="currentColor" fill="transparent" r={radius} cx="25" cy="25" />
                <circle
                    className={`${colorClass} transition-all duration-1000 ease-in-out`}
                    strokeWidth="5"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="25"
                    cy="25"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-gray-800 dark:text-white">{score}</span>
            </div>
        </div>
    );
};


export const SEOAnalysisDisplay: React.FC<SEOAnalysisDisplayProps> = ({ result, isLoading }) => {
    const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedKeyword(text);
        setTimeout(() => setCopiedKeyword(null), 2000);
    };

    if (isLoading) {
        return (
            <div className="mt-2">
                <h3 className="font-semibold text-base text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
                    <SearchIcon className="w-5 h-5 text-gray-400" />
                    Analiza SEO
                </h3>
                <div className="h-40 bg-gray-200 dark:bg-gray-700/50 rounded-lg animate-pulse"></div>
            </div>
        );
    }
    
    if (!result) return null;

    return (
        <div className="mt-2">
             <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-400 flex items-center gap-2 mb-3">
                <SearchIcon className="w-4 h-4" />
                Analiza SEO
            </h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                <div className="flex items-center gap-4">
                    <SEOScoreCircle score={result.score} />
                    <div className="flex-grow space-y-2">
                         <div>
                            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300">Główne słowo kluczowe</h4>
                            <div className="mt-1">
                                <button onClick={() => handleCopy(result.mainKeyword)} className="group relative inline-flex items-center gap-2 px-3 py-1 text-sm font-bold bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full transition-colors hover:bg-blue-300 dark:hover:bg-blue-700">
                                    <span>{result.mainKeyword}</span>
                                </button>
                            </div>
                        </div>
                         <div>
                            <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300">Słowa drugorzędne</h4>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {result.secondaryKeywords.map(keyword => (
                                    <button key={keyword} onClick={() => handleCopy(keyword)} className="group relative px-2 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full transition-colors hover:bg-gray-300 dark:hover:bg-gray-600">
                                        <span>{keyword}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="text-xs font-semibold text-gray-600 dark:text-gray-300">Sugestie</h4>
                    <ul className="mt-1 space-y-1">
                        {result.suggestions.map((suggestion, index) => (
                            <li key={index} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                                <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                <span>{suggestion}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};