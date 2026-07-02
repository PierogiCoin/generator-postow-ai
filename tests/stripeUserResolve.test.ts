import { describe, expect, it } from 'vitest';

function customerIdFrom(customer: string | { id: string; deleted?: boolean } | null | undefined): string | null {
  if (!customer) return null;
  if (typeof customer === 'string') return customer;
  if ('deleted' in customer && customer.deleted) return null;
  return customer.id;
}

describe('stripe customer id parsing', () => {
  it('extracts string customer id', () => {
    expect(customerIdFrom('cus_abc')).toBe('cus_abc');
  });

  it('extracts object customer id', () => {
    expect(customerIdFrom({ id: 'cus_xyz' })).toBe('cus_xyz');
  });

  it('returns null for deleted customer', () => {
    expect(customerIdFrom({ id: 'cus_del', deleted: true })).toBeNull();
  });
});
