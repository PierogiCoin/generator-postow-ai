import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { VercelRequest } from '@vercel/node';
import {
  buildTargetUrl,
  buildForwardHeaders,
  buildRequestBody,
} from '../api/_lib/proxy';

function mockRequest(overrides: Partial<VercelRequest> = {}): VercelRequest {
  return {
    method: 'POST',
    url: '/api/generate-content',
    headers: { 'content-type': 'application/json', host: 'app.vercel.app' },
    body: { prompt: 'test' },
    ...overrides,
  } as VercelRequest;
}

describe('buildTargetUrl', () => {
  const original = process.env.BACKEND_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.BACKEND_URL;
    else process.env.BACKEND_URL = original;
  });

  it('zwraca null gdy brak BACKEND_URL', () => {
    delete process.env.BACKEND_URL;
    expect(buildTargetUrl(mockRequest())).toBeNull();
  });

  it('buduje pełny URL z path override', () => {
    process.env.BACKEND_URL = 'https://api.example.com/';
    expect(buildTargetUrl(mockRequest(), '/health')).toBe('https://api.example.com/health');
  });

  it('zachowuje query string z req.url', () => {
    process.env.BACKEND_URL = 'https://api.example.com';
    expect(
      buildTargetUrl(mockRequest({ url: '/api/costs/daily?days=7' }), '/api/costs/daily?days=7')
    ).toBe('https://api.example.com/api/costs/daily?days=7');
  });
});

describe('buildForwardHeaders', () => {
  it('pomija hop-by-hop i host', () => {
    const headers = buildForwardHeaders(
      mockRequest({
        headers: {
          'content-type': 'application/json',
          host: 'app.vercel.app',
          connection: 'keep-alive',
          'x-user-id': 'user-1',
        },
      })
    );
    expect(headers.get('content-type')).toBe('application/json');
    expect(headers.get('x-user-id')).toBe('user-1');
    expect(headers.get('host')).toBeNull();
    expect(headers.get('connection')).toBeNull();
  });
});

describe('buildRequestBody', () => {
  it('zwraca undefined dla GET', () => {
    expect(buildRequestBody(mockRequest({ method: 'GET', body: undefined }))).toBeUndefined();
  });

  it('serializuje obiekt body do JSON', () => {
    expect(buildRequestBody(mockRequest({ body: { foo: 'bar' } }))).toBe('{"foo":"bar"}');
  });

  it('zwraca string body bez zmian', () => {
    expect(buildRequestBody(mockRequest({ body: '{"raw":true}' }))).toBe('{"raw":true}');
  });
});
