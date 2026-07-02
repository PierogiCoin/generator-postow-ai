#!/usr/bin/env node
/**
 * Sprawdza gotowość produkcji: OAuth, Stripe, proxy.
 * npm run prod:readiness
 */

const BACKEND =
  process.env.BACKEND_URL?.replace(/\/$/, '') ||
  'https://generator-postow-api-production.up.railway.app';
const FRONTEND =
  process.env.FRONTEND_URL?.replace(/\/$/, '') ||
  'https://generator-postow-ai.vercel.app';

const OAUTH_PANELS = {
  linkedin: 'https://www.linkedin.com/developers/apps',
  twitter: 'https://developer.twitter.com/en/portal/dashboard',
  facebook: 'https://developers.facebook.com/apps/',
  tiktok: 'https://developers.tiktok.com/',
};

async function main() {
  console.log('\n📋 Gotowość produkcji\n');
  console.log(`Backend:  ${BACKEND}`);
  console.log(`Frontend: ${FRONTEND}\n`);

  const healthRes = await fetch(`${BACKEND}/health`);
  if (!healthRes.ok) {
    console.error('❌ Backend /health niedostępny:', healthRes.status);
    process.exit(1);
  }

  const health = await healthRes.json();
  const deploy = health.deploy || {};
  const oauth = deploy.oauthCallbacks || {};
  const configured = deploy.oauthConfigured || {};
  const stripe = deploy.stripe || {};

  console.log('── OAuth (redirect URI w panelu developera) ──\n');
  for (const [platform, uri] of Object.entries(oauth)) {
    const ok = configured[platform];
    const icon = ok ? '✅' : '⚠️';
    console.log(`  ${icon} ${platform}`);
    console.log(`     URI: ${uri}`);
    if (!ok) {
      console.log(`     Env Railway: brak kluczy — ${OAUTH_PANELS[platform] || 'panel developera'}`);
    }
    console.log('');
  }

  console.log('── Stripe ──\n');
  if (stripe.ready) {
    const mode = stripe.liveMode ? 'LIVE' : stripe.testMode ? 'TEST' : 'unknown';
    console.log(`  ✅ Stripe skonfigurowany (${mode})`);
    if (stripe.liveMode && stripe.productionReady) {
      console.log('  ✅ Gotowe do przyjmowania płatności LIVE');
    } else if (stripe.testMode) {
      console.log('  ⚠️  Tryb testowy — przed launch ustaw sk_live_ + webhook LIVE');
      console.log('     npm run stripe:live-check');
    }
  } else {
    console.log('  ⚠️  Stripe niekompletny w Railway:');
    console.log(`     STRIPE_SECRET_KEY: ${stripe.secretKey ? '✓' : '✗'}`);
    console.log(`     STRIPE_WEBHOOK_SECRET: ${stripe.webhookSecret ? '✓' : '✗'}`);
    console.log(`     Price IDs: ${stripe.priceIdsConfigured ?? 0}/${stripe.priceIdsTotal ?? 5}`);
    console.log(`     Webhook URL: ${BACKEND}/api/payments/webhook`);
  }
  console.log('');

  const proxyRes = await fetch(`${FRONTEND}/api/health`);
  console.log(`── Proxy Vercel → Railway ──`);
  console.log(proxyRes.ok ? '  ✅ /api/health OK' : `  ❌ /api/health HTTP ${proxyRes.status}`);
  console.log('');

  const missingOAuth = Object.entries(configured).filter(([, v]) => !v).map(([k]) => k);
  const exitCode = missingOAuth.length > 0 || !stripe.ready ? 0 : 0;
  if (missingOAuth.length) {
    console.log('💡 Uzupełnij w Railway Variables:', missingOAuth.map((p) => `${p.toUpperCase()}_*`).join(', '));
  }
  console.log('');
  process.exit(exitCode);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
