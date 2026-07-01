/**
 * Strategia cenowa — Generator Postów AI
 *
 * Zasady:
 * 1. Kredyt referencyjny (pakiet „Mały”) = najwyższa cena za kredyt (pay-as-you-go).
 * 2. Subskrypcja = niższy $/kredyt + funkcje (kalendarz, analityka, API).
 * 3. Każdy wyższy plan ma lepszy $/kredyt niż poprzedni (zachęta do upgrade).
 * 4. PLN = ceny „charm” pod polski rynek (~4,0–4,2 PLN/USD), USD = rozliczenie Stripe.
 *
 * Koszty akcji (kredyty): post 10 · obraz 50 · wideo 200 · optymalizacja 25
 */

/** Kurs do wyświetlania PLN (marketing); Stripe nadal w USD */
export const USD_TO_PLN_DISPLAY = 4.2;

/** Referencyjny koszt kredytu w pakiecie startowym (USD) */
export const RETAIL_CREDIT_USD = 9.99 / 400; // $0,02498

export interface TierPricing {
  priceUsd: number;
  pricePln: number;
  credits: number;
  /** Szacowane posty tekstowe / mies. (10 kredytów) */
  estimatedPosts: number;
}

/** Cena PLN — zaokrąglenie pod polski rynek (…9, …99) */
export function charmPricePln(usd: number): number {
  if (usd <= 0) return 0;

  const explicit: Record<number, number> = {
    9.99: 39,
    19.99: 79,
    24.99: 99,
    49.99: 199,
    99.99: 399,
    27: 109,
    29: 119,
    47: 199,
    49: 199,
    59: 249,
    79: 329,
    97: 399,
    99: 399,
    129: 529,
    197: 799,
    249: 999,
    299: 1199,
    497: 1999,
  };

  if (explicit[usd] !== undefined) return explicit[usd];

  const raw = usd * USD_TO_PLN_DISPLAY;
  if (usd < 30) return Math.max(9, Math.round(raw / 10) * 10 - 1);
  if (usd < 150) return Math.round(raw / 10) * 10 - 1;
  return Math.round(raw / 10) * 10 - 1;
}

export function pricePerCreditUsd(priceUsd: number, credits: number): number {
  if (credits <= 0) return 0;
  return priceUsd / credits;
}

export function pricePerCreditPln(pricePln: number, credits: number): number {
  if (credits <= 0) return 0;
  return pricePln / credits;
}

/** Oszczędność % względem ceny detalicznej za kredyt */
export function savingsVsRetailPercent(priceUsd: number, credits: number): number {
  const retail = RETAIL_CREDIT_USD;
  const actual = pricePerCreditUsd(priceUsd, credits);
  if (retail <= 0 || actual <= 0) return 0;
  return Math.round((1 - actual / retail) * 100);
}

export function formatUsdPrice(amount: number): string {
  if (amount === 0) return '$0';
  const decimals = amount % 1 !== 0 ? 2 : 0;
  return `$${amount.toFixed(decimals)}`;
}

export function formatPlnPrice(amount: number, decimals = 0): string {
  if (amount === 0) return '0 zł';
  const formatted = amount.toLocaleString('pl-PL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${formatted} zł`;
}

export function formatPerCreditUsd(priceUsd: number, credits: number): string {
  const v = pricePerCreditUsd(priceUsd, credits);
  if (v === 0) return '';
  if (v < 0.01) return `${(v * 100).toFixed(2)}¢`;
  return `${v.toFixed(3)} $`;
}

export function formatPerCreditPln(pricePln: number, credits: number): string {
  const v = pricePerCreditPln(pricePln, credits);
  if (v === 0) return '';
  return `${(v * 100).toFixed(1)} gr`;
}

export interface PriceDisplay {
  primary: string;
  secondary: string | null;
  perCredit: string | null;
}

export function formatSubscriptionPrice(
  plan: { priceUsd: number; pricePln: number; credits: number }
): PriceDisplay {
  if (plan.priceUsd === 0) {
    return { primary: '0 zł', secondary: null, perCredit: null };
  }
  return {
    primary: formatPlnPrice(plan.pricePln),
    secondary: `rozliczenie ${formatUsdPrice(plan.priceUsd)}`,
    perCredit: `${formatPerCreditPln(plan.pricePln, plan.credits)} / kredyt`,
  };
}

export function formatCreditPackPrice(pack: {
  priceUsd: number;
  pricePln: number;
  credits: number;
}): PriceDisplay {
  const decimals = pack.priceUsd % 1 !== 0 ? 2 : 0;
  return {
    primary: formatPlnPrice(pack.pricePln, decimals),
    secondary: formatUsdPrice(pack.priceUsd),
    perCredit: `${formatPerCreditPln(pack.pricePln, pack.credits)} / kredyt`,
  };
}

/** Macierz subskrypcji — USD zgodne ze Stripe; kredyty pod strategię wartości */
export const SUBSCRIPTION_PRICING: Record<
  'free' | 'creator' | 'pro' | 'business' | 'agency' | 'enterprise',
  TierPricing
> = {
  free: { priceUsd: 0, pricePln: 0, credits: 100, estimatedPosts: 10 },
  // Wejście: ~2× więcej kredytów niż Free, wideo + kalendarz
  creator: { priceUsd: 29, pricePln: charmPricePln(29), credits: 750, estimatedPosts: 75 },
  // Polecany: najlepszy stosunek cena/funkcje dla solo (analityka, 5 brand voices)
  pro: { priceUsd: 49, pricePln: charmPricePln(49), credits: 1800, estimatedPosts: 180 },
  // Zespół: API + duży pool kredytów
  business: { priceUsd: 99, pricePln: charmPricePln(99), credits: 6000, estimatedPosts: 600 },
  // Agencja: najlepszy $/kredyt w segmencie pro+ (wolumen, ∞ kampanie)
  agency: { priceUsd: 249, pricePln: charmPricePln(249), credits: 18000, estimatedPosts: 1800 },
  // Enterprise: najniższy $/kredyt + support
  enterprise: { priceUsd: 299, pricePln: charmPricePln(299), credits: 28000, estimatedPosts: 2800 },
};

/**
 * Pakiety jednorazowe — zawsze gorszy $/kredyt niż aktywna subskrypcja Pro+,
 * ale tańsze niż dokupowanie „na detal” przy planie Free.
 */
export const CREDIT_PACK_PRICING = [
  { id: 'small' as const, priceUsd: 9.99, pricePln: charmPricePln(9.99), credits: 400 },
  { id: 'medium' as const, priceUsd: 24.99, pricePln: charmPricePln(24.99), credits: 1100 },
  { id: 'large' as const, priceUsd: 49.99, pricePln: charmPricePln(49.99), credits: 2600 },
  { id: 'mega' as const, priceUsd: 99.99, pricePln: charmPricePln(99.99), credits: 7000 },
] as const;

export function creditPackBadge(pack: { priceUsd: number; credits: number }): string | null {
  const pct = savingsVsRetailPercent(pack.priceUsd, pack.credits);
  if (pct < 5) return null;
  return `−${pct}%`;
}

/** Weryfikacja monotoniczności $/kredyt (do testów) */
export function subscriptionCreditCostLadder(): { key: string; perCredit: number }[] {
  const keys = ['creator', 'pro', 'business', 'agency', 'enterprise'] as const;
  return keys.map((key) => ({
    key,
    perCredit: pricePerCreditUsd(
      SUBSCRIPTION_PRICING[key].priceUsd,
      SUBSCRIPTION_PRICING[key].credits
    ),
  }));
}
