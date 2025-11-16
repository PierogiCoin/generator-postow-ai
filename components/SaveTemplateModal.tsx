import React, { useState, useEffect } from 'react';
import type { CustomTemplate } from '../types';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  templateToEdit?: CustomTemplate | null;
}

export const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({ isOpen, onClose, onSave, templateToEdit }) => {
  const [templateName, setTemplateName] = useState('');
  const isEditing = !!templateToEdit;

  useEffect(() => {
    if (isOpen) {
      // Kiedy modal się otwiera, ustaw wartość pola wejściowego.
      // Jeśli edytujemy, użyj istniejącej nazwy szablonu, w przeciwnym razie zacznij od nowa.
      setTemplateName(templateToEdit?.name || '');
    }
  }, [isOpen, templateToEdit]);

  const handleSave = () => {
    if (templateName.trim()) {
      onSave(templateName.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      style={{ animationDuration: '0.3s' }}
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-6 w-full max-w-md m-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-cyan-600 dark:text-cyan-300 mb-4">
          {isEditing ? 'Edytuj szablon' : 'Zapisz jako szablon'}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          {isEditing ? 'Zmień nazwę swojego szablonu.' : 'Nadaj nazwę swojemu szablonowi, aby łatwo go później odnaleźć.'}
        </p>
        <div>
          <label htmlFor="template-name" className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Nazwa szablonu</label>
          <input
            type="text"
            id="template-name"
            value={templateName}
            onChange={e => setTemplateName(e.target.value)}
            placeholder="np. Szablon dla Eko-trampek"
            className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-4 mt-6">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            disabled={!templateName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEditing ? 'Zapisz zmiany' : 'Zapisz szablon'}
          </button>
        </div>
      </div>
    </div>
  );
};
