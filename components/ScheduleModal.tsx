import React, { useState, useEffect } from 'react';
import { GenerationResult, FormData, ScheduledPost, Platform, GenerationType } from '../types';
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
};

const inputClassName =
  'w-full min-h-[44px] bg-[var(--hero-surface)] dark:bg-[#071018] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--hero-accent)] focus:border-[var(--hero-accent)] transition touch-manipulation';

const chipBase =
  'inline-flex items-center gap-2 min-h-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-all touch-manipulation border';

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  itemToSchedule,
}) => {
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
        const d = new Date(itemToSchedule.scheduleTimestamp ?? Date.now());
        const dateString = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        const timeString = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        setDate(dateString);
        setTime(timeString);
        setSelectedPlatforms(
          itemToSchedule.formData.campaignPlatforms || [itemToSchedule.formData.platform]
        );
        setSelectedFormats([itemToSchedule.formData.generationType]);
      } else {
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
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleFormatToggle = (format: GenerationType) => {
    setSelectedFormats((prev) =>
      prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]
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
    GenerationType.PostWithImage,
    GenerationType.Video,
    GenerationType.Idea,
  ];

  const topicPreview =
    itemToSchedule?.formData?.topic?.replace(/<[^>]*>?/gm, '') || 'Bez tytułu';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 animate-fade-in"
      style={{ animationDuration: '0.2s' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-modal-title"
        className="w-full max-w-xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0a1220] border border-slate-200 dark:border-white/10 rounded-t-2xl sm:rounded-lg shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 z-10 flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6 pb-4 bg-white dark:bg-[#0a1220] border-b border-slate-200 dark:border-white/10"
          style={{ boxShadow: 'inset 3px 0 0 0 var(--hero-accent)' }}
        >
          <div className="min-w-0 pr-2">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: 'var(--hero-accent)' }}
            >
              Kalendarz
            </p>
            <h2
              id="schedule-modal-title"
              className="mt-1 font-display text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white"
            >
              Zaplanuj publikację
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
            className="shrink-0 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors touch-manipulation"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 sm:px-6 py-5 space-y-5">
          {itemToSchedule && (
            <div className="p-4 border border-slate-200 dark:border-white/10 bg-[var(--hero-surface)] dark:bg-[#071018]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1.5">
                Planujesz na podstawie
              </p>
              <strong className="block text-slate-900 dark:text-white font-semibold text-sm sm:text-base leading-snug">
                {topicPreview}
              </strong>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <span className="px-2 py-0.5 bg-[var(--hero-accent-soft)] text-[var(--hero-accent)] text-xs font-medium rounded-md">
                  {itemToSchedule.formData.platform}
                </span>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-md">
                  {itemToSchedule.formData.generationType}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="schedule-date"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                <CalendarIcon className="w-4 h-4 text-[var(--hero-accent)]" />
                Data publikacji
              </label>
              <input
                type="date"
                id="schedule-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={getTodayString()}
                className={inputClassName}
              />
            </div>
            <div>
              <label
                htmlFor="schedule-time"
                className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                <ClockIcon className="w-4 h-4 text-[var(--hero-accent)]" />
                Godzina publikacji
              </label>
              <input
                type="time"
                id="schedule-time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Docelowe platformy
            </label>
            <div className="flex flex-wrap gap-2">
              {allPlatforms.map((platform) => {
                const config = platformConfig[platform];
                const Icon = config.icon;
                const isSelected = selectedPlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => handlePlatformToggle(platform)}
                    className={`${chipBase} ${
                      isSelected
                        ? `${config.color} text-white border-transparent`
                        : 'bg-[var(--hero-surface)] dark:bg-[#071018] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-[var(--hero-accent)]/40'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {platform}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Formaty treści
            </label>
            <div className="flex flex-wrap gap-2">
              {allFormats.map((format) => {
                const isSelected = selectedFormats.includes(format);
                const label =
                  format === GenerationType.PostWithImage
                    ? 'Post ze zdjęciem'
                    : format === GenerationType.Video
                      ? 'Video'
                      : 'Pomysł';
                return (
                  <button
                    key={format}
                    type="button"
                    onClick={() => handleFormatToggle(format)}
                    className={`${chipBase} ${
                      isSelected
                        ? 'bg-[var(--hero-accent)] text-white border-transparent'
                        : 'bg-[var(--hero-surface)] dark:bg-[#071018] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-[var(--hero-accent)]/40'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-start gap-3 p-3.5 border border-slate-200 dark:border-white/10 bg-[var(--hero-surface)] dark:bg-[#071018] cursor-pointer">
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
              className="mt-1 rounded border-slate-300 text-[var(--hero-accent)] focus:ring-[var(--hero-accent)]"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">
                Wymagaj akceptacji przed publikacją
              </span>
              <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Post trafi do kolejki akceptacji na dashboardzie.
              </span>
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="sticky bottom-0 px-5 sm:px-6 py-4 bg-white dark:bg-[#0a1220] border-t border-slate-200 dark:border-white/10 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
          <ModernButton onClick={onClose} variant="secondary" className="!rounded-lg min-h-[44px] w-full sm:w-auto">
            Anuluj
          </ModernButton>
          <ModernButton
            onClick={handleSubmit}
            variant="primary"
            icon={<CheckIcon className="w-5 h-5" />}
            className="!rounded-lg min-h-[44px] w-full sm:w-auto"
          >
            Potwierdź harmonogram
          </ModernButton>
        </div>
      </div>
    </div>
  );
};

export default ScheduleModal;
