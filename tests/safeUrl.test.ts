import { describe, expect, it } from 'vitest';
import { assertSafeUrl, isPrivateHost } from '../server/lib/safeUrl';

describe('safeUrl SSRF helpers', () => {
  it('flags private and local hosts', () => {
    expect(isPrivateHost('127.0.0.1')).toBe(true);
    expect(isPrivateHost('localhost')).toBe(true);
    expect(isPrivateHost('10.0.0.5')).toBe(true);
    expect(isPrivateHost('192.168.1.1')).toBe(true);
    expect(isPrivateHost('169.254.169.254')).toBe(true);
    expect(isPrivateHost('172.16.0.1')).toBe(true);
    expect(isPrivateHost('cdn.example.com')).toBe(false);
  });

  it('assertSafeUrl accepts public https URLs', () => {
    const url = assertSafeUrl('https://cdn.example.com/img.png');
    expect(url.hostname).toBe('cdn.example.com');
  });

  it('assertSafeUrl rejects private IPs', () => {
    expect(() => assertSafeUrl('http://127.0.0.1/a.png')).toThrow(/niedozwolony/i);
  });

  it('assertSafeUrl rejects non-http protocols', () => {
    expect(() => assertSafeUrl('file:///etc/passwd')).toThrow(/http/i);
  });
});
