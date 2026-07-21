import { describe, expect, it } from 'vitest';
import {
  CREDIT_PACK_PRICING,
  RETAIL_CREDIT_USD,
  SUBSCRIPTION_PRICING,
  creditPackBadge,
  pricePerCreditUsd,
  subscriptionCreditCostLadder,
  savingsVsRetailPercent,
  yearlyUsdFromMonthly,
} from '../config/pricingMath';

describe('pricingMath — strategia sprzedaży', () => {
  it('każdy wyższy plan subskrypcji ma niższy koszt za kredyt', () => {
    const ladder = subscriptionCreditCostLadder();
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i].perCredit).toBeLessThan(ladder[i - 1].perCredit);
    }
  });

  it('Pro ma lepszy $/kredyt niż Creator', () => {
    const creator = pricePerCreditUsd(
      SUBSCRIPTION_PRICING.creator.priceUsd,
      SUBSCRIPTION_PRICING.creator.credits
    );
    const pro = pricePerCreditUsd(
      SUBSCRIPTION_PRICING.pro.priceUsd,
      SUBSCRIPTION_PRICING.pro.credits
    );
    expect(pro).toBeLessThan(creator);
  });

  it('Enterprise ma najniższy $/kredyt w subskrypcjach', () => {
    const ladder = subscriptionCreditCostLadder();
    const last = ladder[ladder.length - 1];
    expect(last.key).toBe('enterprise');
    const min = Math.min(...ladder.map((l) => l.perCredit));
    expect(last.perCredit).toBe(min);
  });

  it('pakiety jednorazowe są droższe za kredyt niż Enterprise', () => {
    const entPerCredit = pricePerCreditUsd(
      SUBSCRIPTION_PRICING.enterprise.priceUsd,
      SUBSCRIPTION_PRICING.enterprise.credits
    );
    for (const pack of CREDIT_PACK_PRICING) {
      const packPerCredit = pricePerCreditUsd(pack.priceUsd, pack.credits);
      expect(packPerCredit).toBeGreaterThan(entPerCredit);
    }
  });

  it('większe pakiety mają lepszy $/kredyt niż mały', () => {
    const small = pricePerCreditUsd(
      CREDIT_PACK_PRICING[0].priceUsd,
      CREDIT_PACK_PRICING[0].credits
    );
    const mega = pricePerCreditUsd(
      CREDIT_PACK_PRICING[3].priceUsd,
      CREDIT_PACK_PRICING[3].credits
    );
    expect(mega).toBeLessThan(small);
  });

  it('PLN jest spójne z tabelą charm', () => {
    expect(SUBSCRIPTION_PRICING.creator.priceUsd).toBe(19);
    expect(SUBSCRIPTION_PRICING.creator.pricePln).toBe(79);
    expect(SUBSCRIPTION_PRICING.free.credits).toBe(150);
    expect(SUBSCRIPTION_PRICING.pro.pricePln).toBe(199);
    expect(SUBSCRIPTION_PRICING.business.pricePln).toBe(399);
    expect(SUBSCRIPTION_PRICING.agency.pricePln).toBe(999);
    expect(SUBSCRIPTION_PRICING.enterprise.pricePln).toBe(1199);
  });

  it('badge pakietów odzwierciedla realną oszczędność', () => {
    const medium = CREDIT_PACK_PRICING[1];
    const expected = savingsVsRetailPercent(medium.priceUsd, medium.credits);
    expect(creditPackBadge(medium)).toBe(`−${expected}%`);
    expect(expected).toBeGreaterThan(0);
  });

  it('retail credit anchor jest z pakietu small', () => {
    expect(RETAIL_CREDIT_USD).toBeCloseTo(9.99 / 400, 4);
  });

  it('roczna cena to 10× miesięczna (2 miesiące gratis)', () => {
    expect(yearlyUsdFromMonthly(49)).toBe(490);
    expect(yearlyUsdFromMonthly(29)).toBe(290);
    expect(yearlyUsdFromMonthly(0)).toBe(0);
  });
});
