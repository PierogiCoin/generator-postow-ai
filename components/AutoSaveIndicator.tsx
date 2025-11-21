import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, Check, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  lastSaved?: Date;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  status,
  lastSaved
}) => {
  const { t } = useTranslation();
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (!lastSaved) return;

    const updateTimeAgo = () => {
      const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
      if (seconds < 60) setTimeAgo(t('autoSave.justNow', 'just now'));
      else if (seconds < 3600) setTimeAgo(t('autoSave.minutesAgo', `${Math.floor(seconds / 60)}m ago`));
      else setTimeAgo(t('autoSave.hoursAgo', `${Math.floor(seconds / 3600)}h ago`));
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 30000);
    return () => clearInterval(interval);
  }, [lastSaved, t]);

  const statusConfig = {
    saved: {
      icon: Check,
      text: t('autoSave.saved', 'All changes saved'),
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-900/20'
    },
    saving: {
      icon: Cloud,
      text: t('autoSave.saving', 'Saving...'),
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20'
    },
    unsaved: {
      icon: CloudOff,
      text: t('autoSave.unsaved', 'Unsaved changes'),
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-900/20'
    },
    error: {
      icon: AlertCircle,
      text: t('autoSave.error', 'Save failed'),
      color: 'text-red-500',
      bg: 'bg-red-50 dark:bg-red-900/20'
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bg} transition-all`}>
      <Icon className={`w-4 h-4 ${config.color} ${status === 'saving' ? 'animate-pulse' : ''}`} />
      <span className={`text-sm ${config.color} font-medium`}>
        {config.text}
      </span>
      {lastSaved && status === 'saved' && timeAgo && (
        <span className="text-xs text-slate-500">• {timeAgo}</span>
      )}
    </div>
  );
};

// Hook for auto-save functionality
export const useAutoSave = <T,>(
  data: T,
  saveFunction: (data: T) => Promise<void>,
  delay: number = 30000 // 30 seconds
) => {
  const [status, setStatus] = useState<SaveStatus>('saved');
  const [lastSaved, setLastSaved] = useState<Date | undefined>();
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  const lastDataRef = React.useRef<T>(data);

  useEffect(() => {
    // Check if data actually changed
    if (JSON.stringify(data) === JSON.stringify(lastDataRef.current)) {
      return;
    }

    setStatus('unsaved');
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(async () => {
      try {
        setStatus('saving');
        await saveFunction(data);
        setStatus('saved');
        setLastSaved(new Date());
        lastDataRef.current = data;
      } catch (error) {
        setStatus('error');
        console.error('Auto-save failed:', error);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, saveFunction, delay]);

  // Manual save function
  const manualSave = async () => {
    try {
      setStatus('saving');
      await saveFunction(data);
      setStatus('saved');
      setLastSaved(new Date());
      lastDataRef.current = data;
    } catch (error) {
      setStatus('error');
      throw error;
    }
  };

  return { status, lastSaved, manualSave };
};
