import React, { useState, useEffect } from 'react';
import type { GenerationResult, FormData, ScheduledPost } from '../types';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (scheduleTimestamp: number) => void;
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

  useEffect(() => {
    if (isOpen) {
      if (itemToSchedule && itemToSchedule.scheduleTimestamp) {
        const d = new Date(itemToSchedule.scheduleTimestamp);
        const dateString = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        const timeString = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        setDate(dateString);
        setTime(timeString);
      } else {
        // Reset to default when opening for a new post
        setDate(getTodayString());
        setTime('09:00');
      }
      setError('');
    }
  }, [isOpen, itemToSchedule]);

  const handleSubmit = () => {
    const scheduleDateTime = new Date(`${date}T${time}`);
    if (isNaN(scheduleDateTime.getTime())) {
      setError('Nieprawidłowa data lub godzina.');
      return;
    }
    
    // Ujednolicona i uproszczona walidacja czasu
    const now = new Date();
    // Porównaj do początku bieżącej minuty, aby uniknąć drobnych problemów z synchronizacją
    now.setSeconds(0, 0); 

    if (scheduleDateTime < now) {
      setError('Nie można planować postów w przeszłości.');
      return;
    }

    setError('');
    onConfirm(scheduleDateTime.getTime());
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity animate-fade-in"
      style={{ animationDuration: '0.3s' }}
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-md m-4 transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-semibold text-blue-600 dark:text-blue-300 mb-2">Zaplanuj post</h2>
        {itemToSchedule && (
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Planujesz publikację dla: <strong className="text-slate-600 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: itemToSchedule.formData.topic }}></strong>
            </p>
        )}
        <div className="space-y-4">
          <div>
            <label htmlFor="schedule-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
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
            <label htmlFor="schedule-time" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Godzina</label>
            <input
              type="time"
              id="schedule-time"
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition calendar-picker-indicator"
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>
        {error && <p className="text-red-500 dark:text-red-400 text-sm mt-4">{error}</p>}
        <div className="flex justify-end gap-4 mt-6">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition"
          >
            Anuluj
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-500 transition"
          >
            Potwierdź
          </button>
        </div>
      </div>
    </div>
  );
};
