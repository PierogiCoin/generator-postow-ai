import React from 'react';
import type { BrandVoiceProfile } from '../types';
import { IdentificationIcon } from './icons/IdentificationIcon';
import { PencilIcon } from './icons/PencilIcon';
import { StarIcon } from './icons/StarIcon';
import { ModernButton } from './ui/ModernButton';

interface BrandVoiceProps {
  profiles: BrandVoiceProfile[];
  activeProfileId: string | null;
  onSetActive: (id: string | null) => void;
  onManage: () => void;
}

export const BrandVoice: React.FC<BrandVoiceProps> = ({ profiles, activeProfileId, onSetActive, onManage }) => {
  const activeProfile = profiles.find(p => p.id === activeProfileId);

  return (
    <section className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
          <IdentificationIcon className="w-7 h-7 text-blue-500" />
          Tożsamość Marki
        </h2>
        <button
          onClick={onManage}
          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-300"
          title="Zarządzaj profilami"
        >
          <PencilIcon className="w-5 h-5" />
        </button>
      </div>

      {profiles.length > 0 ? (
        <div className="space-y-4">
          <div className="relative group">
            <select
              value={activeProfileId || ''}
              onChange={(e) => onSetActive(e.target.value || null)}
              className="w-full h-14 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl px-5 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer group-hover:bg-white dark:group-hover:bg-slate-900"
            >
              <option value="">💡 Domyślny styl AI</option>
              {profiles.map(profile => (
                <option key={profile.id} value={profile.id}>🎯 {profile.name}</option>
              ))}
            </select>
            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-blue-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>

          {activeProfile && (
            <div className="p-4 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-950 rounded-2xl animate-fade-in">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
                <StarIcon className="w-4 h-4" />
                Aktywny Głos
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {activeProfile.settings.description || 'Ten profil nie ma jeszcze zdefiniowanego opisu, ale system użyje jego unikalnych cech.'}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-800 text-center space-y-4">
          <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
            <IdentificationIcon className="w-8 h-8 text-blue-500" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Brak profili marki</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-[200px] mx-auto">
              Zdefiniuj tożsamość firmy, aby AI tworzyła spójne i dopasowane treści.
            </p>
          </div>
          <div className="pt-2">
            <ModernButton onClick={onManage} variant="secondary" size="sm" fullWidth>
              Skonfiguruj Teraz
            </ModernButton>
          </div>
        </div>
      )}
    </section>
  );
};