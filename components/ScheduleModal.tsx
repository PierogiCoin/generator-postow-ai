import React, { useState, useEffect } from 'react';
import { GenerationResult, FormData, ScheduledPost, Platform, GenerationType } from '../types'; // Użyj importu bez 'type'
import { platformConfig } from '../config/platformConfig';
import { CalendarIcon } from './icons/CalendarIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ModernButton } from './ui/ModernButton';
import { XMarkIcon } from './icons/XMarkIcon';
import { useEscapeClose } from '../hooks/useEscapeClose';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    scheduleTimestamp: number,
    selectedPlatforms: Platform[],
    selectedFormats: GenerationType[],
    requireApproval?: boolean
  ) => void;
  itemToSchedule: (Partial<ScheduledPost> & { formData: FormData; result: GenerationResult; }) | null;
}

const getTodayString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, onConfirm, itemToSchedule }) => {
  const [date, setDate] = useState(getTodayString());
  const [time, setTime] = useState('09:00');
  const [error, setError] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<GenerationType[]>([]);
  const [requireApproval, setRequireApproval] = useState(false);
  useEscapeClose(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      if (itemToSchedule) {
        // If editing an existing scheduled item
        const d = new Date(itemToSchedule.scheduleTimestamp ?? Date.now());
        const dateString = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        const timeString = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        setDate(dateString);
        setTime(timeString);
        setSelectedPlatforms(itemToSchedule.formData.campaignPlatforms || [itemToSchedule.formData.platform]);
        setSelectedFormats([itemToSchedule.formData.generationType]);
      } else {
        // Default for new scheduling
        setDate(getTodayString());
        setTime('09:00');
        setSelectedPlatforms([Platform.Facebook]);
        setSelectedFormats([GenerationType.PostWithImage]);
      }
      setError('');
      setRequireApproval(false);
    }
  }, [isOpen, itemToSchedule]);

  const handlePlatformToggle = (platform: Platform) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const handleFormatToggle = (format: GenerationType) => {
    setSelectedFormats(prev => 
      prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format]
    );
  };

  const handleSubmit = () => {
    if (selectedPlatforms.length === 0 || selectedFormats.length === 0) {
      setError('Wybierz przynajmniej jedną platformę i format.');
      return;
    }

    const scheduleDateTime = new Date(`${date}T${time}`);
    if (isNaN(scheduleDateTime.getTime())) {
      setError('Nieprawidłowa data lub godzina.');
      return;
    }

    const now = new Date();
    now.setSeconds(0, 0);

    if (scheduleDateTime < now) {
      setError('Nie można planować postów w przeszłości.');
      return;
    }

    setError('');
    onConfirm(scheduleDateTime.getTime(), selectedPlatforms, selectedFormats, requireApproval);
  };

  if (!isOpen) return null;

  const allPlatforms: Platform[] = Object.values(Platform);
  const allFormats: GenerationType[] = [
    GenerationType.PostWithImage, GenerationType.Video, GenerationType.Idea
  ];

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fade-in"
      style={{ animationDuration: '0.3s' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-modal-title"
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-6 w-full max-w-xl m-4 transform transition-all flex flex-col gap-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 id="schedule-modal-title" className="text-2xl font-extrabold text-blue-600 dark:text-blue-300">Zaplanuj publikację</h2>
          <button type="button" onClick={onClose} aria-label="Zamknij" className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"><XMarkIcon className="w-5 h-5" /></button>
        </div>

        {itemToSchedule && (
          <div className="p-4 bg-[var(--hero-accent-soft)] rounded-lg border border-[var(--hero-accent)]/25">
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Planujesz na podstawie:</p>
            <strong className="text-slate-800 dark:text-white font-semibold text-base">{itemToSchedule.formData?.topic?.replace(/<[^>]*>?/gm, '') || 'Bez tytułu'}</strong>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="px-2 py-0.5 bg-[var(--hero-accent-soft)] text-[var(--hero-accent)] text-xs font-medium rounded-full">{itemToSchedule.formData.platform}</span>
              <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-full">{itemToSchedule.formData.generationType}</span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" /> Data publikacji
            </label>
            <input
              type="date"
              id="schedule-date"
              value={date}
              onChange={e => setDate(e.target.value)}
              min={getTodayString()}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition calendar-picker-indicator"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
              <ClockIcon className="w-4 h-4" /> Godzina publikacji
            </label>
            <input
              type="time"
              id="schedule-time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition calendar-picker-indicator"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Docelowe Platformy (wiele)</label>
            <div className="flex flex-wrap gap-2">
              {allPlatforms.map(platform => {
                const config = platformConfig[platform];
                const Icon = config.icon;
                const isSelected = selectedPlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => handlePlatformToggle(platform)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isSelected ? config.color.replace('bg-', 'bg-') + ' text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                  >
                    <Icon className="w-4 h-4" /> {platform}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Formaty treści (wiele)</label>
            <div className="flex flex-wrap gap-2">
              {allFormats.map(format => {
                const config = platformConfig[format as unknown as Platform] || { icon: CalendarIcon, color: "bg-gray-500", iconColor: "text-gray-500" }; // Fallback
                const Icon = config.icon;
                const isSelected = selectedFormats.includes(format);
                return (
                  <button
                    key={format}
                    type="button"
                    onClick={() => handleFormatToggle(format)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isSelected ? 'bg-[var(--hero-accent)] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                  >
                    <Icon className="w-4 h-4" /> {format === GenerationType.PostWithImage ? 'Post ze zdjęciem' : format === GenerationType.Video ? 'Video' : 'Pomysł'}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-amber-200/60 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-900/10 cursor-pointer">
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
              className="mt-1 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            />
            <span>
              <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">Wymagaj akceptacji przed publikacją</span>
              <span className="block text-xs text-slate-500 mt-0.5">Post trafi do kolejki akceptacji na dashboardzie.</span>
            </span>
          </label>

        </div>
        {error && <p className="text-red-500 dark:text-red-400 text-sm mt-4">{error}</p>}
        <div className="flex justify-end gap-4 mt-6">
          <ModernButton
            onClick={onClose}
            variant="secondary"
          >
            Anuluj
          </ModernButton>
          <ModernButton
            onClick={handleSubmit}
            variant="primary"
            icon={<CheckIcon className="w-5 h-5" />}
          >
            Potwierdź harmonogram
          </ModernButton>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;
