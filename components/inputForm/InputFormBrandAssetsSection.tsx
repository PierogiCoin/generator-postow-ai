import React from 'react';
import type { BrandVoiceProfile } from '../../types';
import { BrandVoice } from '../BrandVoice';
import { Tooltip } from '../Tooltip';

interface InputFormBrandAssetsSectionProps {
  profiles: BrandVoiceProfile[];
  activeProfileId: string | null;
  includeLogo: boolean | undefined;
  useMascot: boolean | 'auto' | undefined;
  onSetActive: (id: string | null) => void;
  onManage: () => void;
  onToggleLogo: () => void;
  onSetUseMascot: (value: boolean | 'auto') => void;
}

export const InputFormBrandAssetsSection: React.FC<InputFormBrandAssetsSectionProps> = ({
  profiles,
  activeProfileId,
  includeLogo,
  useMascot,
  onSetActive,
  onManage,
  onToggleLogo,
  onSetUseMascot,
}) => {
  const mascotName =
    profiles.find((p) => p.id === activeProfileId)?.settings?.mascotName || '---';

  return (
    <div className="space-y-4">
      <div className="p-6 bg-purple-500/5 border-2 border-purple-500/10 rounded-3xl">
        <BrandVoice
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSetActive={onSetActive}
          onManage={onManage}
        />
      </div>

      <div className="p-5 bg-blue-500/5 border-2 border-blue-500/10 rounded-3xl animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
            Wykorzystaj Aktywa Marki
          </h4>
          <Tooltip text="Logo z profilu Brand Voice jest automatycznie nakładane na każdą grafikę (prawy dolny róg). Wyłącz, jeśli chcesz sam dodać logo w edytorze." />
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl">
            <span className="text-[10px] font-black uppercase text-slate-500 ml-2">Logo:</span>
            <button
              type="button"
              onClick={onToggleLogo}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${
                includeLogo
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {includeLogo ? 'Użyj' : 'Pomiń'}
            </button>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl">
            <span className="text-[10px] font-black uppercase text-slate-500 ml-2">
              Maskotka ({mascotName}):
            </span>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {(['auto', true, false] as const).map((val) => {
                const isSelected = useMascot === (val === 'auto' ? 'auto' : val);
                return (
                  <button
                    key={String(val)}
                    type="button"
                    onClick={() => onSetUseMascot(val === 'auto' ? 'auto' : val)}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${
                      isSelected
                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {val === 'auto' ? 'Sugeruj' : val ? 'Zawsze' : 'Nigdy'}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
