import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Link2, Loader2 } from 'lucide-react';
import type { FormData } from '../../types';
import type { SocialConnection } from '../../types/socialPublishing';
import { socialConnectionsService } from '../../services/socialConnectionsService';
import { socialPlatformToPlatform } from '../../services/autoPublishService';
import { AUTO_PUBLISH_MIN_SCORE } from '../../services/contentScoringService';
import { useUIStore } from '../../stores/uiStore';

const PLATFORM_ICONS: Record<string, string> = {
  facebook: '👥',
  instagram: '📸',
  twitter: '𝕏',
  linkedin: '💼',
  tiktok: '🎵',
};

interface AutoPublishSectionProps {
  formData: FormData;
  userId?: string;
  disabled?: boolean;
  onToggleAutoPublish: (enabled: boolean) => void;
  onToggleAutoOptimize: (enabled: boolean) => void;
}

export const AutoPublishSection: React.FC<AutoPublishSectionProps> = ({
  formData,
  userId,
  disabled,
  onToggleAutoPublish,
  onToggleAutoOptimize,
}) => {
  const { t } = useTranslation();
  const setIsSocialConnectionsModalOpen = useUIStore((s) => s.setIsSocialConnectionsModalOpen);
  const [connections, setConnections] = useState<SocialConnection[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setConnections([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    socialConnectionsService
      .getConnections(userId)
      .then((data) => {
        if (!cancelled) setConnections(data);
      })
      .catch(() => {
        if (!cancelled) setConnections([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const publishableCount = connections.filter((c) =>
    socialPlatformToPlatform(c.platform) !== null
  ).length;

  return (
    <div className="p-5 rounded-2xl border-2 border-emerald-500/20 bg-emerald-500/5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
              {t('form.autoPublish.title', 'Automatyczna publikacja')}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t(
                'form.autoPublish.description',
                'Po wygenerowaniu treść trafi od razu na połączone konta.'
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={formData.autoPublishToConnected}
          disabled={disabled || !userId}
          onClick={() => onToggleAutoPublish(!formData.autoPublishToConnected)}
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
            formData.autoPublishToConnected
              ? 'bg-emerald-500'
              : 'bg-slate-300 dark:bg-slate-600'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
              formData.autoPublishToConnected ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {formData.autoPublishToConnected && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {t(
              'form.autoPublish.qualityGateHint',
              'Publikacja nastąpi tylko przy ocenie ≥ {{min}} w bramie jakości.',
              { min: AUTO_PUBLISH_MIN_SCORE }
            )}
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.autoOptimizePerPlatform !== false}
              onChange={(e) => onToggleAutoOptimize(e.target.checked)}
              disabled={disabled || publishableCount <= 1}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {t(
                'form.autoPublish.optimizePerPlatform',
                'Dostosuj treść do każdej platformy przed publikacją'
              )}
            </span>
          </label>

          {loading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              {t('form.autoPublish.loadingAccounts', 'Ładowanie kont…')}
            </div>
          ) : connections.length === 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {t('form.autoPublish.noAccounts', 'Brak połączonych kont.')}
              </p>
              <button
                type="button"
                onClick={() => setIsSocialConnectionsModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <Link2 className="w-3 h-3" />
                {t('form.autoPublish.connectAccounts', 'Połącz konta')}
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {connections.map((conn) => (
                <span
                  key={conn.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                >
                  <span>{PLATFORM_ICONS[conn.platform] ?? '🔗'}</span>
                  {conn.accountName}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
