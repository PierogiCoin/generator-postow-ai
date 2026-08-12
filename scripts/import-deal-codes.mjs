#!/usr/bin/env node
/**
 * Import kodów AppSumo / Lifetime do deal_codes.
 *
 * Użycie:
 *   DEALS_IMPORT_SECRET=... API_BASE=https://twoja-domena \
 *     node scripts/import-deal-codes.mjs codes.csv
 *
 * CSV: code,tier,source,notes
 *   AS-ABC-123,1,appsumo,
 *   LTD-XYZ,2,own,beta
 */

import fs from 'node:fs';
import path from 'node:path';

const apiBase = (process.env.API_BASE || process.env.FRONTEND_URL || 'http://localhost:3000').replace(
  /\/$/,
  ''
);
const secret = process.env.DEALS_IMPORT_SECRET;

if (!secret) {
  console.error('Ustaw DEALS_IMPORT_SECRET');
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error('Podaj plik CSV: node scripts/import-deal-codes.mjs codes.csv');
  process.exit(1);
}

const raw = fs.readFileSync(path.resolve(file), 'utf8');
const lines = raw.split(/\r?\n/).filter((l) => l.trim() && !l.trim().startsWith('#'));

const codes = [];
for (const line of lines) {
  if (/^code\s*,/i.test(line)) continue; // header
  const [code, tierStr, source, notes] = line.split(',').map((s) => s?.trim());
  const tier = Number(tierStr);
  if (!code || ![1, 2, 3].includes(tier)) {
    console.warn('Pomijam wiersz:', line);
    continue;
  }
  codes.push({
    code,
    tier,
    source: source === 'own' ? 'own' : 'appsumo',
    notes: notes || undefined,
  });
}

if (codes.length === 0) {
  console.error('Brak kodów do importu');
  process.exit(1);
}

const res = await fetch(`${apiBase}/api/deals/import`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-deals-import-secret': secret,
  },
  body: JSON.stringify({ codes }),
});

const data = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error('Import failed', res.status, data);
  process.exit(1);
}

console.log(`OK — imported: ${data.imported}, skipped: ${data.skipped}`);
