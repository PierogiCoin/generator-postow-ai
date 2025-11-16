import React from 'react';
import type { CampaignPost } from '../types';
import { SparklesIcon } from './icons/SparklesIcon';
import { PostIcon } from './icons/PostIcon';
import { MegaphoneIcon } from './icons/MegaphoneIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { platformConfig } from '../config/platformConfig';

interface CampaignPostModalProps {
  post: CampaignPost | null;
  onClose: () => void;
  onGeneratePost: () => void;
}

export const CampaignPostModal: React.FC<CampaignPostModalProps> = ({ post, onClose, onGeneratePost }) => {
  if (!post) return null;

  const config = platformConfig[post.platform];
  const Icon = config.icon;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fade-in"
      style={{ animationDuration: '0.3s' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-lg m-4 transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Plan posta na Dzień {post.day}</h2>
                <div className="flex items-center gap-2 mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                    <Icon className="w-5 h-5" />
                    <span>{config.name}</span>
                </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">&times;</button>
        </div>
        
        <div className="mt-6 space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <h3 className="font-semibold text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2"><SparklesIcon className="w-4 h-4 text-purple-400"/> Cel strategiczny</h3>
                <p className="mt-1 text-slate-800 dark:text-slate-200">{post.strategicGoal}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <h3 className="font-semibold text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2"><PostIcon className="w-4 h-4 text-blue-400"/> Sugestia tematu</h3>
                <p className="mt-1 text-slate-800 dark:text-slate-200">{post.postSuggestion.topic}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <h3 className="font-semibold text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2"><PhotoIcon className="w-4 h-4 text-green-400"/> Pomysł na wizualizację</h3>
                <p className="mt-1 text-slate-800 dark:text-slate-200">{post.postSuggestion.visualIdea}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                <h3 className="font-semibold text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2"><MegaphoneIcon className="w-4 h-4 text-yellow-400"/> Sugerowane CTA</h3>
                <p className="mt-1 text-slate-800 dark:text-slate-200">{post.postSuggestion.cta}</p>
            </div>
        </div>

        <div className="flex justify-end gap-4 mt-8">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition"
          >
            Zamknij
          </button>
          <button
            onClick={onGeneratePost}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 transition flex items-center gap-2"
          >
            <SparklesIcon className="w-4 h-4"/>
            Generuj ten post
          </button>
        </div>
      </div>
    </div>
  );
};