/**
 * Tests for credit rollover logic — verifies cap and calculation.
 */

import { describe, it, expect } from 'vitest';

describe('credit rollover logic', () => {
  // Reproduces the rollover calculation from stripe.ts handlePaymentSucceeded
  function calculateRollover(currentCredits: number, planCredits: number): {
    rollover: number;
    newCredits: number;
    rolloverCap: number;
  } {
    const unusedCredits = Math.max(0, currentCredits);
    const rolloverCap = Math.floor(planCredits * 0.5);
    const rollover = Math.min(unusedCredits, rolloverCap);
    const newCredits = planCredits + rollover;
    return { rollover, newCredits, rolloverCap };
  }

  it('rolls over all unused credits when under cap', () => {
    const result = calculateRollover(300, 1800);
    expect(result.rollover).toBe(300);
    expect(result.newCredits).toBe(2100);
    expect(result.rolloverCap).toBe(900);
  });

  it('caps rollover at 50% of plan credits', () => {
    const result = calculateRollover(1500, 1800);
    expect(result.rollover).toBe(900); // capped at 50% of 1800
    expect(result.newCredits).toBe(2700);
  });

  it('rolls over 0 when no unused credits', () => {
    const result = calculateRollover(0, 1800);
    expect(result.rollover).toBe(0);
    expect(result.newCredits).toBe(1800);
  });

  it('handles negative credits as 0', () => {
    const result = calculateRollover(-50, 1800);
    expect(result.rollover).toBe(0);
    expect(result.newCredits).toBe(1800);
  });

  it('rolls over exactly the cap amount', () => {
    const result = calculateRollover(900, 1800);
    expect(result.rollover).toBe(900);
    expect(result.newCredits).toBe(2700);
  });

  it('works with different plan sizes', () => {
    const result = calculateRollover(500, 5000);
    expect(result.rollover).toBe(500);
    expect(result.rolloverCap).toBe(2500);
    expect(result.newCredits).toBe(5500);
  });
});
