import React, { useState } from 'react';
import { ModernButton } from './ui/ModernButton';
import { ModernInput } from './ui/ModernInput';
import { ingestBrandMemory } from '../services/brandMemoryService';
import { getApiBaseUrl, getApiAuthHeaders } from '../services/apiClient';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationType } from '../types';

interface BrandMemoryIngestPanelProps {
  userId?: string | null;
  defaultTitle?: string;
  websiteUrl?: string;
}

type IngestMode = 'manual' | 'url';

/**
 * Dodaje dokumenty do Brand Memory (menu, o firmie, FAQ) — wykorzystywane w generacji RAG.
 */
export const BrandMemoryIngestPanel: React.FC<BrandMemoryIngestPanelProps> = ({
  userId,
  defaultTitle,
  websiteUrl,
}) => {
  const { addToast } = useNotifications();
  const [mode, setMode] = useState<IngestMode>('manual');
  const [title, setTitle] = useState(defaultTitle ? `Menu / o nas — ${defaultTitle}` : '');
  const [excerpt, setExcerpt] = useState('');
  const [url, setUrl] = useState(websiteUrl || '');
  const [busy, setBusy] = useState(false);

  const saveManual = async () => {
    if (!userId) {
      addToast('Zaloguj się, aby zapisać pamięć marki.', NotificationType.Error);
      return;
    }
    const text = excerpt.trim();
    if (text.length < 20) {
      addToast('Wklej co najmniej 20 znaków (menu, opis lokalu, FAQ…).', NotificationType.Error);
      return;
    }
    setBusy(true);
    try {
      const id = await ingestBrandMemory(userId, {
        sourceType: 'manual',
        excerpt: text.slice(0, 12000),
        title: title.trim() || 'Notatka marki',
      });
      if (!id) throw new Error('Nie udało się zapisać');
      addToast('Dodano do pamięci marki — AI użyje tego przy generacji.', NotificationType.Success);
      setExcerpt('');
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Błąd zapisu pamięci marki', NotificationType.Error);
    } finally {
      setBusy(false);
    }
  };

  const saveFromUrl = async () => {
    if (!userId) {
      addToast('Zaloguj się, aby zapisać pamięć marki.', NotificationType.Error);
      return;
    }
    const target = url.trim();
    if (!/^https?:\/\//i.test(target)) {
      addToast('Podaj prawidłowy URL (https://…).', NotificationType.Error);
      return;
    }
    setBusy(true);
    try {
      const headers = await getApiAuthHeaders(userId);
      const res = await fetch(`${getApiBaseUrl()}/api/content/fetch-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        credentials: 'include',
        body: JSON.stringify({ url: target }),
      });
      const data = (await res.json().catch(() => ({}))) as { text?: string; title?: string; message?: string };
      if (!res.ok) throw new Error(data.message || 'Nie udało się pobrać strony');
      const text = (data.text || '').trim();
      if (text.length < 40) throw new Error('Za mało tekstu na stronie');

      const id = await ingestBrandMemory(userId, {
        sourceType: 'url',
        excerpt: text.slice(0, 12000),
        title: title.trim() || data.title || target,
        sourceUrl: target,
      });
      if (!id) throw new Error('Nie udało się zapisać');
      addToast('Strona zapisana w pamięci marki.', NotificationType.Success);
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : 'Błąd pobierania URL', NotificationType.Error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 space-y-3">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Pamięć marki</p>
        <p className="text-xs text-slate-500 mt-1">
          Wklej menu, opis lokalu lub FAQ — albo pobierz treść ze strony. AI użyje tego przy kolejnych postach.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${
            mode === 'manual'
              ? 'border-[var(--hero-accent)] text-[var(--hero-accent)] bg-[var(--hero-accent-soft)]'
              : 'border-slate-200 dark:border-slate-700 text-slate-500'
          }`}
        >
          Wklej tekst
        </button>
        <button
          type="button"
          onClick={() => setMode('url')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${
            mode === 'url'
              ? 'border-[var(--hero-accent)] text-[var(--hero-accent)] bg-[var(--hero-accent-soft)]'
              : 'border-slate-200 dark:border-slate-700 text-slate-500'
          }`}
        >
          Ze strony URL
        </button>
      </div>

      <ModernInput
        label="Tytuł dokumentu"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="np. Menu wiosenne 2026"
      />

      {mode === 'manual' ? (
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={5}
          className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-lg p-3 text-sm focus:border-[var(--hero-accent)] outline-none"
          placeholder="Np. Menu dnia: żurek 18 zł, schabowy 32 zł…&#10;Godziny: 12–22, rezerwacje: …"
        />
      ) : (
        <ModernInput
          label="URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://twojlokal.pl/menu"
        />
      )}

      <ModernButton
        type="button"
        variant="secondary"
        size="sm"
        disabled={busy || !userId}
        onClick={() => void (mode === 'manual' ? saveManual() : saveFromUrl())}
      >
        {busy ? 'Zapisywanie…' : 'Dodaj do pamięci marki'}
      </ModernButton>
    </div>
  );
};
