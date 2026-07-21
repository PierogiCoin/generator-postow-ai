import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationType, Platform, Tone } from '../types';
import { generateRepurposingPlan } from '../services/contentRepurposingService';
import { SparklesIcon } from './icons/SparklesIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { ModernButton } from './ui/ModernButton';

/**
 * Product → Post (Shopify / Woo / dowolny produkt).
 * Bez natywnego API sklepu — wklejasz dane produktu lub URL oferty.
 */
export const ProductToPostPanel: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useNotifications();
  const [expanded, setExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [benefits, setBenefits] = useState('');

  const handleConvert = async () => {
    if (!user?.id) {
      addToast('Zaloguj się, aby kontynuować', NotificationType.Info);
      return;
    }
    if (!name.trim() || name.trim().length < 2) {
      addToast('Podaj nazwę produktu', NotificationType.Error);
      return;
    }

    const content = [
      `PRODUKT: ${name.trim()}`,
      price.trim() ? `CENA: ${price.trim()}` : '',
      url.trim() ? `URL: ${url.trim()}` : '',
      description.trim() ? `OPIS:\n${description.trim()}` : '',
      benefits.trim() ? `BENEFITY / USP:\n${benefits.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    setIsLoading(true);
    try {
      const plan = await generateRepurposingPlan(
        content.slice(0, 12000),
        'long_post',
        [Platform.Instagram, Platform.Facebook, Platform.TikTok],
        Tone.Persuasive,
        user.id
      );

      const first =
        plan.repurposedContent.find((c) => c.platform === Platform.Instagram) ||
        plan.repurposedContent[0];

      addToast('Gotowy draft produktu — otwieram generator', NotificationType.Success);

      navigate('/generator', {
        state: {
          prefillData: {
            topic: first?.content?.split('\n')[0]?.slice(0, 120) || `Post produktowy: ${name.trim()}`,
            platform: first?.platform || Platform.Instagram,
            repurposeFrom: content.slice(0, 8000),
            keywords: first?.hashtags?.map((h) => h.replace(/^#/, '')).join(', ') || undefined,
            ctaUrl: url.trim() || undefined,
          },
        },
      });
    } catch (e) {
      addToast(
        e instanceof Error ? e.message : 'Nie udało się przetworzyć produktu',
        NotificationType.Error
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-premium p-6 md:p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 text-left"
        aria-expanded={expanded}
      >
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
          <SparklesIcon className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-900 dark:text-white">Produkt → Post</p>
          <p className="text-xs text-slate-500">
            Shopify / Woo / własny sklep — wklej dane produktu
          </p>
        </div>
        <ChevronDownIcon
          className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="mt-5 space-y-3 animate-fade-in">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nazwa produktu *"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-3 py-2.5 text-sm"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Cena (np. 149 zł)"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-3 py-2.5 text-sm"
            />
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="URL produktu (Shopify/Woo)"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-3 py-2.5 text-sm"
            />
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Krótki opis produktu"
            rows={3}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-3 py-2.5 text-sm resize-y"
          />
          <textarea
            value={benefits}
            onChange={(e) => setBenefits(e.target.value)}
            placeholder="Benefity / USP (po przecinku lub w liniach)"
            rows={2}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 px-3 py-2.5 text-sm resize-y"
          />
          <ModernButton
            onClick={() => void handleConvert()}
            disabled={isLoading}
            variant="primary"
            fullWidth
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? 'Generuję…' : 'Zrób post z produktu'}
          </ModernButton>
        </div>
      )}
    </div>
  );
};
