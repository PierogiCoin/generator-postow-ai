import React from 'react';
import { useTranslation } from 'react-i18next';
import type { AudiencePersona } from '../types';
import { XCircleIcon } from './icons/XCircleIcon';

interface PersonaDisplayProps {
  persona: AudiencePersona;
  onClose: () => void;
}

export const PersonaDisplay: React.FC<PersonaDisplayProps> = ({ persona, onClose }) => {
  const { t } = useTranslation();
  return (
    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg animate-fade-in relative">
      <button onClick={onClose} className="absolute top-2 right-2 p-1 text-blue-500 hover:text-blue-700" title="Zamknij personę">
        <XCircleIcon className="w-5 h-5" />
      </button>
      <h4 className="text-lg font-bold text-blue-800 dark:text-blue-200">{persona.name}, {persona.age}</h4>
      <p className="text-sm font-medium text-blue-600 dark:text-blue-300">{persona.jobTitle} @ {persona.location}</p>
      
      <div className="mt-3 space-y-3 text-sm">
        <div>
          <h5 className="font-semibold text-blue-700 dark:text-blue-200">{t('persona.demographics')}</h5>
          <p className="text-blue-900/80 dark:text-blue-100/80">{persona.demographics}</p>
        </div>
        <div>
          <h5 className="font-semibold text-blue-700 dark:text-blue-200">{t('persona.goals')}</h5>
          <ul className="list-disc list-inside text-blue-900/80 dark:text-blue-100/80">
            {persona.goals.map((goal, i) => <li key={`goal-${i}`}>{goal}</li>)}
          </ul>
        </div>
        <div>
          <h5 className="font-semibold text-blue-700 dark:text-blue-200">{t('persona.painPoints')}</h5>
          <ul className="list-disc list-inside text-blue-900/80 dark:text-blue-100/80">
            {persona.painPoints.map((point, i) => <li key={`pain-${i}`}>{point}</li>)}
          </ul>
        </div>
        <div>
          <h5 className="font-semibold text-blue-700 dark:text-blue-200">{t('persona.communicationTips')}</h5>
          <p className="text-blue-900/80 dark:text-blue-100/80">{persona.communicationTips}</p>
        </div>
      </div>
    </div>
  );
};
