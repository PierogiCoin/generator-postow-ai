#!/usr/bin/env node
/**
 * Checklist Stripe LIVE + walidacja env.
 * npm run stripe:live-check
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const BACKEND =
  process.env.BACKEND_URL?.replace(/\/$/, '') ||
  'https://generator-postow-api-production.up.railway.app';

const SUB_PRICE_KEYS = [
  'STRIPE_CREATOR_PRICE_ID',
  'STRIPE_PRO_PRICE_ID',
  'STRIPE_BUSINESS_PRICE_ID',
  'STRIPE_AGENCY_PRICE_ID',
  'STRIPE_ENTERPRISE_PRICE_ID',
];

const PACK_PRICE_KEYS = [
  'STRIPE_CREDITS_SMALL_PRICE_ID',
  'STRIPE_CREDITS_MEDIUM_PRICE_ID',
  'STRIPE_CREDITS_LARGE_PRICE_ID',
  'STRIPE_CREDITS_MEGA_PRICE_ID',
];

function loadEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function keyStatus(key, env) {
  const v = process.env[key] || env[key];
  if (!v) return '✗ brak';
  if (key === 'STRIPE_SECRET_KEY') {
    if (v.startsWith('sk_live_')) return '✓ LIVE';
    if (v.startsWith('sk_test_')) return '⚠ test mode';
    return '✗ nieprawidłowy format';
  }
  if (key.startsWith('STRIPE_') && key.endsWith('_PRICE_ID')) {
    return v.startsWith('price_') ? `✓ ${v.slice(0, 18)}…` : '✗ nieprawidłowy price id';
  }
  if (key === 'STRIPE_WEBHOOK_SECRET') {
    return v.startsWith('whsec_') ? '✓ ustawiony' : '✗ nieprawidłowy whsec';
  }
  return v ? '✓' : '✗';
}

async function main() {
  const serverEnv = loadEnvFile(resolve('server/.env'));
  const merged = { ...serverEnv, ...process.env };

  console.log('\n💳 Stripe LIVE — checklist\n');
  console.log('Backend webhook URL:');
  console.log(`  ${BACKEND}/api/payments/webhook\n`);

  console.log('── 1. Klucze (Railway) ──\n');
  for (const key of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']) {
    console.log(`  ${key}: ${keyStatus(key, merged)}`);
  }

  console.log('\n── 2. Price IDs subskrypcji ──\n');
  for (const key of SUB_PRICE_KEYS) {
    console.log(`  ${key}: ${keyStatus(key, merged)}`);
  }

  console.log('\n── 3. Price IDs pakietów kredytów ──\n');
  for (const key of PACK_PRICE_KEYS) {
    console.log(`  ${key}: ${keyStatus(key, merged)}`);
  }

  console.log('\n── 4. Frontend (Vercel) ──\n');
  const pk = process.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
  if (pk.startsWith('pk_live_')) console.log('  VITE_STRIPE_PUBLISHABLE_KEY: ✓ LIVE');
  else if (pk.startsWith('pk_test_')) console.log('  VITE_STRIPE_PUBLISHABLE_KEY: ⚠ test mode');
  else console.log('  VITE_STRIPE_PUBLISHABLE_KEY: ✗ brak (opcjonalnie jeśli Stripe.js w przyszłości)');

  console.log('\n── 5. Health API ──\n');
  try {
    const res = await fetch(`${BACKEND}/health`);
    const data = await res.json();
    const s = data.deploy?.stripe || {};
    console.log(`  liveMode: ${s.liveMode ? '✓' : '✗'}`);
    console.log(`  productionReady: ${s.productionReady ? '✓' : '✗'}`);
    console.log(`  priceIds: ${s.priceIdsConfigured}/${s.priceIdsTotal}`);
    console.log(`  creditPacks: ${s.creditPacksConfigured}/${s.creditPacksTotal}`);
  } catch (e) {
    console.log(`  ❌ Nie udało się pobrać /health: ${e.message}`);
  }

  console.log('\n── Kroki ręczne ──\n');
  console.log('  1. stripe login');
  console.log('  2. bash scripts/stripe-bootstrap-live.sh   # produkty LIVE + webhook');
  console.log('  3. Wklej zmienne z /tmp/generator-postow-stripe-live-env.txt → Railway');
  console.log('  4. W Stripe Dashboard → Webhooks → wyślij test invoice.payment_failed');
  console.log('  5. npm run stripe:live-check  # powtórz aż productionReady = ✓\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
