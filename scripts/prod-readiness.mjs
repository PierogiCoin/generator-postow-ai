#!/usr/bin/env node
/**
 * Sprawdza gotowość produkcji: OAuth, Stripe, proxy.
 * npm run prod:readiness
 *
 * Wymaga CRON_SECRET (ten sam co na Railway) do /health/ready.
 */

const BACKEND =
  process.env.BACKEND_URL?.replace(/\/$/, '') ||
  'https://generator-postow-api-production.up.railway.app';
const FRONTEND =
  process.env.FRONTEND_URL?.replace(/\/$/, '') ||
  'https://generator-postow-ai.vercel.app';
const CRON_SECRET = process.env.CRON_SECRET || '';

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

  let failed = false;

  const healthRes = await fetch(`${BACKEND}/health`);
  if (!healthRes.ok) {
    console.error('❌ Backend /health niedostępny:', healthRes.status);
    process.exit(1);
  }
  console.log('  ✅ Backend /health OK\n');

  if (!CRON_SECRET) {
    console.error('❌ Ustaw CRON_SECRET w env (ten sam co Railway) — wymagany do /health/ready');
    failed = true;
  }

  let missingOAuth = [];
  let stripe = {};

  if (CRON_SECRET) {
    const readyRes = await fetch(`${BACKEND}/health/ready`, {
      headers: { 'x-cron-secret': CRON_SECRET },
    });
    if (!readyRes.ok) {
      console.error('❌ Backend /health/ready:', readyRes.status);
      failed = true;
    } else {
      const ready = await readyRes.json();
      const deploy = ready.deploy || {};
      const oauth = deploy.oauthCallbacks || {};
      const configured = deploy.oauthConfigured || {};
      stripe = deploy.stripe || {};

      console.log('── OAuth (redirect URI w panelu developera) ──\n');
      for (const [platform, uri] of Object.entries(oauth)) {
        const ok = configured[platform];
        const icon = ok ? '✅' : '⚠️';
        console.log(`  ${icon} ${platform}`);
        console.log(`     URI: ${uri}`);
        if (!ok) {
          console.log(
            `     Env Railway: brak kluczy — ${OAUTH_PANELS[platform] || 'panel developera'}`
          );
        }
        console.log('');
      }

      missingOAuth = Object.entries(configured)
        .filter(([, v]) => !v)
        .map(([k]) => k);

      console.log('── Stripe ──\n');
      if (stripe.ready) {
        const mode = stripe.liveMode ? 'LIVE' : stripe.testMode ? 'TEST' : 'unknown';
        console.log(`  ✅ Stripe skonfigurowany (${mode})`);
        if (stripe.liveMode && stripe.productionReady) {
          console.log('  ✅ Gotowe do przyjmowania płatności LIVE');
        } else if (stripe.testMode) {
          console.log('  ⚠️  Tryb testowy — przed launch ustaw sk_live_ + webhook LIVE');
          console.log('     npm run stripe:live-check');
          failed = true;
        }
      } else {
        console.log('  ❌ Stripe niekompletny w Railway:');
        console.log(`     STRIPE_SECRET_KEY: ${stripe.secretKey ? '✓' : '✗'}`);
        console.log(`     STRIPE_WEBHOOK_SECRET: ${stripe.webhookSecret ? '✓' : '✗'}`);
        console.log(`     Price IDs: ${stripe.priceIdsConfigured ?? 0}/${stripe.priceIdsTotal ?? 5}`);
        console.log(`     Webhook URL: ${BACKEND}/api/payments/webhook`);
        failed = true;
      }
      console.log('');
    }
  }

  const proxyRes = await fetch(`${FRONTEND}/api/health`);
  console.log(`── Proxy Vercel → Railway ──`);
  if (proxyRes.ok) {
    console.log('  ✅ /api/health OK');
  } else {
    console.log(`  ❌ /api/health HTTP ${proxyRes.status}`);
    failed = true;
  }
  console.log('');

  if (missingOAuth.length) {
    console.log(
      '💡 Uzupełnij w Railway Variables:',
      missingOAuth.map((p) => `${p.toUpperCase()}_*`).join(', ')
    );
    // OAuth częściowy = ostrzeżenie, nie twardy fail (nie wszystkie platformy muszą być włączone)
  }

  if (failed) {
    console.log('❌ Gotowość produkcji: FAIL\n');
    process.exit(1);
  }

  console.log('✅ Gotowość produkcji: OK\n');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
