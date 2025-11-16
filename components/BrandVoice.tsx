import React from 'react';
import type { BrandVoiceProfile } from '../types';
import { IdentificationIcon } from './icons/IdentificationIcon';
import { PencilIcon } from './icons/PencilIcon';

interface BrandVoiceProps {
  profiles: BrandVoiceProfile[];
  activeProfileId: string | null;
  onSetActive: (id: string | null) => void;
  onManage: () => void;
}

export const BrandVoice: React.FC<BrandVoiceProps> = ({ profiles, activeProfileId, onSetActive, onManage }) => {
  const activeProfile = profiles.find(p => p.id === activeProfileId);

  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <IdentificationIcon className="w-6 h-6 text-blue-500" />
          Głos Marki
        </h2>
        <button onClick={onManage} className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" title="Zarządzaj profilami">
            <PencilIcon className="w-5 h-5"/>
        </button>
      </div>
      {profiles.length > 0 ? (
        <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Aktywny profil:</p>
            <select
                value={activeProfileId || ''}
                onChange={(e) => onSetActive(e.target.value || null)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 transition"
            >
                <option value="">Brak (domyślny)</option>
                {profiles.map(profile => (
                    <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
            </select>
            {activeProfile && (
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 p-2 bg-slate-100 dark:bg-slate-900/50 rounded-md">
                    <p className="truncate" title={activeProfile.settings.description}>
                        <strong>Opis:</strong> {activeProfile.settings.description || 'Brak opisu'}
                    </p>
                </div>
            )}
        </>
      ) : (
        <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                Zdefiniuj tożsamość swojej marki, aby AI generowała bardziej spójne treści.
            </p>
            <button onClick={onManage} className="w-full text-sm font-semibold text-blue-600 dark:text-blue-300 p-2 rounded-md bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
                Utwórz pierwszy profil
            </button>
        </>
      )}
    </section>
  );
};