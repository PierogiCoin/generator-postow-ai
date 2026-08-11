/**
 * CEE / PL calendar — holidays & retail seasons for intelligent content planning.
 */

export type CeeEventKind = 'holiday' | 'retail' | 'awareness';

export interface CeeCalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  nameEn: string;
  kind: CeeEventKind;
  topicHints: string[];
  platforms?: string[];
}

/** Fixed-date and computed PL holidays + retail peaks for a given year. */
export function getCeeEventsForYear(year: number): CeeCalendarEvent[] {
  const easter = computeCatholicEaster(year);
  const easterMon = addDays(easter, 1);
  const corpus = addDays(easter, 60);

  const fixed: Omit<CeeCalendarEvent, 'date'>[] = [
    {
      id: `${year}-ny`,
      name: 'Nowy Rok',
      nameEn: "New Year's Day",
      kind: 'holiday',
      topicHints: ['podsumowanie roku', 'postanowienia', 'nowy start'],
    },
    {
      id: `${year}-3kings`,
      name: 'Trzech Króli',
      nameEn: 'Epiphany',
      kind: 'holiday',
      topicHints: ['tradycja', 'rodzina', 'lokalność'],
    },
    {
      id: `${year}-valentines`,
      name: 'Walentynki',
      nameEn: "Valentine's Day",
      kind: 'retail',
      topicHints: ['prezent dla pary', 'miłość do marki', 'oferta limitowana'],
      platforms: ['Instagram', 'Facebook'],
    },
    {
      id: `${year}-women`,
      name: 'Dzień Kobiet',
      nameEn: "Women's Day",
      kind: 'awareness',
      topicHints: ['docenienie', 'historie kobiet w zespole', 'oferta specjalna'],
    },
    {
      id: `${year}-labour`,
      name: 'Święto Pracy',
      nameEn: 'Labour Day',
      kind: 'holiday',
      topicHints: ['work-life', 'pauza', 'majówka'],
    },
    {
      id: `${year}-constitution`,
      name: 'Święto Konstytucji 3 Maja',
      nameEn: 'Constitution Day',
      kind: 'holiday',
      topicHints: ['historia PL', 'wartości', 'lokalna duma'],
    },
    {
      id: `${year}-mother`,
      name: 'Dzień Matki',
      nameEn: "Mother's Day (PL)",
      kind: 'retail',
      topicHints: ['prezent dla mamy', 'podziękowanie', 'historie rodzinne'],
      platforms: ['Facebook', 'Instagram'],
    },
    {
      id: `${year}-child`,
      name: 'Dzień Dziecka',
      nameEn: "Children's Day",
      kind: 'retail',
      topicHints: ['rodzina', 'zabawa', 'oferta kids'],
    },
    {
      id: `${year}-father`,
      name: 'Dzień Ojca',
      nameEn: "Father's Day (PL)",
      kind: 'retail',
      topicHints: ['prezent dla taty', 'męskie hobby'],
    },
    {
      id: `${year}-assumption`,
      name: 'Wniebowzięcie NMP',
      nameEn: 'Assumption of Mary',
      kind: 'holiday',
      topicHints: ['wakacje', 'tradycja'],
    },
    {
      id: `${year}-backtoschool`,
      name: 'Powrót do szkoły',
      nameEn: 'Back to school',
      kind: 'retail',
      topicHints: ['wrzesień', 'organizacja', 'nowa rutyna', 'B2B Q4 prep'],
    },
    {
      id: `${year}-independence`,
      name: 'Narodowe Święto Niepodległości',
      nameEn: 'Independence Day',
      kind: 'holiday',
      topicHints: ['patriotyzm lokalny', 'historia marki PL'],
    },
    {
      id: `${year}-blackfriday`,
      name: 'Black Friday / Cyber Monday',
      nameEn: 'Black Friday',
      kind: 'retail',
      topicHints: ['promocja', 'oferta limitowana', 'FAQ zakupowe', 'social proof'],
      platforms: ['Instagram', 'Facebook', 'TikTok'],
    },
    {
      id: `${year}-santa`,
      name: 'Mikołajki',
      nameEn: "St. Nicholas' Day",
      kind: 'retail',
      topicHints: ['mały prezent', 'niespodzianka', 'dzieci / zespół'],
    },
    {
      id: `${year}-christmas`,
      name: 'Boże Narodzenie',
      nameEn: 'Christmas',
      kind: 'holiday',
      topicHints: ['podziękowania', 'życzenia', 'za kulisami świąt', 'godziny otwarcia'],
    },
    {
      id: `${year}-nye`,
      name: 'Sylwester',
      nameEn: "New Year's Eve",
      kind: 'retail',
      topicHints: ['podsumowanie roku', 'cele na nowy rok', 'best of'],
    },
  ];

  const dated: CeeCalendarEvent[] = [
    { ...fixed[0], date: `${year}-01-01` },
    { ...fixed[1], date: `${year}-01-06` },
    { ...fixed[2], date: `${year}-02-14` },
    { ...fixed[3], date: `${year}-03-08` },
    {
      id: `${year}-easter`,
      date: formatDate(easter),
      name: 'Wielkanoc',
      nameEn: 'Easter',
      kind: 'holiday',
      topicHints: ['święta rodzinne', 'oferta sezonowa', 'tradycja'],
    },
    {
      id: `${year}-easter-mon`,
      date: formatDate(easterMon),
      name: 'Poniedziałek Wielkanocny',
      nameEn: 'Easter Monday',
      kind: 'holiday',
      topicHints: ['wolne', 'rodzina', 'lokal'],
    },
    { ...fixed[4], date: `${year}-05-01` },
    { ...fixed[5], date: `${year}-05-03` },
    { ...fixed[6], date: `${year}-05-26` },
    {
      id: `${year}-corpus`,
      date: formatDate(corpus),
      name: 'Boże Ciało',
      nameEn: 'Corpus Christi',
      kind: 'holiday',
      topicHints: ['wolne', 'procesje lokalne', 'godziny otwarcia'],
    },
    { ...fixed[7], date: `${year}-06-01` },
    { ...fixed[8], date: `${year}-06-23` },
    { ...fixed[9], date: `${year}-08-15` },
    { ...fixed[10], date: `${year}-09-01` },
    { ...fixed[11], date: `${year}-11-11` },
    { ...fixed[12], date: `${year}-11-28` },
    { ...fixed[13], date: `${year}-12-06` },
    { ...fixed[14], date: `${year}-12-24` },
    { ...fixed[15], date: `${year}-12-31` },
  ];

  return dated.sort((a, b) => a.date.localeCompare(b.date));
}

export function getCeeEventsInRange(start: Date, days: number): CeeCalendarEvent[] {
  const startStr = formatDate(start);
  const end = addDays(start, Math.max(0, days - 1));
  const endStr = formatDate(end);
  const years = new Set([start.getFullYear(), end.getFullYear()]);
  const all: CeeCalendarEvent[] = [];
  for (const y of years) {
    all.push(...getCeeEventsForYear(y));
  }
  return all.filter((e) => e.date >= startStr && e.date <= endStr);
}

export function formatCeeEventsForPrompt(events: CeeCalendarEvent[]): string {
  if (!events.length) return '';
  const lines = events.map(
    (e) =>
      `- ${e.date}: ${e.name} (${e.kind}) — tematy: ${e.topicHints.slice(0, 3).join(', ')}`
  );
  return `CEE / PL CALENDAR (prefer scheduling around these dates when relevant to the goal):\n${lines.join('\n')}`;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** Anonymous Gregorian algorithm for Western Easter. */
export function computeCatholicEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}
