import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCwIcon } from './icons/RefreshCwIcon';
import { CURRENT_BUILD_ID, fetchRemoteBuildInfo, isNewerBuildAvailable } from '../utils/appVersion';
import type { RemoteBuildInfo } from '../utils/appVersion';

const CHECK_INTERVAL_MS = 3 * 60 * 1000;
const DISMISS_KEY = 'app_version_banner_dismissed';

export const AppVersionBanner: React.FC = () => {
  const { t } = useTranslation();
  const [remote, setRemote] = useState<RemoteBuildInfo | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const check = async () => {
      const info = await fetchRemoteBuildInfo();
      if (info && isNewerBuildAvailable(info)) {
        setRemote(info);
      }
    };

    void check();
    const timer = setInterval(() => void check(), CHECK_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  if (!remote || dismissedId === remote.buildId) return null;

  const changelog =
    remote.changelog ||
    t('appVersion.defaultChangelog', 'Nowa wersja — m.in. lepsze komunikaty błędów i tryb Szybki w generatorze.');

  return (
    <div
      role="status"
      className="fixed top-16 left-0 right-0 z-[55] px-4 py-3 text-white shadow-lg border-b border-white/10 animate-fade-in"
      style={{ backgroundColor: 'var(--hero-navy)' }}
    >
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {t('appVersion.title', 'Dostępna nowa wersja aplikacji')}
          </p>
          <p className="text-xs text-white/75 mt-0.5">{changelog}</p>
          <p className="text-[10px] text-white/50 mt-1 font-mono">
            {CURRENT_BUILD_ID} → {remote.buildId}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold hover:brightness-110 transition-colors touch-manipulation"
            style={{ backgroundColor: 'var(--hero-accent)', color: '#fff' }}
          >
            <RefreshCwIcon className="w-4 h-4" />
            {t('appVersion.refresh', 'Odśwież teraz')}
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.setItem(DISMISS_KEY, remote.buildId);
              } catch {
                /* ignore */
              }
              setDismissedId(remote.buildId);
            }}
            className="min-h-[40px] px-3 py-2 rounded-lg text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-colors touch-manipulation"
          >
            {t('appVersion.later', 'Później')}
          </button>
        </div>
      </div>
    </div>
  );
};
