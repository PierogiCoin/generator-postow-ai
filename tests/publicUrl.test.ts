import { describe, it, expect, afterEach } from 'vitest';
import {
  resolveOAuthCallbackUrl,
  resolvePublicBackendUrl,
  resolveFrontendUrl,
} from '../server/lib/publicUrl';

describe('publicUrl', () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('resolvePublicBackendUrl preferuje PUBLIC_BACKEND_URL', () => {
    process.env.PUBLIC_BACKEND_URL = 'https://api.example.com/';
    process.env.BACKEND_URL = 'https://other.example.com';
    expect(resolvePublicBackendUrl()).toBe('https://api.example.com');
  });

  it('resolveOAuthCallbackUrl buduje URI z public backend gdy brak jawnego env', () => {
    delete process.env.LINKEDIN_REDIRECT_URI;
    process.env.PUBLIC_BACKEND_URL = 'https://backend.up.railway.app';
    expect(resolveOAuthCallbackUrl('linkedin')).toBe(
      'https://backend.up.railway.app/api/social/callback/linkedin'
    );
  });

  it('resolveOAuthCallbackUrl respektuje jawny LINKEDIN_REDIRECT_URI', () => {
    process.env.LINKEDIN_REDIRECT_URI = 'https://custom.example/callback';
    process.env.PUBLIC_BACKEND_URL = 'https://backend.up.railway.app';
    expect(resolveOAuthCallbackUrl('linkedin')).toBe('https://custom.example/callback');
  });

  it('resolveFrontendUrl domyślnie localhost w dev', () => {
    delete process.env.FRONTEND_URL;
    expect(resolveFrontendUrl()).toBe('http://localhost:5173');
  });
});
