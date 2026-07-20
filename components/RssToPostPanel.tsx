import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationType, Platform, Tone } from '../types';
import { generateRepurposingPlan } from '../services/contentRepurposingService';
import { fetchArticleOrRss } from '../services/rssToPostService';
import { SparklesIcon } from './icons/SparklesIcon';
import { ModernButton } from './ui/ModernButton';

export const RssToPostPanel: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useNotifications();
  const [url, setUrl] = useState('');
  const [pasted, setPasted] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConvert = async () => {
    if (!user?.id) {
      addToast(t('rss.loginRequired', 'Zaloguj się, aby kontynuować'), NotificationType.Info);
      return;
    }
    const sourceUrl = url.trim();
    let content = pasted.trim();

    setIsLoading(true);
    try {
      if (!content && sourceUrl) {
        const fetched = await fetchArticleOrRss(sourceUrl, user.id);
        content = fetched.text;
        if (fetched.title && !content.includes(fetched.title)) {
          content = `${fetched.title}\n\n${content}`;
        }
      }

      if (!content || content.length < 40) {
        addToast(
          t(
            'rss.needContent',
            'Wklej treść artykułu lub podaj URL, który da się pobrać (RSS/HTML).'
          ),
          NotificationType.Error
        );
        return;
      }

      const plan = await generateRepurposingPlan(
        content.slice(0, 12000),
        'blog',
        [Platform.LinkedIn, Platform.Instagram, Platform.Facebook],
        Tone.Professional,
        user.id
      );

      const first =
        plan.repurposedContent.find((c) => c.platform === Platform.LinkedIn) ||
        plan.repurposedContent[0];
      const topic =
        first?.content?.split('\n')[0]?.slice(0, 120) ||
        sourceUrl ||
        t('rss.defaultTopic', 'Post z artykułu / RSS');

      addToast(
        t('rss.ready', 'Gotowy draft — otwieram generator'),
        NotificationType.Success
      );

      navigate('/generator', {
        state: {
          prefillData: {
            topic,
            platform: first?.platform || Platform.LinkedIn,
            repurposeFrom: content.slice(0, 8000),
            keywords: first?.hashtags?.map((h) => h.replace(/^#/, '')).join(', ') || undefined,
          },
        },
      });
    } catch (e) {
      addToast(
        e instanceof Error ? e.message : t('rss.error', 'Nie udało się przetworzyć treści'),
        NotificationType.Error
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-premium p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
          <SparklesIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">
            {t('rss.title', 'RSS / Blog → Post')}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('rss.subtitle', 'Artykuł lub feed → gotowy szkic posta w generatorze')}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {t('rss.urlLabel', 'URL artykułu lub RSS')}
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {t('rss.pasteLabel', 'Lub wklej treść artykułu')}
          </label>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={4}
            placeholder={t('rss.pastePlaceholder', 'Wklej tekst, jeśli URL nie da się pobrać…')}
            className="mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm resize-y"
          />
        </div>
        <ModernButton
          type="button"
          variant="gradient"
          fullWidth
          disabled={isLoading || (!url.trim() && pasted.trim().length < 40)}
          onClick={() => void handleConvert()}
          icon={<SparklesIcon className="w-5 h-5" />}
        >
          {isLoading
            ? t('rss.converting', 'Przetwarzam…')
            : t('rss.convert', 'Zrób post z artykułu')}
        </ModernButton>
      </div>
    </div>
  );
};
