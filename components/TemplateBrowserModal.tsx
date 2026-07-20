import React from 'react';
import type { CustomTemplate } from '../types';
import { Platform } from '../types';
import { platformConfig } from '../config/platformConfig';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';

interface TemplateBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: CustomTemplate[];
  onSelect: (templateId: string) => void;
  onEdit: (template: CustomTemplate) => void;
  onDelete: (templateId: string) => void;
  currentTeamId: string | null;
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


export const TemplateBrowserModal: React.FC<TemplateBrowserModalProps> = ({ isOpen, onClose, templates, onSelect, onEdit, onDelete, currentTeamId }) => {
  if (!isOpen) return null;

  const availableTemplates = templates.filter(t => t.teamId === currentTeamId);

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fade-in"
      style={{ animationDuration: '0.3s' }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl m-4 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Wybierz szablon</h2>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
          {availableTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableTemplates.map(template => (
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
              <p className="text-sm mt-1">Zapisz swoje ustawienia jako szablon, aby przyspieszyć pracę.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};