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
  | 'pl-finanse'
  | 'pl-nieruchomosci'
  | 'pl-motoryzacja'
  | 'pl-medycyna'
  | 'pl-turystyka'
  | 'pl-budownictwo'
  | 'pl-prawo';

export type IndustrySubNicheId =
  | 'gastro-restauracja'
  | 'gastro-kawiarnia'
  | 'gastro-foodtruck'
  | 'gastro-piekarnia'
  | 'fitness-personalny'
  | 'fitness-yoga'
  | 'fitness-crossfit'
  | 'moda-butik'
  | 'moda-streetwear'
  | 'moda-bizuteria'
  | 'ecom-fashion'
  | 'ecom-electronics'
  | 'ecom-kosmetyki'
  | 'edukacja-online'
  | 'edukacja-szkolenia-b2b'
  | 'motoryzacja-warsztat'
  | 'motoryzacja-dealer'
  | 'medycyna-stomatolog'
  | 'medycyna-weterynarz'
  | 'medycyna-fizjoterapia';

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
  /** Optional system-instruction override/injection for this industry */
  systemInstruction?: string;
  /** Optional prefix added to image-generation prompts for this industry */
  imagePromptPrefix?: string;
  /** Industry-specific elements that MUST appear in every generated image */
  imageMustShow?: string[];
}

export interface IndustrySubNicheDef {
  id: IndustrySubNicheId;
  parentPackId: IndustryPackId;
  label: string;
  icon: string;
  nicheKeywords: string[];
  topicIdeas: string[];
  /** Optional override for parent pack's image prompt prefix */
  imagePromptPrefix?: string;
  /** Optional override for parent pack's must-show elements */
  imageMustShow?: string[];
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
    systemInstruction: 'BRANŻA: lokal gastronomiczny w Polsce. Pisz konkretnie o daniach, składnikach, atmosferze lokalu i CTA typu "przyjdź", "zarezerwuj", "spróbuj". Unikaj ogólników typu "najlepsza jakość" bez przykładu. Używaj realnych cen/menu dnia i polskich realiów (lokalni dostawcy, sezonowość).',
    imagePromptPrefix: 'Appetizing Polish food photography, natural daylight, rustic or modern restaurant interior, shallow depth of field, no text or logos in frame.',
    imageMustShow: [
      'real prepared food or beverage that matches the post topic',
      'authentic Polish restaurant or cafe setting (not a generic studio)',
      'fresh ingredients or finished dish visible in detail',
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
    imagePromptPrefix: 'Professional salon photography, mirror and styling chair visible, warm lighting, close-up detail of hair or beauty work, no text or logos in frame.',
    imageMustShow: [
      'real person with visible hair, nails, or beauty result matching the post topic',
      'authentic salon environment (chair, mirror, tools) — not a generic studio',
      'close-up detail of the actual beauty work or result',
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
    systemInstruction: 'BRANŻA: polski B2B SaaS. Pisz jak ekspert, który zna realia CEE: konkretne liczby, case study, wdrożenia, zespoły. Unikaj buzzwordów (AI, automatyzacja, transformacja cyfrowa) bez wyjaśnienia korzyści. CTA powinno być jedno: demo, call, checklista.',
    imagePromptPrefix: 'Clean B2B SaaS visual, modern UI mockup or professional team in office, blue and neutral tones, no text or logos, credible and minimal.',
    imageMustShow: [
      'professional office or remote-work environment if people are shown',
      'screen, dashboard, or device showing a credible product UI if the post mentions a tool',
      'Polish/CEE business context — no generic Silicon Valley aesthetics',
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
    systemInstruction: 'BRANŻA: polski e-commerce. Koncentruj się na produkcie, 3 konkretnych benefitach, social proof (opinie, bestseller), deadline/limited offer i jedno jasne CTA (link, kod, koszyk). Unikaj ogólników typu "wyjątkowa jakość" bez dowodu.',
    imagePromptPrefix: 'Polish e-commerce product photography, clean background, natural lighting, lifestyle context, no text or watermarks, appealing to mobile shopper.',
    imageMustShow: [
      'the actual product matching the post — clearly visible and in focus',
      'product packaging, label, or form factor that a Polish online shopper would recognize',
      'lifestyle context or use-case showing the product in action',
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
    imagePromptPrefix: 'Dynamic fitness photography, real gym or outdoor training environment, natural sweat and effort, proper form visible, energetic but authentic — no posed stock look.',
    imageMustShow: [
      'real person performing the exercise or activity described in the post',
      'gym, studio, or outdoor training environment — not a generic studio',
      'proper form and equipment visible if the post mentions specific exercises',
    ],
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
    imagePromptPrefix: 'Polish fashion editorial photography, real street or studio location, full outfit visible, natural posing, clothing texture and drape in detail — no text or watermarks.',
    imageMustShow: [
      'the actual clothing item or accessory described in the post — worn by a person',
      'full outfit or styling visible, not just a fabric swatch',
      'authentic Polish fashion context — real street, studio, or location',
    ],
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
    imagePromptPrefix: 'Clean educational visual, screen or whiteboard with diagrams, notebook and learning materials, warm professional lighting, no text or logos.',
    imageMustShow: [
      'learning context: screen, whiteboard, notebook, or educational material relevant to the post',
      'person engaged in teaching or learning if the post is a lesson or tip',
      'visual representation of the concept being explained (diagram, chart, or example)',
    ],
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
    imagePromptPrefix: 'Clean financial visual, charts or calculator on desk, Polish PLN context if numbers visible, trustworthy and minimal — no get-rich-quick aesthetics.',
    imageMustShow: [
      'visual representation of the financial concept: chart, calculator, budget sheet, or money',
      'Polish financial context (PLN, Polish banking UI, or Polish documents) if text/numbers are visible',
      'clear, trustworthy, jargon-free visual — no get-rich-quick aesthetics',
    ],
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
  {
    id: 'pl-nieruchomosci',
    name: 'Nieruchomości',
    description: 'Oferty, metamorfoze, tipy kupującego — Facebook + Instagram',
    icon: '🏠',
    platform: 'Facebook',
    tone: 'Professional',
    style: 'Clean',
    aspectRatio: '1:1',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 8,
    videoLength: 'medium',
    nicheKeywords: [
      'nieruchomo', 'mieszkan', 'dom', 'mieszkanie', 'deweloper', 'agent nieruch',
      'biuro nieruch', 'rynek mieszkaniowy', 'inwestycj', 'wynajem', 'najem',
    ],
    topicHint: 'Agent/deweloper PL: nowa oferta, tip kupującego lub metamorfoza wnętrza',
    systemInstruction: 'BRANŻA: polski rynek nieruchomości. Pisz konkretnie o metrażu, cenie, lokalizacji, korzyściach. Unikaj ogólników typu "wymarzone mieszkanie" bez danych. CTA: umów się na oglądanie, pobierz ofertę.',
    imagePromptPrefix: 'Polish real estate photography, bright interior or exterior with natural light, wide-angle showing space and layout, clean and inviting — no text or watermarks.',
    imageMustShow: [
      'the actual property or interior matching the post — room layout visible',
      'Polish real estate context (standard PL fixtures, windows, flooring)',
      'sense of space and scale — wide-angle or full-room perspective',
    ],
    topicIdeas: [
      'Nowa oferta: metraż, cena, 3 atuty i CTA na oglądanie',
      'Metamorfoza wnętrza — przed/po stagera',
      'Tip kupującego: co sprawdzić przy oglądaniu',
      'Raport z okolicy: szkoły, komunikacja, sklepy',
      'Investycja vs mieszkanie — co wybrać w 2025',
      'Behind the scenes: dzień agenta nieruchomości',
      'Case study: sprzedaż mieszkania w X dni',
      'FAQ: kredyt vs gotówka — co opłaca się teraz',
      'Nowa inwestycja deweloperska — terminy i ceny',
      'Porada: jak przygotować mieszkanie do sprzedaży',
    ],
  },
  {
    id: 'pl-motoryzacja',
    name: 'Motoryzacja',
    description: 'Warsztat, dealer, tipy — Facebook + Instagram',
    icon: '🚗',
    platform: 'Facebook',
    tone: 'Casual',
    style: 'Bold',
    aspectRatio: '1:1',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 8,
    videoLength: 'short',
    nicheKeywords: [
      'motoryzac', 'samoch', 'auto', 'warsztat', 'mechanik', 'dealer', 'komis',
      'części', 'opony', 'diagnost', 'przegląd', 'napraw', 'olej', 'silnik',
    ],
    topicHint: 'Warsztat/dealer motoryzacyjny PL: porada, oferta serwisu lub nowy model',
    systemInstruction: 'BRANŻA: polska motoryzacja. Pisz konkretnie o markach, modelach, cenach serwisu, terminach. Używaj polskich realiów (przeglądy, ubezpieczenia, paliwo). CTA: umów się, przyjedź, sprawdź.',
    imagePromptPrefix: 'Polish automotive photography, real garage or showroom environment, car detail or engine bay visible, natural lighting — no text or logos.',
    imageMustShow: [
      'the actual car, part, or service matching the post topic',
      'authentic Polish garage, workshop, or showroom — not a generic studio',
      'mechanic hands, tools, or equipment visible if the post is about service',
    ],
    topicIdeas: [
      'Przegląd sezonowy — co sprawdzamy i cena',
      'Tip: 3 objawy, które nie mogą czekać',
      'Nowy model w salonie — data i co nowego',
      'Case study naprawy: problem → rozwiązanie → koszt',
      'Promocja na opony / serwis — deadline',
      'Behind the scenes warsztatu w godzinach szczytu',
      'FAQ: jak często wymieniać olej / filtry',
      'Poznaj mechanika — doświadczenie i specjalizacja',
      'Porównanie: oryginał vs zamiennik — co wybrać',
      'Hiring: szukamy mechanika / doradcy',
    ],
  },
  {
    id: 'pl-medycyna',
    name: 'Medycyna & zdrowie',
    description: 'Porady, zabiegi, social proof — Instagram + Facebook',
    icon: '🩺',
    platform: 'Instagram',
    tone: 'Professional',
    style: 'Clean',
    aspectRatio: '1:1',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 6,
    videoLength: 'medium',
    nicheKeywords: [
      'medycyn', 'lekarz', 'klinika', 'zabieg', 'stomatolog', 'weterynarz',
      'fizjoterap', 'rehabilitac', 'dermatolog', 'okulista', 'ginekolog',
      'pediatra', 'chirurg', 'przychodnia', 'pacjent',
    ],
    topicHint: 'Klinika/gabinet PL: porada zdrowotna, opis zabiegu lub social proof pacjenta',
    systemInstruction: 'BRANŻA: polska medycyna prywatna. Pisz konkretnie i empatycznie o objawach, zabiegach, korzyściach. Zawsze dodaj disclaimer medyczny. CTA: umów wizytę, konsultacja.',
    imagePromptPrefix: 'Clean medical photography, modern clinic interior, professional equipment visible, sterile but welcoming environment — no text or logos.',
    imageMustShow: [
      'medical equipment, clinic interior, or professional setting matching the post topic',
      'healthcare professional in Polish medical context (white coat, scrubs, PPE)',
      'clean, sterile, trustworthy visual — no graphic procedures',
    ],
    topicIdeas: [
      'Porada: 3 objawy, które wymagają wizyty',
      'Opis zabiegu: na czym polega i dla kogo',
      'Social proof: historia pacjenta (zgodna z RODO)',
      'FAQ: najczęstsze pytanie o zabieg / konsultację',
      'Behind the scenes: dzień w klinice',
      'Porównanie metod leczenia — co wybrać',
      'Promocja: pakiet badań / konsultacja — deadline',
      'Poznaj lekarza — specjalizacja i doświadczenie',
      'Tip profilaktyczny: co robić codziennie dla zdrowia',
      'Nowość w ofercie — sprzęt / metoda / zabieg',
    ],
  },
  {
    id: 'pl-turystyka',
    name: 'Turystyka & travel',
    description: 'Oferty, destynacje, tipy — Instagram + Facebook',
    icon: '✈️',
    platform: 'Instagram',
    tone: 'Inspirational',
    style: 'Warm',
    aspectRatio: '1:1',
    includeMusic: true,
    includeHashtags: true,
    hashtagCount: 10,
    videoLength: 'short',
    nicheKeywords: [
      'turystyk', 'travel', 'podróż', 'wycieczka', 'wakac', 'urlop', 'hotel',
      'pensjonat', 'agroturystyk', 'destynacj', 'rezerwac', 'nocleg', 'biuro podróży',
    ],
    topicHint: 'Biuro podróży/pensjonat PL: destynacja, oferta lub tip podróżny',
    systemInstruction: 'BRANŻA: polska turystyka. Pisz konkretnie o destynacjach, cenach, terminach, atrakcjach. Używaj polskich realiów (PLN, terminy szkolne, bliskie destynacje). CTA: rezerwuj, sprawdź ofertę.',
    imagePromptPrefix: 'Polish travel photography, authentic destination landscape or interior, natural light, inviting atmosphere — no text or watermarks.',
    imageMustShow: [
      'the actual destination, hotel, or attraction matching the post',
      'authentic Polish or popular travel destination (not generic stock)',
      'sense of place — landscape, architecture, or local culture visible',
    ],
    topicIdeas: [
      'Destynacja tygodnia: co zobaczyć, cena, termin',
      'Tip podróżny: 5 rzeczy do pakowania',
      'Oferta last minute — deadline i cena',
      'Behind the scenes: dzień w pensjonacie / hotelu',
      'Sezonowe atrakcje — co i kiedy',
      'Porównanie destynacji: Polska vs zagranica',
      'Social proof: opinia gościa + odpowiedź',
      'FAQ: rezerwacja, cancelacja, dzieci',
      'Lokalna kuchnia / atrakcja — co spróbować',
      'Promocja: pakiety weekendowe — co w cenie',
    ],
  },
  {
    id: 'pl-budownictwo',
    name: 'Budownictwo & remont',
    description: 'Realizacje, porady, oferty — Facebook + Instagram',
    icon: '🔨',
    platform: 'Facebook',
    tone: 'Professional',
    style: 'Clean',
    aspectRatio: '1:1',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 6,
    videoLength: 'medium',
    nicheKeywords: [
      'budownictwo', 'budowlan', 'remont', 'wykonczeni', 'generalny wykonawca',
      'firma budowlana', 'ekipa', 'parkiet', 'malowan', 'łazienka', 'kuchnia',
      'dach', 'elewacj', 'izolacj',
    ],
    topicHint: 'Firma budowlana PL: realizacja, porada lub oferta serwisu',
    systemInstruction: 'BRANŻA: polskie budownictwo. Pisz konkretnie o materiałach, terminach, metrażach, cenach. Używaj polskich realiów (lokalni dostawcy, polskie materiały). CTA: wycena, konsultacja, umów.',
    imagePromptPrefix: 'Polish construction photography, real building site or finished interior, tools and materials visible, natural daylight — no text or logos.',
    imageMustShow: [
      'the actual construction site, renovation, or finished work matching the post',
      'authentic Polish construction context (PL materials, tools, finishes)',
      'before/after or work-in-progress showing craftsmanship and detail',
    ],
    topicIdeas: [
      'Realizacja tygodnia: przed/po + metraż i termin',
      'Porada: 3 błędy przy remoncie łazienki',
      'Oferta: pakiet wykończeniowy — co w cenie',
      'Behind the scenes: dzień na budowie',
      'Case study: remont mieszkania w X dni',
      'FAQ: jak wybrać parkiet / farbę / płytki',
      'Poznaj ekipę — specjalizacja i doświadczenie',
      'Sezonowe prace: elewacja / dach / ogród',
      'Promocja: darmowa wycena — deadline',
      'Tip: co sprawdzić przed oddaniem mieszkania',
    ],
  },
  {
    id: 'pl-prawo',
    name: 'Prawo & doradztwo',
    description: 'Porady prawne, case study — LinkedIn + Facebook',
    icon: '⚖️',
    platform: 'LinkedIn',
    tone: 'Professional',
    style: 'Authoritative',
    aspectRatio: '1:1',
    includeMusic: false,
    includeHashtags: true,
    hashtagCount: 5,
    videoLength: 'medium',
    nicheKeywords: [
      'prawo', 'prawnik', 'adwokat', 'radca prawny', 'notariusz', 'kancelaria',
      'umowa', 'spór', 'roszczenie', 'odszkodowan', 'rozwód', 'spadk',
      'testament', 'reprezentacj', 'doradztwo prawne',
    ],
    topicHint: 'Kancelaria PL: porada prawna, case study lub zaproszenie na konsultację',
    systemInstruction: 'BRANŻA: polskie prawo. Pisz konkretnie o przepisach, terminach, procedurach. Zawsze dodaj disclaimer prawny. Używaj polskich realiów (KRS, sądy, kodeks cywilny). CTA: konsultacja, kontakt.',
    imagePromptPrefix: 'Professional legal photography, modern office with law books, desk, and clean aesthetic, warm lighting — no text or logos.',
    imageMustShow: [
      'professional legal environment: office, desk, law books, or documents',
      'Polish legal context (PL documents, KRS, court references if visible)',
      'trustworthy, authoritative, clean visual — no dramatic courtroom clichés',
    ],
    topicIdeas: [
      'Porada prawna: 3 kroki do rozwiązania problemu',
      'Case study: sprawa klienta — problem → rozwiązanie',
      'FAQ: najczęstsze pytanie o spadek / rozwód / umowę',
      'Zmiana w prawie 2025 — co to oznacza dla Ciebie',
      'Tip: co sprawdzić przed podpisaniem umowy',
      'Behind the scenes: dzień w kancelarii',
      'Promocja: darmowa konsultacja — deadline',
      'Poznaj prawnika — specjalizacja i doświadczenie',
      'Checklist: dokumenty potrzebne do sprawy',
      'Ostrzeżenie: 5 błędów, które kosztują w sądzie',
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
  {
    id: 'fitness-personalny',
    parentPackId: 'pl-fitness',
    label: 'Trener personalny',
    icon: '🏋️',
    nicheKeywords: ['trener personal', 'personalny', 'personal trainer', 'pt', '1on1', 'indiwidual'],
    topicIdeas: [
      'Mini sesja 1on1 — 3 ćwiczenia z poprawką techniki',
      'Transformacja klienta — przed/po w 12 tyg',
      'Dlaczego warto mieć plan — 3 korzyści',
      'Błąd początkującego na pierwszej sesji',
      'Oferta: pakiet 10 sesji + plan dietetyczny',
      'Behind the scenes: przygotowanie sesji treningowej',
      'Q&A: jak często trenować z trenerem',
      'Tip: co jeść przed/po treningu',
    ],
  },
  {
    id: 'fitness-yoga',
    parentPackId: 'pl-fitness',
    label: 'Yoga & wellness',
    icon: '🧘',
    nicheKeywords: ['yoga', 'joga', 'medytac', 'mindful', 'wellness', 'pilates', 'oddychan'],
    imagePromptPrefix: 'Serene yoga and wellness photography, calm studio with natural light, mat and props visible, peaceful atmosphere, soft muted tones — no text or logos.',
    imageMustShow: [
      'person in a yoga pose or meditation position matching the post topic',
      'yoga studio, mat, or wellness environment — not a generic gym',
      'sense of calm and mindfulness — soft lighting, natural tones',
    ],
    topicIdeas: [
      'Pozycja dnia — jak i dlaczego',
      'Sekwencja na stres 5 minut — krok po kroku',
      'Tip: oddech redukujący napięcie',
      'Medytacja przewodnia — 3 minuty',
      'Oferta: zajęcia online / stacjonarne',
      'Behind the scenes: studio jogi',
      'FAQ: jak zacząć — matka, ubranie, poziom',
      'Poranny rytuał: 5 min na równowagę',
    ],
  },
  {
    id: 'fitness-crossfit',
    parentPackId: 'pl-fitness',
    label: 'CrossFit & sport',
    icon: '🤸',
    nicheKeywords: ['crossfit', 'wod', 'box', 'sport', 'drużyna', 'zawody', 'functional'],
    imagePromptPrefix: 'Intense CrossFit and functional sport photography, raw gym environment with rigs and weights, chalk and sweat, dynamic action shots — no text or logos.',
    imageMustShow: [
      'athlete performing the WOD or lift described in the post',
      'CrossFit box environment — rig, plates, kettlebells visible',
      'intensity and effort — real training, not posed',
    ],
    topicIdeas: [
      'WOD dnia — ćwiczenia i czas',
      'Tip: poprawka techniki Olympic lift',
      'Przygotowanie do zawodów — 4 tyg plan',
      'Behind the scenes: box w godzinie Open',
      'Case study: progres początkującego w 3 mies',
      'FAQ: scaling — jak dobrać ciężar',
      'Mobility: 5 min po WOD',
      'Hiring: szukamy trenera CrossFit',
    ],
  },
  {
    id: 'moda-butik',
    parentPackId: 'pl-moda',
    label: 'Butik premium',
    icon: '👜',
    nicheKeywords: ['butik', 'premium', 'boutique', 'elegan', 'kobiec', 'klasyka'],
    topicIdeas: [
      'Styling dnia — 1 outfit 3 okazje',
      'Nowa dostawa — preview i data',
      'Tip: jak dobrać rozmiar w butiku',
      'Sezonowa kolorystyka — co pasuje do czego',
      'Behind the scenes: sesja lookbook',
      'Klientka tygodnia — stylizacja i opinia',
      'FAQ: konsultacja stylowa — jak działa',
      'Limited edition — ile sztuk w ofercie',
    ],
  },
  {
    id: 'moda-streetwear',
    parentPackId: 'pl-moda',
    label: 'Streetwear',
    icon: '🧢',
    nicheKeywords: ['streetwear', 'urban', 'sneaker', 'hoodie', 'drop', 'limited'],
    topicIdeas: [
      'Drop tygodnia — ile sztuk, kiedy, cena',
      'Styling: sneakers + hoodie 3 sposoby',
      'Behind the scenes: projekt i produkcja',
      'Collab: lokalny artysta / muzyk',
      'Tip: jak dbać o sneakers',
      'Sezonowa paleta — co wchodzi, co wychodzi',
      'Community: zjazd / event — data i miejsce',
      'Limited restock — ile sztuk wraca',
    ],
  },
  {
    id: 'moda-bizuteria',
    parentPackId: 'pl-moda',
    label: 'Biżuteria & akcesoria',
    icon: '💍',
    nicheKeywords: ['biżuteri', 'rękawicz', 'torebka', 'akcesor', 'zegarek', 'perły', 'srebr'],
    imagePromptPrefix: 'Macro jewelry and accessories photography, extreme close-up showing texture and craftsmanship, soft studio lighting with reflections, elegant and luxurious — no text or watermarks.',
    imageMustShow: [
      'the actual jewelry piece or accessory described in the post — in sharp focus',
      'material detail: metal finish, gemstone, or texture visible up close',
      'elegant presentation — jewelry box, velvet, or model wearing it',
    ],
    topicIdeas: [
      'Nowa kolekcja — preview i materiały',
      'Tip: jak dbać o srebro / złoto',
      'Styling: 1 biżuteria 3 outfity',
      'Behind the scenes: pracownia złotnika',
      'Custom: zamówienie na wymiar — jak działa',
      'Sezonowe trendy: co nosić w 2025',
      'FAQ: rozmiar pierścionka / bransoletki',
      'Limited edition — ile sztuk',
    ],
  },
  {
    id: 'ecom-fashion',
    parentPackId: 'pl-ecom',
    label: 'Fashion online',
    icon: '👕',
    nicheKeywords: ['fashion', 'odzież', 'ubrania', 'sklep odzież', 'moda online', 'outlet'],
    topicIdeas: [
      'Bestseller tygodnia — top 3 z uzasadnieniem',
      'Outlet: -50% — deadline i co wchodzi',
      'Unboxing: co w paczce od nas',
      'Styling: 1 produkt 3 outfity',
      'FAQ: rozmiarówka — jak dobrać',
      'Social proof: opinia + zdjęcie klientki',
      'Behind the scenes: pakowanie zamówienia',
      'Nowa kolekcja — preview i data dropu',
    ],
  },
  {
    id: 'ecom-electronics',
    parentPackId: 'pl-ecom',
    label: 'Electronics',
    icon: '📱',
    nicheKeywords: ['electron', 'telefon', 'laptop', 'słuchawk', 'smart', 'gadget', 'akcesor'],
    topicIdeas: [
      'Produkt tygodnia: 3 atuty i CTA',
      'Porównanie: model A vs B — co wybrać',
      'Unboxing: co w pudełku',
      'Tip: jak wydłużyć baterię / żywotność',
      'Promocja: -X% — deadline i kod',
      'FAQ: gwarancja, zwroty, serwis',
      'Bestseller miesiąca — top 5',
      'Nowość: premiera — data i cena',
    ],
  },
  {
    id: 'ecom-kosmetyki',
    parentPackId: 'pl-ecom',
    label: 'Kosmetyki & beauty',
    icon: '💄',
    nicheKeywords: ['kosmetyk', 'beauty', 'krem', 'serum', 'pielęgnac', 'makeup', 'skincare'],
    imagePromptPrefix: 'Beauty and skincare product photography, close-up of texture and packaging, soft diffused lighting, clean background with subtle skin or hand context — no text or watermarks.',
    imageMustShow: [
      'the actual cosmetic product matching the post — packaging and label visible',
      'product texture, consistency, or application shown in detail',
      'beauty context — bathroom shelf, vanity, or hand holding product',
    ],
    topicIdeas: [
      'Produkt dnia: składniki i korzyści',
      'Rutyna pielęgnacyjna: 3 kroki AM/PM',
      'Porównanie: serum A vs B',
      'Social proof: opinia + efekt przed/po',
      'Promocja: 2+1 gratis — deadline',
      'FAQ: jak dobrać do typu cery',
      'Behind the scenes: pakowanie zestawu',
      'Bestseller: top 3 kosmetyki miesiąca',
    ],
  },
  {
    id: 'edukacja-online',
    parentPackId: 'pl-edukacja',
    label: 'Kursy online',
    icon: '💻',
    nicheKeywords: ['online', 'e-learning', 'kurs online', 'wideo kurs', 'self-paced', 'nagran'],
    topicIdeas: [
      'Fragment kursu — sneak peek 2 min',
      'Lekcja darmowa: 1 koncepcja + przykład',
      'Case study kursanta — przed/po',
      'FAQ: certyfikat, dostęp, aktualizacje',
      'Oferta early bird — do kiedy i co w cenie',
      'Behind the scenes: nagranie modułu',
      'Tip: jak uczyć się skutecznie online',
      'Promocja: -X% dla pierwszych N osób',
    ],
  },
  {
    id: 'edukacja-szkolenia-b2b',
    parentPackId: 'pl-edukacja',
    label: 'Szkolenia B2B',
    icon: '🏢',
    nicheKeywords: ['szkolen', 'b2b', 'firm', 'korporac', 'pracownik', 'zespoł', 'onboarding'],
    topicIdeas: [
      'Szkolenie dnia: 1 umiejętność + korzyść',
      'Case study: wdrożenie w firmie X',
      'FAQ: format, czas, grupa',
      'Oferta: szkolenie na wymiar — co w cenie',
      'Behind the scenes: sesja z zespołem',
      'Tip: jak wdrożyć nowy system w 30 dni',
      'Promocja: pakiet 3 szkoleń — deadline',
      'Poznaj trenera — doświadczenie B2B',
    ],
  },
  {
    id: 'motoryzacja-warsztat',
    parentPackId: 'pl-motoryzacja',
    label: 'Warsztat & serwis',
    icon: '🔧',
    nicheKeywords: ['warsztat', 'serwis', 'napraw', 'mechanik', 'diagnost', 'blacharz', 'lakiernik'],
    topicIdeas: [
      'Naprawa dnia: problem → rozwiązanie → koszt',
      'Tip: 3 dźwięki, które oznaczają problem',
      'Promocja: przegląd + wymiana oleju — cena',
      'Behind the scenes: warsztat w godzinach szczytu',
      'FAQ: jak często wymieniać rozrząd',
      'Case study: trudna diagnoza w 2h',
      'Poznaj mechanika — specjalizacja',
      'Hiring: szukamy mechanika / diagnosty',
    ],
  },
  {
    id: 'motoryzacja-dealer',
    parentPackId: 'pl-motoryzacja',
    label: 'Dealer & sprzedaż',
    icon: '🔑',
    nicheKeywords: ['dealer', 'salon', 'sprzedaż', 'nowy', 'używan', 'komis', 'leasing', 'kredyt'],
    topicIdeas: [
      'Nowy model w salonie — data i co nowego',
      'Oferta: leasing 0% — warunki i deadline',
      'Porównanie: model A vs B — co wybrać',
      'Behind the scenes: przygotowanie auta do dostawy',
      'Social proof: opinia klienta po zakupie',
      'FAQ: kredyt vs leasing — co opłaca się teraz',
      'Promocja: auto roku — cena i bonusy',
      'Tip: co sprawdzić przy odbiorze nowego auta',
    ],
  },
  {
    id: 'medycyna-stomatolog',
    parentPackId: 'pl-medycyna',
    label: 'Stomatologia',
    icon: '🦷',
    nicheKeywords: ['stomatolog', 'dentyst', 'zęby', 'implant', 'ortodont', 'wybiel', 'protety'],
    topicIdeas: [
      'Zabieg dnia: na czym polega i dla kogo',
      'Tip: 3 nawyki dla zdrowych dziąseł',
      'Case study: implant — przed/po',
      'FAQ: wybielanie — metody i bezpieczeństwo',
      'Promocja: pakiet higienizacji — cena',
      'Behind the scenes: gabinet stomatologiczny',
      'Poznaj lekarza — specjalizacja',
      'Tip: co robić po ekstrakcji zęba',
    ],
  },
  {
    id: 'medycyna-weterynarz',
    parentPackId: 'pl-medycyna',
    label: 'Weterynaria',
    icon: '🐾',
    nicheKeywords: ['weterynarz', 'zwierzę', 'pies', 'kot', 'klinika wet', 'zwierzęta', 'pet'],
    topicIdeas: [
      'Porada: 3 objawy, które wymagają wizyty',
      'Zabieg dnia: na czym polega i dla kogo',
      'Tip: szczepienia — co i kiedy',
      'Case study: leczenie psa/kota — historia',
      'FAQ: kastracja / sterylizacja — kiedy i dlaczego',
      'Promocja: pakiet badań profilaktycznych',
      'Behind the scenes: dzień w klinice wet',
      'Poznaj lekarza wet — specjalizacja',
    ],
  },
  {
    id: 'medycyna-fizjoterapia',
    parentPackId: 'pl-medycyna',
    label: 'Fizjoterapia',
    icon: '💪',
    nicheKeywords: ['fizjoterap', 'rehabilitac', 'masaż', 'kręgosłup', 'kolano', 'uraz', 'sport'],
    topicIdeas: [
      'Ćwiczenie dnia: 1 ruch na ból pleców',
      'Tip: 3 nawyki dla zdrowego kręgosłupa',
      'Case study: rehabilitacja po urazie',
      'FAQ: ile sesji potrzeba — realny plan',
      'Promocja: pakiet 5 sesji — cena',
      'Behind the scenes: gabinet fizjo',
      'Poznaj fizjo — specjalizacja i metody',
      'Tip: co robić przy bólu kolana',
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
  const n = normalizeNicheText(niche);
  if (!n || n === 'marketing') return { pack: null, subNiche: null };

  // Find best pack match by score
  let bestPack: { pack: IndustryPackDef; score: number } | null = null;
  for (const pack of INDUSTRY_PACK_DEFS) {
    const score = scoreKeywords(n, pack.nicheKeywords);
    if (score > 0 && (!bestPack || score > bestPack.score)) {
      bestPack = { pack, score };
    }
  }

  // Find best sub-niche match by score
  let bestSub: { sub: IndustrySubNicheDef; score: number } | null = null;
  for (const sub of INDUSTRY_SUB_NICHES) {
    const score = scoreKeywords(n, sub.nicheKeywords);
    if (score > 0 && (!bestSub || score > bestSub.score)) {
      bestSub = { sub, score };
    }
  }

  // Use sub-niche only if its parent is the best pack match, or if no pack matched
  if (bestSub && (!bestPack || bestSub.sub.parentPackId === bestPack.pack.id)) {
    const pack = INDUSTRY_PACK_DEFS.find((p) => p.id === bestSub.sub.parentPackId)!;
    return {
      pack: {
        ...pack,
        topicIdeas: bestSub.sub.topicIdeas,
        topicHint: `${pack.topicHint} (podbranża: ${bestSub.sub.label})`,
      },
      subNiche: bestSub.sub,
    };
  }

  if (bestPack) return { pack: bestPack.pack, subNiche: null };
  return { pack: null, subNiche: null };
}
