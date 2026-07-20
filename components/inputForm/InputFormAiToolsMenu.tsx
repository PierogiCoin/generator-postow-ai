import React, { useRef, useEffect, useState } from 'react';
import { SparklesIcon } from '../icons/SparklesIcon';
import type { AiToolPanelCategory } from './aiToolPanels';

interface InputFormAiToolsMenuProps {
  panels: AiToolPanelCategory[];
  variant?: 'default' | 'compact';
  label?: string;
}

export const InputFormAiToolsMenu: React.FC<InputFormAiToolsMenuProps> = ({
  panels,
  variant = 'default',
  label = 'Narzędzia AI',
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          variant === 'compact'
            ? 'flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-800/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
            : 'flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-400/50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
        }
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <SparklesIcon className="w-4 h-4 text-indigo-500" />
        {label}
        <svg
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-80 max-h-[min(480px,75vh)] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-2"
          role="menu"
        >
          {panels.map((category, catIdx) => (
            <div key={category.title} className={catIdx > 0 ? 'border-t border-slate-100 dark:border-slate-800/80 mt-2 pt-2' : ''}>
              <div className="px-4 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {category.title}
              </div>
              <div className="mt-1">
                {category.tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        tool.onClick();
                        setOpen(false);
                      }}
                      className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-800/80"
                    >
                      <div className={`p-1.5 bg-gradient-to-br ${tool.iconGradient} rounded-lg shrink-0`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-semibold text-slate-800 dark:text-white block leading-snug">
                          {tool.title}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 leading-snug">
                          {tool.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
