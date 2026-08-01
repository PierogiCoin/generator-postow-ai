/** Returns true when hostname resolves to a private/local address (SSRF risk). */
export function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  if (h === '0.0.0.0' || h === '[::1]' || h === '::1') return true;
  // IPv6 unique-local / link-local
  if (h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80')) return true;
  return false;
}

/**
 * Parse and validate a remote URL for server-side fetches (anti-SSRF).
 * Throws Error with `.status = 400` on rejection.
 */
export function assertSafeUrl(urlRaw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(urlRaw);
  } catch {
    throw Object.assign(new Error('Nieprawidłowy URL'), { status: 400 });
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw Object.assign(new Error('Dozwolone tylko http/https'), { status: 400 });
  }
  if (isPrivateHost(parsed.hostname)) {
    throw Object.assign(new Error('URL niedozwolony'), { status: 400 });
  }
  return parsed;
}
