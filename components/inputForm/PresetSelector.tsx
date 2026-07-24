import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bookmark, Plus, Trash2, Check } from 'lucide-react';
import type { FormData, Platform } from '../../types';

export interface PromptPreset {
  id: string;
  name: string;
  platform: Platform;
  tone: FormData['tone'];
  contentLanguage: FormData['contentLanguage'];
}

const STORAGE_KEY = 'generator_prompt_presets';

const DEFAULT_PRESETS: PromptPreset[] = [
  { id: 'default-1', name: 'Zabawny Post IG', platform: 'instagram' as Platform, tone: 'humorous', contentLanguage: 'pl' },
  { id: 'default-2', name: 'Biznesowy LinkedIn', platform: 'linkedin' as Platform, tone: 'professional', contentLanguage: 'pl' },
  { id: 'default-3', name: 'Viralowy TikTok', platform: 'tiktok' as Platform, tone: 'energetic', contentLanguage: 'pl' },
];

interface PresetSelectorProps {
  currentPlatform: Platform;
  currentTone: FormData['tone'];
  currentLanguage: FormData['contentLanguage'];
  onApplyPreset: (preset: PromptPreset) => void;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  currentPlatform,
  currentTone,
  currentLanguage,
  onApplyPreset,
}) => {
  const { t } = useTranslation();
  const [presets, setPresets] = useState<PromptPreset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PRESETS;
    } catch {
      return DEFAULT_PRESETS;
    }
  });

  const [newPresetName, setNewPresetName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    } catch {
      // localStorage fallback
    }
  }, [presets]);

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;

    const newPreset: PromptPreset = {
      id: Date.now().toString(),
      name: newPresetName.trim(),
      platform: currentPlatform,
      tone: currentTone,
      contentLanguage: currentLanguage,
    };

    setPresets(prev => [...prev, newPreset]);
    setNewPresetName('');
    setIsAdding(false);
    setActivePresetId(newPreset.id);
    onApplyPreset(newPreset);
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPresets(prev => prev.filter(p => p.id !== id));
    if (activePresetId === id) setActivePresetId(null);
  };

  return (
    <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5 text-amber-500" />
          <span>Szablony Ustawień (Presets)</span>
        </span>
        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          {isAdding ? 'Anuluj' : 'Zapisz obecne'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSavePreset} className="flex gap-2 animate-fade-in">
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            placeholder="Nazwa szablonu (np. Mój styl FB)..."
            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={!newPresetName.trim()}
            className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" />
            Zapisz
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const isActive = activePresetId === preset.id;
          return (
            <div
              key={preset.id}
              onClick={() => {
                setActivePresetId(preset.id);
                onApplyPreset(preset);
              }}
              className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 border ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'
              }`}
            >
              <span>{preset.name}</span>
              <button
                type="button"
                onClick={(e) => handleDeletePreset(preset.id, e)}
                className={`opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity ${
                  isActive ? 'text-white/80' : 'text-slate-400'
                }`}
                title="Usuń szablon"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
