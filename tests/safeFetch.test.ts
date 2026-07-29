import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { assertSafeUrl, isPrivateHost, safeFetch } from '../server/lib/safeFetch';

describe('assertSafeUrl / isPrivateHost', () => {
  it('odrzuca localhost i prywatne IP', () => {
    expect(isPrivateHost('127.0.0.1')).toBe(true);
    expect(isPrivateHost('10.0.0.5')).toBe(true);
    expect(isPrivateHost('192.168.1.1')).toBe(true);
    expect(isPrivateHost('169.254.169.254')).toBe(true);
    expect(isPrivateHost('172.16.0.1')).toBe(true);
    expect(isPrivateHost('localhost')).toBe(true);
  });

  it('akceptuje publiczne hosty http(s)', () => {
    expect(() => assertSafeUrl('https://example.com/page')).not.toThrow();
    expect(assertSafeUrl('https://example.com').hostname).toBe('example.com');
  });

  it('odrzuca private URL z status 400', () => {
    try {
      assertSafeUrl('http://127.0.0.1/secret');
      expect.unreachable();
    } catch (e: unknown) {
      expect((e as { status?: number }).status).toBe(400);
      expect((e as Error).message).toMatch(/niedozwolony/i);
    }
  });

  it('odrzuca metadata AWS', () => {
    expect(() => assertSafeUrl('http://169.254.169.254/latest/meta-data/')).toThrow();
  });

  it('odrzuca nie-http protokoły', () => {
    try {
      assertSafeUrl('file:///etc/passwd');
      expect.unreachable();
    } catch (e: unknown) {
      expect((e as { status?: number }).status).toBe(400);
    }
  });
});

describe('safeFetch redirects', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('odrzuca redirect na private host', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { Location: 'http://127.0.0.1/admin' },
      })
    );

    await expect(safeFetch('https://example.com/start')).rejects.toMatchObject({
      status: 400,
    });
  });

  it('zwraca response dla bezpiecznego URL', async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response('<html>ok</html>', { status: 200 })
    );

    const res = await safeFetch('https://example.com/ok');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('ok');
  });
});
