import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { FormData, GenerationResult } from '../../types';
import { NotificationType } from '../../types';
import type { PublishFormat, SocialConnection, SocialPlatform } from '../../types/socialPublishing';
import { socialConnectionsService } from '../../services/socialConnectionsService';
import { ModernButton } from '../ui/ModernButton';
import { Spinner } from '../ui/LoadingStates';
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
  onPublishNow: (connectionId?: string, options?: { publishFormat?: PublishFormat }) => void;
  onOpenRepurpose: () => void;
  onToast: (message: string, type: NotificationType) => void;
}

function collectMediaUrls(result: GenerationResult): string[] {
  const urls: string[] = [];
  if (result.imageUrl) urls.push(result.imageUrl);
  if (Array.isArray(result.variants)) {
    for (const v of result.variants) {
      if (v?.imageUrl && !urls.includes(v.imageUrl)) urls.push(v.imageUrl);
    }
  }
  return urls;
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
  const [publishFormat, setPublishFormat] = useState<PublishFormat>('feed');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const mediaUrls = useMemo(() => collectMediaUrls(result), [result]);

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

  useEffect(() => {
    const p = (formData?.platform || '').toLowerCase();
    if ((p === 'tiktok' || p === 'youtube') && result.videoUrl) setPublishFormat('reel');
    else if (p === 'instagram' && mediaUrls.length > 1) setPublishFormat('carousel');
    else if (p === 'instagram' && result.videoUrl && !result.imageUrl) setPublishFormat('reel');
    else setPublishFormat('feed');
  }, [formData?.platform, result.videoUrl, result.imageUrl, mediaUrls.length]);

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

  const selectedConnection =
    platformConnections.find((c) => c.id === selectedConnectionId) || platformConnections[0];

  const platformLower = (formData?.platform || '').toLowerCase();
  const showIgFormats = platformLower === 'instagram';
  const showVideoFormats =
    platformLower === 'instagram' ||
    platformLower === 'facebook' ||
    platformLower === 'tiktok' ||
    platformLower === 'youtube';

  const handleConfirmPublish = () => {
    setConfirmOpen(false);
    onPublishNow(selectedConnectionId || undefined, { publishFormat });
  };

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
        </div>
      )}

      {/* Live publish preview */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {t('resultCard.publish.captionPreview', 'Podgląd publikacji')}
        </p>
        {(mediaUrls[0] || result.videoUrl) && (
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black/5 dark:bg-black/30">
            {result.videoUrl && (publishFormat === 'reel' || !mediaUrls[0]) ? (
              <video
                src={result.videoUrl}
                className="w-full max-h-56 object-contain bg-black"
                controls
                muted
                playsInline
              />
            ) : mediaUrls[0] ? (
              <img
                src={mediaUrls[0]}
                alt="Podgląd"
                className="w-full max-h-56 object-cover"
              />
            ) : null}
            {publishFormat === 'carousel' && mediaUrls.length > 1 && (
              <p className="text-[10px] font-bold text-center py-1.5 text-slate-500">
                Karuzela · {mediaUrls.length} slajdów
              </p>
            )}
          </div>
        )}
        <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
          {publishCaptionPreview}
        </p>
      </div>

      {showVideoFormats && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Format publikacji
          </p>
          <div className="flex flex-wrap gap-2">
            {(['feed', ...(showIgFormats ? (['carousel', 'story', 'reel'] as const) : []), ...(platformLower === 'facebook' || platformLower === 'tiktok' || platformLower === 'youtube' ? (['reel'] as const) : [])] as PublishFormat[])
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setPublishFormat(fmt)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition ${
                    publishFormat === fmt
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {fmt === 'feed' && 'Post'}
                  {fmt === 'carousel' && 'Karuzela'}
                  {fmt === 'story' && 'Story'}
                  {fmt === 'reel' && (platformLower === 'youtube' ? 'Short' : platformLower === 'tiktok' ? 'Wideo' : 'Reel')}
                </button>
              ))}
          </div>
          {publishFormat === 'carousel' && mediaUrls.length < 2 && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              Karuzela potrzebuje ≥2 obrazów (główny + warianty A/B).
            </p>
          )}
          {(publishFormat === 'reel' || platformLower === 'tiktok' || platformLower === 'youtube') && !result.videoUrl && (
            <p className="text-[10px] text-amber-600 dark:text-amber-400">
              Ten format wymaga wygenerowanego wideo.
            </p>
          )}
        </div>
      )}

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
          ) : (
            <select
              value={selectedConnectionId || platformConnections[0]?.id}
              onChange={(e) => setSelectedConnectionId(e.target.value)}
              className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white"
            >
              {platformConnections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.accountName}
                  {c.accountHandle ? ` (@${c.accountHandle})` : ''}
                </option>
              ))}
            </select>
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
          onClick={() => setConfirmOpen(true)}
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

      {confirmOpen && (
        <div className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="publish-confirm-title"
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700"
          >
            <h3 id="publish-confirm-title" className="text-lg font-bold text-slate-900 dark:text-white">
              Potwierdź publikację
            </h3>
            <p className="text-xs text-slate-500">
              {formData?.platform} · {selectedConnection?.accountName || 'konto'} · format:{' '}
              <span className="font-bold text-slate-700 dark:text-slate-200">{publishFormat}</span>
            </p>
            {(mediaUrls[0] || result.videoUrl) && (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                {result.videoUrl && publishFormat === 'reel' ? (
                  <video src={result.videoUrl} className="w-full max-h-40 object-contain bg-black" muted />
                ) : mediaUrls[0] ? (
                  <img src={mediaUrls[0]} alt="" className="w-full max-h-40 object-cover" />
                ) : null}
              </div>
            )}
            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-32 overflow-y-auto border border-slate-100 dark:border-slate-700 rounded-lg p-3">
              {publishCaptionPreview}
            </p>
            <div className="flex gap-2">
              <ModernButton variant="secondary" fullWidth onClick={() => setConfirmOpen(false)}>
                Anuluj
              </ModernButton>
              <ModernButton
                variant="primary"
                fullWidth
                onClick={handleConfirmPublish}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Publikuj
              </ModernButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
