import React from 'react';
import { X, Command, Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    title: 'Nawigacja',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Command Palette' },
      { keys: ['/'], description: 'Szybkie wyszukiwanie' },
      { keys: ['Ctrl', 'D'], description: 'Dashboard' },
      { keys: ['Ctrl', 'N'], description: 'Nowy post' },
      { keys: ['Ctrl', 'Shift', 'H'], description: 'Historia' },
      { keys: ['Ctrl', 'Shift', 'S'], description: 'Zaplanowane' },
    ],
  },
  {
    title: 'Akcje',
    shortcuts: [
      { keys: ['Ctrl', 'Shift', 'B'], description: 'Brand Voice Manager' },
      { keys: ['Ctrl', 'Shift', 'A'], description: 'Analizuj post' },
      { keys: ['Ctrl', 'P'], description: 'Cennik' },
      { keys: ['Ctrl', 'L'], description: 'Logowanie' },
    ],
  },
  {
    title: 'Globalne',
    shortcuts: [
      { keys: ['ESC'], description: 'Zamknij wszystkie okna' },
      { keys: ['Shift', '?'], description: 'Pokaż skróty' },
    ],
  },
];

const KeyBadge: React.FC<{ keyName: string }> = ({ keyName }) => (
  <kbd className="inline-flex items-center justify-center px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-300 rounded-md shadow-sm dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 min-w-[28px]">
    {keyName === 'Ctrl' ? (
      <span className="flex items-center gap-0.5">
        <Command className="w-3 h-3" />
        <span className="hidden sm:inline">Ctrl</span>
      </span>
    ) : (
      keyName
    )}
  </kbd>
);

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg m-4 overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl">
              <Keyboard className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Skróty klawiszowe
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Pracuj szybciej z klawiaturą
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {SHORTCUTS.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <React.Fragment key={keyIdx}>
                          <KeyBadge keyName={key} />
                          {keyIdx < shortcut.keys.length - 1 && (
                            <span className="text-slate-400 mx-0.5">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-center text-slate-500 dark:text-slate-400">
            Wskazówka: Większość skrótów działa nawet podczas pisania w polach tekstowych
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
