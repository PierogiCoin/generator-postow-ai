import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Loader2, Check, AlertCircle, Calendar } from 'lucide-react';
import type { GenerationResult } from '../types';
import type { SocialConnection, SocialPlatform } from '../types/socialPublishing';

interface DirectPublishButtonProps {
  post: GenerationResult;
  connection: SocialConnection;
  onPublish: (connectionId: string, scheduledAt?: Date) => Promise<void>;
  variant?: 'primary' | 'secondary' | 'icon';
}

export const DirectPublishButton: React.FC<DirectPublishButtonProps> = ({
  post,
  connection,
  onPublish,
  variant = 'primary'
}) => {
  const { t } = useTranslation();
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');

  const handlePublish = async (scheduled?: Date) => {
    setIsPublishing(true);
    setPublishStatus('idle');
    
    try {
      await onPublish(connection.id, scheduled);
      setPublishStatus('success');
      
      // Reset after 3 seconds
      setTimeout(() => {
        setPublishStatus('idle');
        setShowSchedule(false);
      }, 3000);
    } catch (error) {
      console.error('Publish failed:', error);
      setPublishStatus('error');
      
      // Reset error after 5 seconds
      setTimeout(() => {
        setPublishStatus('idle');
      }, 5000);
    } finally {
      setIsPublishing(false);
    }
  };

  const handleScheduledPublish = () => {
    if (!scheduledDate) return;
    const date = new Date(scheduledDate);
    handlePublish(date);
  };

  const platformConfig = {
    linkedin: { icon: '💼', color: 'from-blue-600 to-blue-700' },
    twitter: { icon: '𝕏', color: 'from-black to-slate-800' },
    instagram: { icon: '📸', color: 'from-purple-500 to-pink-500' },
    facebook: { icon: '👥', color: 'from-blue-500 to-blue-600' }
  };

  const config = platformConfig[connection.platform as keyof typeof platformConfig];

  if (variant === 'icon') {
    return (
      <button
        onClick={() => handlePublish()}
        disabled={isPublishing || publishStatus === 'success'}
        className={`p-2 rounded-lg transition disabled:opacity-50 ${
          publishStatus === 'success'
            ? 'bg-green-100 dark:bg-green-900/30'
            : publishStatus === 'error'
            ? 'bg-red-100 dark:bg-red-900/30'
            : 'bg-gradient-to-r ' + config.color
        }`}
        title={`Publish to ${connection.accountName}`}
      >
        {isPublishing ? (
          <Loader2 className="w-4 h-4 text-white animate-spin" />
        ) : publishStatus === 'success' ? (
          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
        ) : publishStatus === 'error' ? (
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
        ) : (
          <Send className="w-4 h-4 text-white" />
        )}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => handlePublish()}
          disabled={isPublishing || publishStatus === 'success'}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center justify-center gap-2 ${
            publishStatus === 'success'
              ? 'bg-green-500 text-white'
              : publishStatus === 'error'
              ? 'bg-red-500 text-white'
              : `bg-gradient-to-r ${config.color} text-white hover:shadow-lg`
          }`}
        >
          {isPublishing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('publish.publishing', 'Publishing...')}</span>
            </>
          ) : publishStatus === 'success' ? (
            <>
              <Check className="w-4 h-4" />
              <span>{t('publish.published', 'Published!')}</span>
            </>
          ) : publishStatus === 'error' ? (
            <>
              <AlertCircle className="w-4 h-4" />
              <span>{t('publish.failed', 'Failed')}</span>
            </>
          ) : (
            <>
              <span className="text-lg">{config.icon}</span>
              <Send className="w-4 h-4" />
              <span>{t('publish.publishTo', `Publish to ${connection.accountName}`)}</span>
            </>
          )}
        </button>

        <button
          onClick={() => setShowSchedule(!showSchedule)}
          disabled={isPublishing || publishStatus === 'success'}
          className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition disabled:opacity-50"
          title={t('publish.schedule', 'Schedule')}
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      {showSchedule && (
        <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
            {t('publish.scheduleFor', 'Schedule for')}
          </label>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
            />
            <button
              onClick={handleScheduledPublish}
              disabled={!scheduledDate || isPublishing}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 text-sm font-medium"
            >
              {t('publish.schedule', 'Schedule')}
            </button>
          </div>
        </div>
      )}

      {publishStatus === 'error' && (
        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {t('publish.errorMessage', 'Failed to publish. Please try again or check your connection.')}
        </div>
      )}
    </div>
  );
};
