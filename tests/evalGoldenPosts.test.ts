import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PL_BANNED_PHRASES } from '@/prompts/plAntiSlop';

interface GoldenPost {
  id: string;
  industry: string;
  platform: string;
  topic: string;
  postText: string;
  mustHave: string[];
  mustNotContain: string[];
}

const goldenPath = join(process.cwd(), 'evals/golden-posts-pl.json');
const posts: GoldenPost[] = JSON.parse(readFileSync(goldenPath, 'utf8'));

function hasHook(text: string): boolean {
  const firstLine = text.split('\n')[0]?.trim() || '';
  return firstLine.length >= 8 && firstLine.length <= 160;
}

function hasQuestion(text: string): boolean {
  return text.includes('?');
}

function hasCta(text: string): boolean {
  return /\b(link|bio|dm|napisz|pisz|komentarz|zamów|zapisz|sprawdź|rezerw|kod|termin|call|cv|dzwoń|messenger|zapisy|taguj)\w*/i.test(
    text
  );
}

function hasNumber(text: string): boolean {
  return /\d/.test(text);
}

function hasList(text: string): boolean {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const bulletish = lines.filter((l) =>
    /^([-•*]|\d+[.)]|[A-Za-z]{1,12}:|Nie:|Tak:|\d+:\d{2})/.test(l)
  );
  return bulletish.length >= 2 || /\n[-•*]/.test(text) || /\d+:\d{2}\s/.test(text);
}

function hasSpecific(text: string): boolean {
  return (
    /\d/.test(text) ||
    /\b(zł|ul\.|kraków|wrocław|godzin|min)\b/i.test(text) ||
    text.length > 80
  );
}

function hasSocialProof(text: string): boolean {
  return /[„"][^"”]+[”"]|\b(klient|recenz|feedback|opin)\w*/i.test(text);
}

const CHECKS: Record<string, (t: string) => boolean> = {
  hook: hasHook,
  question: hasQuestion,
  cta: hasCta,
  number: hasNumber,
  list: hasList,
  specific: hasSpecific,
  'social-proof': hasSocialProof,
};

describe('eval golden posts PL', () => {
  it('has a meaningful golden set (40+)', () => {
    expect(posts.length).toBeGreaterThanOrEqual(40);
  });

  it('covers core industries and platforms', () => {
    const industries = new Set(posts.map((p) => p.industry));
    const platforms = new Set(posts.map((p) => p.platform));
    expect(industries.has('e-com')).toBe(true);
    expect(industries.has('lokal')).toBe(true);
    expect(industries.has('fryzjer')).toBe(true);
    expect(industries.has('b2b-saas')).toBe(true);
    expect(platforms.has('Instagram')).toBe(true);
    expect(platforms.has('LinkedIn')).toBe(true);
  });

  it('golden posts avoid global anti-slop banlist', () => {
    for (const post of posts) {
      for (const banned of PL_BANNED_PHRASES) {
        expect(post.postText.toLowerCase()).not.toContain(banned.toLowerCase());
      }
      for (const banned of post.mustNotContain) {
        expect(post.postText.toLowerCase()).not.toContain(banned.toLowerCase());
      }
    }
  });

  it('each golden post satisfies mustHave heuristics', () => {
    for (const post of posts) {
      for (const need of post.mustHave) {
        const fn = CHECKS[need];
        expect(fn, `${post.id} unknown mustHave=${need}`).toBeTypeOf('function');
        expect(fn(post.postText), `${post.id} failed mustHave=${need}`).toBe(true);
      }
      expect(post.postText.trim().length).toBeGreaterThanOrEqual(40);
    }
  });
});
