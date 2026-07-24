/**
 * Branżowe starter packi PL — źródło prawdy dla UX tworzenia treści.
 * Dopasowanie niszy → pack + gotowe pomysły tematów + prefill FormData.
 */

import { Platform, Tone, GenerationType, type FormData } from '../types';

export type IndustryPackId = 'pl-lokal' | 'pl-fryzjer' | 'pl-b2b-saas' | 'pl-ecom';

export interface IndustryPack {
  id: IndustryPackId;
  name: string;
  description: string;
  icon: string;
  platform: Platform;
  tone: Tone;
  /** Słowa kluczowe niszy (PL/EN) do matchowania */
  nicheKeywords: string[];
  topicHint: string;
  /** Gotowe tematy postów — chipy w UI */
  topicIdeas: string[];
}

export const INDUSTRY_PACKS: IndustryPack[] = [
  {
    id: 'pl-lokal',
    name: 'Lokal / gastronomia',
    description: 'Menu dnia, atmosfera, wydarzenia — Facebook + Instagram',
    icon: '🍽️',
    platform: Platform.Facebook,
    tone: Tone.Casual,
    nicheKeywords: [
      'gastro', 'gastronom', 'restaurac', 'jedzenie', 'gotowanie', 'kawiarn', 'kawiarni',
      'food', 'bar', 'bistro', 'catering', 'kuchni', 'piekarn', 'cukierni', 'food truck',
      'lokal', 'menu', 'chef', 'cafe', 'coffee',
    ],
    topicHint: 'Lokal gastronomiczny w Polsce: menu dnia, nowość w karcie lub zaproszenie na event',
    topicIdeas: [
      'Menu dnia — 3 dania, cena i zaproszenie na lunch',
      'Nowość w karcie: opisz smak, składniki i dla kogo jest idealna',
      'Behind the scenes kuchni — przygotowanie dania dnia',
      'Happy hour / event w lokalu — data, godzina, co na gości czeka',
      'Rezerwacje na weekend — zachęć do stolika i krótkie CTA',
      'Sezonowy produkt lub lokalny składnik w daniu tygodnia',
      'Recenzja gościa / social proof — cytat i odpowiedź lokalu',
      'Poznaj zespół — krótki portret kucharza lub baristy',
      'Atmosfera lokalu — story z wnętrza i zaproszenie wpadnij',
      'Hiring: szukamy do zespołu — rola, vibe, jak aplikować',
    ],
  },
  {
    id: 'pl-fryzjer',
    name: 'Fryzjer / beauty',
    description: 'Promocje, metamorfozy, tipy pielęgnacyjne — Instagram + Stories',
    icon: '💇',
    platform: Platform.Instagram,
    tone: Tone.Casual,
    nicheKeywords: [
      'fryzjer', 'beauty', 'uroda', 'salon', 'paznokcie', 'manicure', 'barber',
      'kosmetycz', 'włos', 'makeup', 'makijaż', 'spa', 'pielęgnac',
    ],
    topicHint: 'Salon fryzjerski: pokaż metamorfozę / promocję sezonową / tip pielęgnacyjny dla klientek w PL',
    topicIdeas: [
      'Metamorfoza klientki — przed/po i krótka historia zmiany',
      'Promocja sezonowa — co obejmuje i do kiedy',
      'Tip pielęgnacyjny: 3 kroki do zdrowych włosów w domu',
      'Trend fryzjerski miesiąca — dla kogo pasuje',
      'Behind the scenes salonu — przygotowanie stanowiska',
      'Poznaj stylistkę / barbera z zespołu',
      'FAQ: jak często strzyc / farbować',
      'Oferta dla panów / barber — klasyczny look',
      'Zaproszenie na konsultację kolorystyczną',
      'Hiring: szukamy stylisty — warunki i jak się zgłosić',
    ],
  },
  {
    id: 'pl-b2b-saas',
    name: 'B2B SaaS',
    description: 'Thought leadership, case study, CTA demo — LinkedIn',
    icon: '🚀',
    platform: Platform.LinkedIn,
    tone: Tone.Professional,
    nicheKeywords: [
      'saas', 'b2b', 'software', 'startup', 'technolog', 'it ', ' oprogramowan',
      'produkt cyfrowy', 'platforma', 'crm', 'automatyzac', 'devops', 'cloud',
    ],
    topicHint: 'Polski SaaS B2B: insight rynkowy, mini case study lub zaproszenie na demo z konkretną korzyścią',
    topicIdeas: [
      'Insight rynkowy: 1 teza + konkretna obserwacja z PL/CEE',
      'Mini case study: problem klienta → rozwiązanie → wynik liczbowy',
      '3 błędy, które spowalniają wdrożenie (i jak ich uniknąć)',
      'Zaproszenie na demo — konkretna korzyść w 15 minut',
      'Feature spotlight: co nowego i dla kogo',
      'Lekcja z supportu: pytanie, które słyszymy co tydzień',
      'Porównanie „zanim / potem” u klienta',
      'Checklist: czy Twój zespół jest gotowy na X',
      'Hiring: szukamy do product / sales / CS',
      'Podsumowanie miesiąca: metryka, którą warto śledzić',
    ],
  },
  {
    id: 'pl-ecom',
    name: 'E-commerce',
    description: 'Produkt, benefit, social proof — Instagram / TikTok',
    icon: '🛒',
    platform: Platform.Instagram,
    tone: Tone.Persuasive,
    nicheKeywords: [
      'e-commer', 'ecommerce', 'ecom', 'sklep', 'online', 'sprzedaż', 'produkt',
      'dropship', 'marketplace', 'fashion shop', 'buty', 'odzież', 'sklep internet',
    ],
    topicHint: 'Sklep online PL: wyróżnij produkt, 3 benefity i CTA z linkiem do oferty',
    topicIdeas: [
      'Produkt dnia: 3 benefity + CTA do oferty',
      'Unboxing / first look — co klient dostaje w paczce',
      'Social proof: opinia klienta i odpowiedź marki',
      'Porównanie wariantów — który wybrać i dlaczego',
      'Promocja limited — deadline i kod',
      'Behind the scenes pakowania / produkcji',
      'FAQ zakupowe: wysyłka, zwroty, rozmiary',
      'Stylizacja / use case — produkt w codziennym użyciu',
      'Bestsellery tygodnia — top 3 z krótkim uzasadnieniem',
      'Story z dostawy — od zamówienia do drzwi',
    ],
  },
];

function normalizeNiche(niche: string): string {
  return niche
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}

/** Dopasuj pack do free-text niszy; null gdy brak sensownego matcha. */
export function matchIndustryPack(niche: string): IndustryPack | null {
  const n = normalizeNiche(niche);
  if (!n || n === 'marketing') return null;

  let best: { pack: IndustryPack; score: number } | null = null;
  for (const pack of INDUSTRY_PACKS) {
    let score = 0;
    for (const kw of pack.nicheKeywords) {
      const k = normalizeNiche(kw);
      if (!k) continue;
      if (n.includes(k) || k.includes(n)) score += k.length;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { pack, score };
    }
  }
  return best?.pack ?? null;
}

export function getIndustryPackById(id: string): IndustryPack | undefined {
  return INDUSTRY_PACKS.find((p) => p.id === id);
}

export function getAllIndustryPacks(): IndustryPack[] {
  return INDUSTRY_PACKS;
}

/** Prefill FormData z packa (+ opcjonalny temat). */
export function industryPackToFormPrefill(
  pack: IndustryPack,
  topic?: string
): Partial<FormData> {
  const chosen = (topic?.trim() || pack.topicIdeas[0] || pack.topicHint).trim();
  return {
    topic: chosen.startsWith('<') ? chosen : `<p>${chosen}</p>`,
    platform: pack.platform,
    tone: pack.tone,
    audience: pack.name,
    generationType: GenerationType.PostWithImage,
  };
}

/** Pierwszy post po onboardingu — konkretny temat z packa zamiast generycznego „przedstaw się”. */
export function buildIndustryFirstPostTopic(niche: string, platform: Platform): string | null {
  const pack = matchIndustryPack(niche);
  if (!pack) return null;
  const idea = pack.topicIdeas[0] || pack.topicHint;
  return `<p>${idea}</p><p>Kontekst: nisza <strong>${niche.trim()}</strong>, platforma ${platform}.</p>`;
}
