import { afterEach, describe, expect, it } from 'vitest';
import { isAdminUser } from '../server/middleware/supabaseAuth';

describe('isAdminUser', () => {
  const prevIds = process.env.ADMIN_USER_IDS;
  const prevEmails = process.env.ADMIN_EMAILS;

  afterEach(() => {
    if (prevIds === undefined) delete process.env.ADMIN_USER_IDS;
    else process.env.ADMIN_USER_IDS = prevIds;
    if (prevEmails === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = prevEmails;
  });

  it('odmawia zwykłemu użytkownikowi bez allowlisty', () => {
    delete process.env.ADMIN_USER_IDS;
    delete process.env.ADMIN_EMAILS;
    expect(
      isAdminUser({ id: 'u1', email: 'user@example.com', appMetadata: {} })
    ).toBe(false);
  });

  it('akceptuje ADMIN_USER_IDS', () => {
    process.env.ADMIN_USER_IDS = 'u1, u2';
    delete process.env.ADMIN_EMAILS;
    expect(isAdminUser({ id: 'u2', email: 'x@y.com' })).toBe(true);
    expect(isAdminUser({ id: 'u9', email: 'x@y.com' })).toBe(false);
  });

  it('akceptuje ADMIN_EMAILS (case-insensitive)', () => {
    delete process.env.ADMIN_USER_IDS;
    process.env.ADMIN_EMAILS = 'Admin@Example.com';
    expect(isAdminUser({ id: 'u1', email: 'admin@example.com' })).toBe(true);
  });

  it('akceptuje app_metadata.role=admin', () => {
    delete process.env.ADMIN_USER_IDS;
    delete process.env.ADMIN_EMAILS;
    expect(
      isAdminUser({
        id: 'u1',
        email: 'user@example.com',
        appMetadata: { role: 'admin' },
      })
    ).toBe(true);
  });

  it('akceptuje app_metadata.is_admin=true', () => {
    delete process.env.ADMIN_USER_IDS;
    delete process.env.ADMIN_EMAILS;
    expect(
      isAdminUser({
        id: 'u1',
        email: 'user@example.com',
        appMetadata: { is_admin: true },
      })
    ).toBe(true);
  });
});
