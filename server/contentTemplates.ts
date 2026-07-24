// 🎨 CONTENT TEMPLATES & PRESETS
// Szablony dla szybkiego tworzenia contentu

export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  platform: string;
  tone: string;
  style: string;
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:5';
  includeMusic: boolean;
  includeHashtags: boolean;
  hashtagCount: number;
  videoLength?: 'short' | 'medium' | 'long'; // 5s, 15s, 30s
  icon: string;
  category: 'social' | 'professional' | 'marketing' | 'educational' | 'industry';
  /** Prefill topic / niche hint for PL industry packs */
  topicHint?: string;
  /** Curated topic chips for industry packs */
  topicIdeas?: string[];
  /** Keywords used by matchIndustryPack / for-niche */
  nicheKeywords?: string[];
}

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  // 🎵 VIRAL SOCIAL MEDIA
  {
    id: 'viral-tiktok',
    name: 'Viral TikTok Pack',
    description: 'Krótkie, dynamiczne video z muzyką i trendy hashtagami',
    platform: 'TikTok',
    tone: 'Casual',
    style: 'Bold',
    aspectRatio: '9:16',
    includeMusic: true,
    includeHashtags: true,
    hashtagCount: 8,
    videoLength: 'short',
    icon: '🎵',
    category: 'social'
  },
  {
    id: 'instagram-reels',
    name: 'Instagram Reels',
    description: 'Estetyczne, wysokiej jakości reels z subtelną muzyką',
    platform: 'Instagram',
    tone: 'Casual',
    style: 'Aesthetic',
    aspectRatio: '9:16',
    includeMusic: true,
    includeHashtags: true,
    hashtagCount: 10,
    videoLength: 'short',
    icon: '📸',
    category: 'social'
  },
  {
    id: 'youtube-shorts',
    name: 'YouTube Shorts',
    description: 'Krótkie, angażujące filmy pionowe',
    platform: 'YouTube',
    tone: 'Enthusiastic',
    style: 'Dynamic',
    aspectRatio: '9:16',
    includeMusic: true,
    includeHashtags: true,
    hashtagCount: 5,
    videoLength: 'short',
    icon: '📹',
    category: 'social'
  },

  // 💼 PROFESSIONAL CONTENT
  {
    id: 'linkedin-professional',
    name: 'LinkedIn Professional',
    description: 'Formalny, biznesowy content bez muzyki',
    platform: 'LinkedIn',
    tone: 'Formal',
    style: 'Professional',
    aspectRatio: '16:9',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 3,
    videoLength: 'medium',
    icon: '💼',
    category: 'professional'
  },
  {
    id: 'linkedin-thought-leader',
    name: 'LinkedIn Thought Leader',
    description: 'Ekspercki content z insights i case studies',
    platform: 'LinkedIn',
    tone: 'Professional',
    style: 'Authoritative',
    aspectRatio: '1:1',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 5,
    videoLength: 'long',
    icon: '🎓',
    category: 'professional'
  },

  // 🛍️ MARKETING & PROMOTIONAL
  {
    id: 'facebook-ad',
    name: 'Facebook Ad Campaign',
    description: 'Promocyjny content z CTA i wyraźnym przekazem',
    platform: 'Facebook',
    tone: 'Persuasive',
    style: 'Bold',
    aspectRatio: '1:1',
    includeMusic: false,
    includeHashtags: false,
    hashtagCount: 0,
    videoLength: 'short',
    icon: '🎯',
    category: 'marketing'
  },
  {
    id: 'instagram-story',
    name: 'Instagram Story Blitz',
    description: 'Szybkie, dynamiczne stories z quick cuts',
    platform: 'Instagram',
    tone: 'Casual',
    style: 'Dynamic',
    aspectRatio: '9:16',
    includeMusic: true,
    includeHashtags: false,
    hashtagCount: 0,
    videoLength: 'short',
    icon: '⚡',
    category: 'marketing'
  },
  {
    id: 'product-showcase',
    name: 'Product Showcase',
    description: 'Prezentacja produktu z detalami i benefitami',
    platform: 'Instagram',
    tone: 'Professional',
    style: 'Clean',
    aspectRatio: '4:5',
    includeMusic: true,
    includeHashtags: true,
    hashtagCount: 6,
    videoLength: 'medium',
    icon: '🛍️',
    category: 'marketing'
  },

  // 📚 EDUCATIONAL
  {
    id: 'tutorial-quick',
    name: 'Quick Tutorial',
    description: 'Krótki tutorial lub how-to guide',
    platform: 'YouTube',
    tone: 'Friendly',
    style: 'Educational',
    aspectRatio: '16:9',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 4,
    videoLength: 'medium',
    icon: '📚',
    category: 'educational'
  },
  {
    id: 'explainer-video',
    name: 'Explainer Video',
    description: 'Wyjaśnienie koncepcji lub procesu',
    platform: 'YouTube',
    tone: 'Professional',
    style: 'Clear',
    aspectRatio: '16:9',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 5,
    videoLength: 'long',
    icon: '💡',
    category: 'educational'
  },

  // 🇵🇱 BRANŻE PL — starter packs
  {
    id: 'pl-fryzjer',
    name: 'Fryzjer / beauty',
    description: 'Promocje, metamorfozy, tipy pielęgnacyjne — Instagram + Stories',
    platform: 'Instagram',
    tone: 'Casual',
    style: 'Aesthetic',
    aspectRatio: '4:5',
    includeMusic: true,
    includeHashtags: true,
    hashtagCount: 12,
    videoLength: 'short',
    icon: '💇',
    category: 'industry',
    topicHint: 'Salon fryzjerski: pokaż metamorfozę / promocję sezonową / tip pielęgnacyjny dla klientek w PL',
    nicheKeywords: [
      'fryzjer', 'beauty', 'uroda', 'salon', 'paznokcie', 'manicure', 'barber',
      'kosmetycz', 'włos', 'makeup', 'makijaż', 'spa', 'pielęgnac',
    ],
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
    id: 'pl-lokal',
    name: 'Lokal / gastronomia',
    description: 'Menu dnia, atmosfera, wydarzenia — Facebook + Instagram',
    platform: 'Facebook',
    tone: 'Friendly',
    style: 'Warm',
    aspectRatio: '1:1',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 8,
    videoLength: 'short',
    icon: '🍽️',
    category: 'industry',
    topicHint: 'Lokal gastronomiczny w Polsce: menu dnia, nowość w karcie lub zaproszenie na event',
    nicheKeywords: [
      'gastro', 'gastronom', 'restaurac', 'jedzenie', 'gotowanie', 'kawiarn', 'kawiarni',
      'food', 'bar', 'bistro', 'catering', 'kuchni', 'piekarn', 'cukierni', 'food truck',
      'lokal', 'menu', 'chef', 'cafe', 'coffee',
    ],
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
    id: 'pl-b2b-saas',
    name: 'B2B SaaS',
    description: 'Thought leadership, case study, CTA demo — LinkedIn',
    platform: 'LinkedIn',
    tone: 'Professional',
    style: 'Authoritative',
    aspectRatio: '1:1',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 5,
    videoLength: 'medium',
    icon: '🚀',
    category: 'industry',
    topicHint: 'Polski SaaS B2B: insight rynkowy, mini case study lub zaproszenie na demo z konkretną korzyścią',
    nicheKeywords: [
      'saas', 'b2b', 'software', 'startup', 'technolog', 'it ', ' oprogramowan',
      'produkt cyfrowy', 'platforma', 'crm', 'automatyzac', 'devops', 'cloud',
    ],
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
    platform: 'Instagram',
    tone: 'Persuasive',
    style: 'Bold',
    aspectRatio: '9:16',
    includeMusic: true,
    includeHashtags: true,
    hashtagCount: 10,
    videoLength: 'short',
    icon: '🛒',
    category: 'industry',
    topicHint: 'Sklep online PL: wyróżnij produkt, 3 benefity i CTA z linkiem do oferty',
    nicheKeywords: [
      'e-commer', 'ecommerce', 'ecom', 'sklep', 'online', 'sprzedaż', 'produkt',
      'dropship', 'marketplace', 'fashion shop', 'buty', 'odzież', 'sklep internet',
    ],
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

// Helper functions
export function getTemplateById(id: string): ContentTemplate | undefined {
  return CONTENT_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): ContentTemplate[] {
  return CONTENT_TEMPLATES.filter(t => t.category === category);
}

export function getTemplatesByPlatform(platform: string): ContentTemplate[] {
  return CONTENT_TEMPLATES.filter(t => t.platform === platform);
}

function normalizeNiche(niche: string): string {
  return niche
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}

/** Dopasuj industry pack do free-text niszy. */
export function matchIndustryPack(niche: string): ContentTemplate | null {
  const n = normalizeNiche(niche);
  if (!n || n === 'marketing') return null;

  const industry = getTemplatesByCategory('industry');
  let best: { template: ContentTemplate; score: number } | null = null;

  for (const template of industry) {
    const keywords = template.nicheKeywords ?? [];
    let score = 0;
    for (const kw of keywords) {
      const k = normalizeNiche(kw);
      if (!k) continue;
      if (n.includes(k) || k.includes(n)) score += k.length;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { template, score };
    }
  }
  return best?.template ?? null;
}

export function applyTemplate(template: ContentTemplate, userInput: Partial<ContentTemplate>): ContentTemplate {
  return {
    ...template,
    ...userInput
  };
}
