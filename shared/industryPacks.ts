/**
 * Wspólne definicje branżowych starter packów (FE + backend).
 * Bez zależności od React / Platform enum — stringi mapowane w warstwie UI/API.
 */

export type IndustryPackId =
  | 'pl-lokal'
  | 'pl-fryzjer'
  | 'pl-b2b-saas'
  | 'pl-ecom'
  | 'pl-fitness'
  | 'pl-moda'
  | 'pl-edukacja'
  | 'pl-finanse';

export type IndustrySubNicheId =
  | 'gastro-restauracja'
  | 'gastro-kawiarnia'
  | 'gastro-foodtruck'
  | 'gastro-piekarnia';

export interface IndustryPackDef {
  id: IndustryPackId;
  name: string;
  description: string;
  icon: string;
  platform: string;
  tone: string;
  style: string;
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:5';
  includeMusic: boolean;
  includeHashtags: boolean;
  hashtagCount: number;
  videoLength?: 'short' | 'medium' | 'long';
  nicheKeywords: string[];
  topicHint: string;
  topicIdeas: string[];
}

export interface IndustrySubNicheDef {
  id: IndustrySubNicheId;
  parentPackId: IndustryPackId;
  label: string;
  icon: string;
  nicheKeywords: string[];
  topicIdeas: string[];
}

export const INDUSTRY_PACK_DEFS: IndustryPackDef[] = [
  {
    id: 'pl-lokal',
    name: 'Lokal / gastronomia',
    description: 'Menu dnia, atmosfera, wydarzenia — Facebook + Instagram',
    icon: '🍽️',
    platform: 'Facebook',
    tone: 'Casual',
    style: 'Warm',
    aspectRatio: '1:1',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 8,
    videoLength: 'short',
    nicheKeywords: [
      'gastro', 'gastronom', 'restaurac', 'jedzenie', 'gotowanie', 'kawiarn',
      'food', 'bar', 'bistro', 'catering', 'kuchni', 'piekarn', 'cukierni', 'food truck',
      'foodtruck', 'lokal gastr', 'menu dnia', 'chef', 'cafe', 'coffee',
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
    platform: 'Instagram',
    tone: 'Casual',
    style: 'Aesthetic',
    aspectRatio: '4:5',
    includeMusic: true,
    includeHashtags: true,
    hashtagCount: 12,
    videoLength: 'short',
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
    platform: 'LinkedIn',
    tone: 'Professional',
    style: 'Authoritative',
    aspectRatio: '1:1',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 5,
    videoLength: 'medium',
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
    platform: 'Instagram',
    tone: 'Persuasive',
    style: 'Bold',
    aspectRatio: '9:16',
    includeMusic: true,
    includeHashtags: true,
    hashtagCount: 10,
    videoLength: 'short',
    nicheKeywords: [
      'e-commer', 'ecommerce', 'ecom', 'sklep online', 'sklep internet', 'dropship',
      'marketplace', 'sprzedaż online',
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
  {
    id: 'pl-fitness',
    name: 'Fitness & zdrowie',
    description: 'Treningi, nawyki, motywacja — Instagram / Reels',
    icon: '💪',
    platform: 'Instagram',
    tone: 'Inspirational',
    style: 'Dynamic',
    aspectRatio: '9:16',
    includeMusic: true,
    includeHashtags: true,
    hashtagCount: 10,
    videoLength: 'short',
    nicheKeywords: [
      'fitness', 'siłown', 'trening', 'zdrowie', 'workout', 'crossfit', 'yoga',
      'odchudz', 'dieta', 'trener personal', 'wellness', 'sport',
    ],
    topicHint: 'Trener / studio fitness PL: krótki trening, mit vs fakt lub wyzwanie tygodnia',
    topicIdeas: [
      'Mini trening 5 minut — 3 ćwiczenia z opisem',
      'Mit vs fakt o treningu / diecie',
      'Wyzwanie tygodnia — cel i jak dołączyć',
      'Transformacja podopiecznego — historia + CTA konsultacja',
      'Nawyk dnia: co robić rano dla energii',
      'Błąd początkujących na siłowni (i poprawka)',
      'Przepis / posiłek okołotreningowy',
      'Behind the scenes sesji z klientem',
      'Q&A: najczęstsze pytanie o kontuzje / regenerację',
      'Oferta: pakiet treningów / trial — deadline',
    ],
  },
  {
    id: 'pl-moda',
    name: 'Moda & lifestyle',
    description: 'Lookbook, styling, dropy — Instagram / TikTok',
    icon: '👗',
    platform: 'Instagram',
    tone: 'Casual',
    style: 'Aesthetic',
    aspectRatio: '4:5',
    includeMusic: true,
    includeHashtags: true,
    hashtagCount: 12,
    videoLength: 'short',
    nicheKeywords: [
      'moda', 'fashion', 'styling', 'ubrania', 'odzież', 'lookbook', 'streetwear',
      'lifestyle', 'outfit', 'butik', 'biżuteri',
    ],
    topicHint: 'Marka fashion PL: styling 3 sposobów noszenia, drop lub behind the scenes kolekcji',
    topicIdeas: [
      '1 rzecz — 3 stylingi na różne okazje',
      'Drop / nowa kolekcja — preview i data',
      'Outfit of the day z CTA do sklepu',
      'Jak dobrać rozmiar — krótki poradnik',
      'Behind the scenes sesji zdjęciowej',
      'Sezonowe must-have — top 3',
      'Historia tkaniny / lokalnego dostawcy',
      'Styling na pracę vs wyjście wieczorem',
      'Opinia klientki + zdjęcie stylizacji',
      'Limited edition — ile sztuk zostało',
    ],
  },
  {
    id: 'pl-edukacja',
    name: 'Edukacja & kursy',
    description: 'Lekcje, tipy, CTA do kursu — LinkedIn / Instagram',
    icon: '📚',
    platform: 'LinkedIn',
    tone: 'Professional',
    style: 'Educational',
    aspectRatio: '1:1',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 5,
    videoLength: 'medium',
    nicheKeywords: [
      'edukac', 'kurs', 'szkolen', 'naucz', 'mentor', 'coaching', 'lekcj',
      'akademia', 'e-learning', 'webinar', 'studia',
    ],
    topicHint: 'Edukator PL: jedna lekcja w 60 sekund, checklista lub zaproszenie na webinar',
    topicIdeas: [
      'Lekcja w 60 sekund — 1 koncepcja + przykład',
      'Checklist: 5 kroków do opanowania X',
      'Błąd, który widzę u 80% kursantów',
      'Case study kursanta — przed/po',
      'Zaproszenie na webinar / live — data i benefit',
      'Fragment kursu — sneak peek',
      'FAQ o programie / certyfikacie',
      'Mapa nauki na 7 dni',
      'Książka / źródło, które polecam w tym temacie',
      'Oferta early bird — do kiedy',
    ],
  },
  {
    id: 'pl-finanse',
    name: 'Finanse osobiste',
    description: 'Oszczędności, mity, narzędzia — Instagram / LinkedIn',
    icon: '💰',
    platform: 'Instagram',
    tone: 'Professional',
    style: 'Clear',
    aspectRatio: '1:1',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 6,
    videoLength: 'short',
    nicheKeywords: [
      'finanse', 'inwestyc', 'oszczęd', 'budżet', 'kredyt', 'podatk',
      'ubezpiecz', 'emerytur', 'pieniądz', 'bankowość', 'fintech',
    ],
    topicHint: 'Edukacja finansowa PL: mit vs fakt, mini kalkulacja lub tip budżetowy bez jargonu',
    topicIdeas: [
      'Mit vs fakt o oszczędzaniu / inwestowaniu',
      'Mini kalkulacja: ile zyskasz odkładając X miesięcznie',
      '3 wydatki, które zjada Twój budżet',
      'Checklist: co sprawdzić przed kredytem',
      'Prosty system budżetu na 15 minut tygodnia',
      'Błąd początkującego inwestora',
      'Q&A: pytanie o podatek / PIT',
      'Narzędzie / appka, którą polecam do finansów',
      'Historia: jak klient uporządkował finanse w 90 dni',
      'Live / konsultacja — jak się zapisać',
    ],
  },
];

/** Podbranże gastro — nadpisują topicIdeas packa pl-lokal */
export const INDUSTRY_SUB_NICHES: IndustrySubNicheDef[] = [
  {
    id: 'gastro-restauracja',
    parentPackId: 'pl-lokal',
    label: 'Restauracja',
    icon: '🍝',
    nicheKeywords: ['restaurac', 'bistro', 'fine dining', 'trattoria', 'karczm'],
    topicIdeas: [
      'Menu degustacyjne / set wieczorny — co wchodzi i cena',
      'Danie signature szefa — historia i składniki',
      'Rezerwacje weekend — stoliki i dress code',
      'Wino tygodnia / para do dania głównego',
      'Event prywatny / stoliki firmowe — zapytaj o ofertę',
      'Behind the scenes passu w godzinach szczytu',
      'Recenzja gościa + odpowiedź restauracji',
      'Sezonowa karta — co znika po miesiącu',
    ],
  },
  {
    id: 'gastro-kawiarnia',
    parentPackId: 'pl-lokal',
    label: 'Kawiarnia',
    icon: '☕',
    nicheKeywords: ['kawiarn', 'cafe', 'coffee', 'kawa', 'barista', 'specialty coffee'],
    topicIdeas: [
      'Kawa tygodnia — origin, nuty smakowe, metoda',
      'Nowy wypiek / ciastko dnia z kawą',
      'Latte art tip — 1 trick dla domowej kawy',
      'Atmosfera do pracy — Wi‑Fi, gniazdka, godziny ciszy',
      'Happy hour na cold brew / matchę',
      'Poznaj baristę — ulubiona kawa i dlaczego',
      'Brunch w weekend — menu i rezerwacje',
      'Ziarna od lokalnego wypalacza — skąd pochodzą',
    ],
  },
  {
    id: 'gastro-foodtruck',
    parentPackId: 'pl-lokal',
    label: 'Food truck',
    icon: '🚚',
    nicheKeywords: ['food truck', 'foodtruck', 'street food', 'van gastr', 'food van'],
    topicIdeas: [
      'Gdzie stoimy dziś — lokalizacja + godziny',
      'Hit dnia z food trucka — cena i skład',
      'Mapa wydarzeń / festiwali w tym tygodniu',
      'Combo na wynos — szybkie CTA',
      'Behind the scenes przygotowania przed eventem',
      'Nowa lokalizacja na stałe? Zagłosuj',
      'Recenzja z festiwalu + fotka kolejki',
      'Hiring na sezon — stanowisko i jak aplikować',
    ],
  },
  {
    id: 'gastro-piekarnia',
    parentPackId: 'pl-lokal',
    label: 'Piekarnia / cukiernia',
    icon: '🥐',
    nicheKeywords: ['piekarn', 'cukierni', 'pieczywo', 'croissant', 'tort', 'wypiek', 'bakery'],
    topicIdeas: [
      'Świeże wypieki o 7:00 — co dziś z pieca',
      'Tort na zamówienie — smaki i lead time',
      'Chleb dnia / zakwas — historia bochenka',
      'Sezonowe ciastko — limitowana partia',
      'Pakiet śniadaniowy na wynos',
      'Behind the scenes nocnego wypieku',
      'Preorder na święta / weekend — do kiedy',
      'Poznaj piekarza — ulubiony wypiek',
    ],
  },
];

export function normalizeNicheText(niche: string): string {
  return niche
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();
}

function scoreKeywords(normalizedNiche: string, keywords: string[]): number {
  let score = 0;
  for (const kw of keywords) {
    const k = normalizeNicheText(kw);
    if (!k) continue;
    if (normalizedNiche.includes(k) || k.includes(normalizedNiche)) score += k.length;
  }
  return score;
}

export function matchIndustryPackDef(niche: string): IndustryPackDef | null {
  const n = normalizeNicheText(niche);
  if (!n || n === 'marketing') return null;

  let best: { pack: IndustryPackDef; score: number } | null = null;
  for (const pack of INDUSTRY_PACK_DEFS) {
    const score = scoreKeywords(n, pack.nicheKeywords);
    if (score > 0 && (!best || score > best.score)) {
      best = { pack, score };
    }
  }
  return best?.pack ?? null;
}

export function matchIndustrySubNiche(niche: string): IndustrySubNicheDef | null {
  const n = normalizeNicheText(niche);
  if (!n) return null;

  let best: { sub: IndustrySubNicheDef; score: number } | null = null;
  for (const sub of INDUSTRY_SUB_NICHES) {
    const score = scoreKeywords(n, sub.nicheKeywords);
    if (score > 0 && (!best || score > best.score)) {
      best = { sub, score };
    }
  }
  return best?.sub ?? null;
}

export function getSubNichesForPack(packId: IndustryPackId): IndustrySubNicheDef[] {
  return INDUSTRY_SUB_NICHES.filter((s) => s.parentPackId === packId);
}

/** Pack z topicIdeas nadpisanymi przez podbranżę (jeśli pasuje). */
export function resolveIndustryPackForNiche(niche: string): {
  pack: IndustryPackDef | null;
  subNiche: IndustrySubNicheDef | null;
} {
  const subNiche = matchIndustrySubNiche(niche);
  const pack =
    (subNiche && INDUSTRY_PACK_DEFS.find((p) => p.id === subNiche.parentPackId)) ||
    matchIndustryPackDef(niche);

  if (!pack) return { pack: null, subNiche: null };

  if (subNiche && subNiche.parentPackId === pack.id) {
    return {
      pack: {
        ...pack,
        topicIdeas: subNiche.topicIdeas,
        topicHint: `${pack.topicHint} (podbranża: ${subNiche.label})`,
      },
      subNiche,
    };
  }

  return { pack, subNiche: null };
}
