import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FormData, GenerationResult } from '../../types';
import { NotificationType } from '../../types';
import type { SocialConnection, SocialPlatform } from '../../types/socialPublishing';
import { socialConnectionsService } from '../../services/socialConnectionsService';
import { ModernButton } from '../ui/ModernButton';
import { Spinner } from '../ui/LoadingStates';
import { MobilePreview } from '../MobilePreview';
import { RocketLaunchIcon } from '../icons/RocketLaunchIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { CalendarIcon } from '../icons/CalendarIcon';
import { LayersIcon } from '../icons/LayersIcon';

interface ResultPublishTabProps {
  result: GenerationResult;
  formData: FormData | null | undefined;
  userId: string | undefined;
  publishCaptionPreview: string;
  resolvedCtaUrl: string | null | undefined;
  onSchedule: () => void;
  onPublishNow: (connectionId?: string) => void;
  onOpenRepurpose: () => void;
  onToast: (message: string, type: NotificationType) => void;
}

export const ResultPublishTab: React.FC<ResultPublishTabProps> = ({
  result,
  formData,
  userId,
  publishCaptionPreview,
  resolvedCtaUrl,
  onSchedule,
  onPublishNow,
  onOpenRepurpose,
  onToast,
}) => {
  const { t } = useTranslation();
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [publishPreviewType, setPublishPreviewType] = useState<'text' | 'social'>('text');

  const loadConnections = useCallback(async () => {
    if (!userId) return;
    setIsLoadingConnections(true);
    try {
      const data = await socialConnectionsService.getConnections(userId);
      setConnections(data);
      if (formData?.platform) {
        const matched = data.filter(
          (c) => c.platform.toLowerCase() === formData.platform.toLowerCase() && c.isActive
        );
        if (matched.length > 0) {
          setSelectedConnectionId(matched[0].id);
        }
      }
    } catch {
      // silent fail
    } finally {
      setIsLoadingConnections(false);
    }
  }, [userId, formData?.platform]);

  useEffect(() => {
    if (userId) void loadConnections();
  }, [userId, loadConnections]);

  const handleConnectSocial = async (platform: string) => {
    try {
      if (!userId) throw new Error('Zaloguj się, aby połączyć konto');
      const authUrl = await socialConnectionsService.getAuthUrl(
        platform as SocialPlatform,
        userId
      );
      window.location.href = authUrl;
    } catch (error: unknown) {
      onToast(
        error instanceof Error ? error.message : 'Błąd połączenia',
        NotificationType.Error
      );
    }
  };

  const platformConnections = formData
    ? connections.filter(
        (c) => c.platform.toLowerCase() === formData.platform.toLowerCase() && c.isActive
      )
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {(result.callToAction || resolvedCtaUrl) && (
        <div className="p-5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-3xl space-y-3">
          <div className="flex items-center gap-2">
            <RocketLaunchIcon className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
              {t('resultCard.publish.ctaPreview', 'CTA i link')}
            </span>
          </div>
          {result.callToAction && (
            <p className="text-sm font-bold text-slate-900 dark:text-white">{result.callToAction}</p>
          )}
          {resolvedCtaUrl && (
            <a
              href={resolvedCtaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 break-all hover:underline"
            >
              {resolvedCtaUrl}
            </a>
          )}
          <p className="text-[10px] text-slate-500 font-medium">
            {t(
              'resultCard.publish.ctaHint',
              'Link zostanie dołączony do opisu na Facebooku i innych platformach.'
            )}
          </p>
        </div>
      )}

      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            {t('resultCard.publish.captionPreview', 'Podgląd publikacji')}
          </p>
          <div className="flex bg-slate-200 dark:bg-slate-850 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setPublishPreviewType('text')}
              className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-all ${
                publishPreviewType === 'text'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Tekst
            </button>
            <button
              type="button"
              onClick={() => setPublishPreviewType('social')}
              className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md transition-all ${
                publishPreviewType === 'social'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Social Feed
            </button>
          </div>
        </div>
        {publishPreviewType === 'text' ? (
          <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
            {publishCaptionPreview}
          </p>
        ) : (
          <div className="pt-2">
            <MobilePreview
              content={result.postText}
              hashtags={result.hashtags}
              platform={
                (['instagram', 'twitter', 'linkedin', 'facebook'].includes(
                  (formData?.platform?.toLowerCase() || '')
                )
                  ? formData!.platform.toLowerCase()
                  : 'linkedin') as 'instagram' | 'twitter' | 'linkedin' | 'facebook'
              }
            />
          </div>
        )}
      </div>

      {result.suggestedPostingTime && (
        <div className="p-5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-3xl">
          <div className="flex items-center gap-2 mb-3">
            <ClockIcon className="w-4 h-4 text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
              {t('resultCard.publish.bestTime', 'Optymalny czas')}
            </span>
          </div>
          <p className="text-sm font-black text-slate-900 dark:text-white mb-1">
            {t('resultCard.publish.todayAt', 'Dziś o {{time}}', {
              time: result.suggestedPostingTime,
            })}
          </p>
          <p className="text-[10px] text-slate-500 font-medium italic">
            {t(
              'resultCard.publish.timeHint',
              'Sugerowana godzina na podstawie aktywności grupy docelowej.'
            )}
          </p>
        </div>
      )}

      {formData && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Konto publikacji ({formData.platform})
            </p>
            {platformConnections.length > 0 && (
              <button
                type="button"
                onClick={() => void loadConnections()}
                className="text-[10px] font-bold text-blue-500 hover:underline uppercase tracking-wider"
              >
                Odśwież
              </button>
            )}
          </div>

          {isLoadingConnections ? (
            <div className="flex items-center gap-2 py-2">
              <Spinner className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-slate-400">Wyszukiwanie połączeń...</span>
            </div>
          ) : platformConnections.length === 0 ? (
            <div className="flex flex-col items-center gap-3 text-center py-2">
              <p className="text-xs text-slate-500">
                Brak połączonego konta dla platformy {formData.platform}.
              </p>
              <ModernButton
                onClick={() => void handleConnectSocial(formData.platform.toLowerCase())}
                variant="secondary"
                size="sm"
                className="text-xs py-1.5 px-3"
              >
                Połącz konto {formData.platform}
              </ModernButton>
            </div>
          ) : platformConnections.length > 1 ? (
            <select
              value={selectedConnectionId}
              onChange={(e) => setSelectedConnectionId(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white"
            >
              {platformConnections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.accountName}
                </option>
              ))}
            </select>
          ) : (
            (() => {
              const conn = platformConnections[0];
              return (
                <div className="flex items-center gap-3 bg-white dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300">
                    {conn.profileImageUrl ? (
                      <img
                        src={conn.profileImageUrl}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      conn.accountName?.[0] || '?'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                      {conn.accountName}
                    </p>
                    <p className="text-[9px] text-green-500 font-bold uppercase tracking-wider">
                      Połączono
                    </p>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ModernButton
          onClick={onSchedule}
          variant="secondary"
          fullWidth
          icon={<CalendarIcon className="w-4 h-4" />}
        >
          {t('resultCard.actions.schedule', 'Zaplanuj')}
        </ModernButton>
        <ModernButton
          onClick={() => onPublishNow(selectedConnectionId || undefined)}
          variant="primary"
          fullWidth
          disabled={platformConnections.length === 0}
          icon={<RocketLaunchIcon className="w-4 h-4" />}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {t('resultCard.publish.publishNow', 'Publikuj teraz')}
        </ModernButton>
      </div>

      <ModernButton
        onClick={onOpenRepurpose}
        variant="secondary"
        fullWidth
        icon={<LayersIcon className="w-4 h-4" />}
      >
        {t('resultCard.publish.repurpose', 'Przetwórz na inny format')}
      </ModernButton>
    </div>
  );
};
