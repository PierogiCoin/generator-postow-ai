import React from 'react';
import { Smartphone } from 'lucide-react';
import type { GenerationResult } from '../../types';
import { NotificationType } from '../../types';
import { GlobeIcon } from '../icons/GlobeIcon';
import { ClipboardIcon } from '../icons/ClipboardIcon';
import { StreamingText } from '../ui/StreamingText';

interface OmnichannelResultViewProps {
  result: GenerationResult;
  isLoading: boolean;
  previewMode: 'standard' | 'mobile';
  onTogglePreviewMode: () => void;
  onToast: (message: string, type: NotificationType) => void;
}

export const OmnichannelResultView: React.FC<OmnichannelResultViewProps> = ({
  result,
  isLoading,
  previewMode,
  onTogglePreviewMode,
  onToast,
}) => {
  const posts = result.omnichannelPosts ?? [];

  return (
    <div className="glass-premium border border-white/10 rounded-[2.5rem] shadow-2xl p-8 space-y-8 animate-fade-in-up">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <GlobeIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">
              Kampania Omnichannel
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {posts.length} postów wygenerowanych symultanicznie
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onTogglePreviewMode}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
            previewMode === 'mobile'
              ? 'bg-blue-500 text-white border-blue-400'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
          }`}
        >
          <Smartphone className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-widest">
            {previewMode === 'mobile' ? 'Widok Karty' : 'Podgląd Mobile'}
          </span>
        </button>
      </div>

      <div className="grid gap-6">
        {posts.map((post, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900/60 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 hover:border-blue-400/30 transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  {post.platform}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${post.postText}\n\n${post.hashtags.join(' ')}`);
                  onToast(`${post.platform}: Skopiowano!`, NotificationType.Success);
                }}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-blue-500"
              >
                <ClipboardIcon className="w-5 h-5" />
              </button>
            </div>
            <StreamingText
              text={post.postText}
              className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-4 whitespace-pre-wrap"
              active={isLoading}
              speed={idx * 5 + 20}
            />
            <div className="flex flex-wrap gap-2 text-blue-500 dark:text-blue-400 text-xs font-bold">
              {post.hashtags.map((h) => (
                <span key={h} className="animate-blur-in">
                  {h}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
