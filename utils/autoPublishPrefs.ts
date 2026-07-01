const KEY = 'so_auto_publish_prefs';

export interface AutoPublishPrefs {
  autoPublishToConnected: boolean;
  autoOptimizePerPlatform: boolean;
}

const DEFAULTS: AutoPublishPrefs = {
  autoPublishToConnected: false,
  autoOptimizePerPlatform: true,
};

export function loadAutoPublishPrefs(): AutoPublishPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<AutoPublishPrefs>;
    return {
      autoPublishToConnected: Boolean(parsed.autoPublishToConnected),
      autoOptimizePerPlatform: parsed.autoOptimizePerPlatform !== false,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAutoPublishPrefs(prefs: AutoPublishPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota errors
  }
}
