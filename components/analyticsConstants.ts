import type { AIInsight } from '../types';
import { ThumbsUpIcon } from './icons/ThumbsUpIcon';
import { LightbulbIcon } from './icons/LightbulbIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import React from 'react';

export const insightConfig: Record<AIInsight['type'], { icon: React.FC<React.SVGProps<SVGSVGElement>>; color: string; iconColor: string }> = {
  positive: { icon: ThumbsUpIcon, color: 'border-l-4 border-green-500 bg-green-50 dark:bg-green-900/30', iconColor: 'text-green-500' },
  suggestion: { icon: LightbulbIcon, color: 'border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/30', iconColor: 'text-blue-500' },
  observation: { icon: ChartBarIcon, color: 'border-l-4 border-gray-500 bg-gray-50 dark:bg-gray-800/30', iconColor: 'text-gray-500' },
};
