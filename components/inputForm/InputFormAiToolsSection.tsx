import React from 'react';
import { SparklesIcon } from '../icons/SparklesIcon';
import type { AiToolPanel } from './aiToolPanels';

interface InputFormAiToolsSectionProps {
  panels: AiToolPanel[];
}

export const InputFormAiToolsSection: React.FC<InputFormAiToolsSectionProps> = ({ panels }) => (
  <details className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700 group">
    <summary className="cursor-pointer list-none flex items-center justify-between py-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
      <span className="flex items-center gap-2">
        Narzędzia AI
        <SparklesIcon className="w-4 h-4 text-indigo-400" />
      </span>
      <svg
        className="w-5 h-5 transition-transform group-open:rotate-180 flex-shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </summary>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
      {panels.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            type="button"
            onClick={tool.onClick}
            className="flex items-start gap-3 p-3 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-400/40 bg-white/50 dark:bg-slate-900/30 transition-all text-left"
          >
            <div className={`p-1.5 bg-gradient-to-br ${tool.iconGradient} rounded-lg flex-shrink-0`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-sm font-bold text-slate-800 dark:text-white block">{tool.title}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{tool.description}</span>
            </div>
          </button>
        );
      })}
    </div>
  </details>
);
