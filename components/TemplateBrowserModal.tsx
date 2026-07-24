import React, { useEffect, useState } from 'react';
import type { CustomTemplate, FormData } from '../types';
import { Platform } from '../types';
import { platformConfig } from '../config/platformConfig';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import {
  getAllIndustryPacks,
  industryPackToFormPrefill,
  matchIndustryPack,
  type IndustryPack,
} from '../utils/industryPacks';
import { getUserNiche } from '../utils/userNiche';
import { getApiBaseUrl } from '../services/apiClient';

type BrowserTab = 'industry' | 'mine';

interface TemplateBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: CustomTemplate[];
  onSelect: (templateId: string) => void;
  onSelectIndustryPrefill?: (prefill: Partial<FormData>) => void;
  onEdit: (template: CustomTemplate) => void;
  onDelete: (templateId: string) => void;
  currentTeamId: string | null;
  userId?: string | null;
}

const TemplateCard: React.FC<{
  template: CustomTemplate;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ template, onSelect, onEdit, onDelete }) => {
  const platform = (template.formData?.platform || 'Facebook') as Platform;
  const config = platformConfig[platform] || platformConfig[Object.keys(platformConfig)[0] as Platform];
  const Icon = config.icon;

  return (
    <div className="border-2 border-slate-200 dark:border-slate-700 rounded-lg flex flex-col transition-all hover:border-blue-400/50 hover:shadow-lg bg-white dark:bg-slate-800/50">
      <div className="p-4 flex-grow cursor-pointer" onClick={onSelect}>
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-md ${config.selectedBgColor} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-slate-800 dark:text-white truncate">{template.name}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2" title={template.formData?.topic?.replace(/<[^>]*>?/gm, '') || ''}>
              {template.formData?.topic?.replace(/<[^>]*>?/gm, '') || 'Brak tematu'}
            </p>
          </div>
        </div>
      </div>
      <div className="p-2 border-t border-slate-200 dark:border-slate-700/50 flex justify-end items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="p-2 rounded-full text-slate-500 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          title="Edytuj szablon"
        >
          <PencilIcon className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-2 rounded-full text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          title="Usuń szablon"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const IndustryPackCard: React.FC<{
  pack: IndustryPack;
  highlighted?: boolean;
  onSelect: () => void;
}> = ({ pack, highlighted, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    className={`text-left border-2 rounded-lg p-4 transition-all hover:shadow-lg ${
      highlighted
        ? 'border-[var(--hero-accent)] bg-[var(--hero-accent-soft)]'
        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-blue-400/50'
    }`}
  >
    <div className="flex items-start gap-3">
      <span className="text-2xl shrink-0" aria-hidden>{pack.icon}</span>
      <div className="min-w-0">
        <h4 className="font-semibold text-slate-800 dark:text-white truncate">{pack.name}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{pack.description}</p>
        <p className="text-[10px] font-bold uppercase tracking-wider mt-2" style={{ color: 'var(--hero-accent)' }}>
          {pack.platform} · {pack.tone}
        </p>
      </div>
    </div>
  </button>
);

export const TemplateBrowserModal: React.FC<TemplateBrowserModalProps> = ({
  isOpen,
  onClose,
  templates,
  onSelect,
  onSelectIndustryPrefill,
  onEdit,
  onDelete,
  currentTeamId,
  userId,
}) => {
  const [tab, setTab] = useState<BrowserTab>('industry');
  const [industryPacks, setIndustryPacks] = useState<IndustryPack[]>(() => getAllIndustryPacks());

  const niche = getUserNiche(userId);
  const matched = matchIndustryPack(niche);

  useEffect(() => {
    if (!isOpen) return;
    setTab(matched ? 'industry' : templates.some((t) => t.teamId === currentTeamId) ? 'mine' : 'industry');

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/templates/category/industry`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          templates?: Array<{
            id: string;
            name: string;
            description: string;
            icon: string;
            platform: string;
            tone: string;
            topicHint?: string;
            topicIdeas?: string[];
          }>;
        };
        if (cancelled || !data.templates?.length) return;

        const localById = new Map(getAllIndustryPacks().map((p) => [p.id, p]));
        const merged = data.templates
          .map((tpl) => {
            const local = localById.get(tpl.id as IndustryPack['id']);
            if (local) {
              return {
                ...local,
                name: tpl.name || local.name,
                description: tpl.description || local.description,
                topicHint: tpl.topicHint || local.topicHint,
                topicIdeas: tpl.topicIdeas?.length ? tpl.topicIdeas : local.topicIdeas,
              };
            }
            return null;
          })
          .filter((p): p is IndustryPack => Boolean(p));

        if (merged.length) setIndustryPacks(merged);
      } catch {
        // fallback: lokalne INDUSTRY_PACKS
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, matched, templates, currentTeamId]);

  if (!isOpen) return null;

  const availableTemplates = templates.filter((t) => t.teamId === currentTeamId);
  const orderedIndustry = matched
    ? [matched, ...industryPacks.filter((p) => p.id !== matched.id)]
    : industryPacks;

  const handleIndustrySelect = (pack: IndustryPack) => {
    const prefill = industryPackToFormPrefill(pack);
    if (onSelectIndustryPrefill) {
      onSelectIndustryPrefill(prefill);
    } else {
      onSelect(pack.id);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fade-in"
      style={{ animationDuration: '0.3s' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl m-4 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 flex-shrink-0 gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Wybierz szablon</h2>
            {matched && (
              <p className="text-xs text-slate-500 mt-0.5">
                Dopasowano do niszy: <span className="font-semibold" style={{ color: 'var(--hero-accent)' }}>{matched.name}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 text-2xl leading-none">&times;</button>
        </div>

        <div className="px-4 pt-3 flex gap-2 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <button
            type="button"
            onClick={() => setTab('industry')}
            className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-colors ${
              tab === 'industry'
                ? 'border-[var(--hero-accent)] text-[var(--hero-accent)]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Branżowe
          </button>
          <button
            type="button"
            onClick={() => setTab('mine')}
            className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-colors ${
              tab === 'mine'
                ? 'border-[var(--hero-accent)] text-[var(--hero-accent)]'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Moje ({availableTemplates.length})
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {tab === 'industry' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orderedIndustry.map((pack) => (
                <IndustryPackCard
                  key={pack.id}
                  pack={pack}
                  highlighted={matched?.id === pack.id}
                  onSelect={() => handleIndustrySelect(pack)}
                />
              ))}
            </div>
          ) : availableTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => onSelect(template.id)}
                  onEdit={() => onEdit(template)}
                  onDelete={() => onDelete(template.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 dark:text-slate-400">
              <p className="font-semibold">Brak zapisanych szablonów.</p>
              <p className="text-sm mt-1">Użyj zakładki Branżowe albo zapisz ustawienia formularza jako własny szablon.</p>
              <button
                type="button"
                onClick={() => setTab('industry')}
                className="mt-4 px-4 py-2 text-sm font-bold rounded-lg text-white"
                style={{ backgroundColor: 'var(--hero-accent)' }}
              >
                Zobacz packi branżowe
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
