#!/usr/bin/env node
/**
 * Smoke test produkcyjny — backend (Railway) + frontend (Vercel) + proxy API.
 *
 * Użycie:
 *   BACKEND_URL=https://xxx.up.railway.app FRONTEND_URL=https://app.vercel.app npm run smoke
 *   npm run smoke -- --backend https://xxx.up.railway.app --frontend https://app.vercel.app
 */

const args = process.argv.slice(2);

function readArg(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

const BACKEND = (
  readArg('--backend') ||
  process.env.BACKEND_URL ||
  process.env.PUBLIC_BACKEND_URL ||
  ''
).replace(/\/$/, '');

const FRONTEND = (
  readArg('--frontend') ||
  process.env.FRONTEND_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  ''
).replace(/\/$/, '');

async function fetchCheck(name, url, opts = {}) {
  try {
    const res = await fetch(url, { ...opts, redirect: 'follow' });
    const ok = res.ok;
    let detail = `HTTP ${res.status}`;

    if (opts.expectJson && ok) {
      const json = await res.json();
      for (const key of opts.expectKeys || []) {
        if (!(key in json)) {
          return { name, ok: false, status: res.status, detail: `brak pola "${key}" w JSON` };
        }
      }
      detail = JSON.stringify(json).slice(0, 200);
    }

    return { name, ok, status: res.status, detail };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { name, ok: false, detail: message };
  }
}

async function main() {
  const results = [];

  console.log('\n🔍 Smoke test produkcyjny\n');
  console.log(`  Backend:  ${BACKEND || '(nie ustawiono)'}`);
  console.log(`  Frontend: ${FRONTEND || '(nie ustawiono)'}\n`);

  if (!BACKEND && !FRONTEND) {
    console.error('❌ Podaj BACKEND_URL i/lub FRONTEND_URL (env lub --backend / --frontend)\n');
    process.exit(1);
  }

  if (BACKEND) {
    results.push(
      await fetchCheck('Backend /health', `${BACKEND}/health`, {
        expectJson: true,
        expectKeys: ['status', 'deploy'],
      })
    );

    const healthRes = await fetch(`${BACKEND}/health`).catch(() => null);
    if (healthRes?.ok) {
      const health = await healthRes.json();
      const deploy = health.deploy;
      if (deploy) {
        console.log('  OAuth callbacks (z /health):');
        for (const [platform, uri] of Object.entries(deploy.oauthCallbacks || {})) {
          const isHttps = uri.startsWith('https://');
          const isLocal = uri.includes('localhost');
          const icon = isHttps && !isLocal ? '✅' : '⚠️';
          console.log(`    ${icon} ${platform}: ${uri}`);
        }
        if (deploy.frontendUrl) {
          console.log(`  FRONTEND_URL: ${deploy.frontendUrl}\n`);
        }
      }
    }

    results.push(
      await fetchCheck('Backend /api/trends', `${BACKEND}/api/trends`, {
        expectJson: true,
        expectKeys: ['trends'],
      })
    );
  }

  if (FRONTEND) {
    results.push(await fetchCheck('Frontend index', `${FRONTEND}/`));
    results.push(await fetchCheck('Frontend /health (Vercel proxy)', `${FRONTEND}/health`));

    if (BACKEND) {
      const proxyRes = await fetchCheck('Vercel /api/health → backend', `${FRONTEND}/api/health`, {
        expectJson: true,
        expectKeys: ['status'],
      });
      if (!proxyRes.ok && proxyRes.status === 503) {
        proxyRes.detail = 'BACKEND_URL nie ustawiony w Vercel — dodaj w Settings → Environment Variables';
      }
      results.push(proxyRes);
    }
  }

  console.log('Wyniki:\n');
  let failed = 0;
  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    console.log(`  ${icon} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
    if (!r.ok) failed++;
  }

  console.log(`\n${failed === 0 ? '✅ Wszystkie testy OK' : `❌ ${failed} test(ów) nie przeszło`}\n`);

  if (!BACKEND) {
    console.log('💡 Railway: ustaw PUBLIC_BACKEND_URL=https://twoj-backend.up.railway.app');
    console.log('   OAuth redirect URI w panelach social = {PUBLIC_BACKEND_URL}/api/social/callback/{platform}\n');
  }
  if (FRONTEND && BACKEND) {
    console.log('💡 Vercel env: BACKEND_URL=' + BACKEND);
    console.log('   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (frontend)\n');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
