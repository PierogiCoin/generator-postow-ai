import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', 'VITE_');
    const rawApiUrl = env.VITE_API_BASE_URL ?? '';
    // Nigdy nie wbudowuj localhost do bundle produkcyjnego
    const apiBaseUrl =
        mode === 'production' && /localhost|127\.0\.0\.1/.test(rawApiUrl) ? '' : rawApiUrl;

    const appBuildId =
        process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ||
        env.VITE_APP_BUILD_ID ||
        (mode === 'production' ? Date.now().toString(36) : 'local');

    const appChangelog =
        env.VITE_APP_CHANGELOG ||
        'Nowa wersja — lepsze komunikaty błędów, banner aktualizacji i tryb Szybki w generatorze.';

    return {
      server: {
        port: 3000,
        strictPort: true,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            secure: false,
            ws: true,
          }
        }
      },
      plugins: [
        react(),
        {
          name: 'emit-build-id',
          closeBundle() {
            const outDir = path.resolve(__dirname, 'dist');
            const payload = {
              buildId: appBuildId,
              builtAt: new Date().toISOString(),
              changelog: appChangelog,
            };
            fs.mkdirSync(outDir, { recursive: true });
            fs.writeFileSync(path.join(outDir, 'build-id.json'), JSON.stringify(payload));
          },
        },
      ],
      
      define: {
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl),
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL ?? ''),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY ?? ''),
        'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(appBuildId),
      },
      
      // 🟢 DODANO: Konfiguracja ścieżki bazowej dla produkcyjnego budowania
      base: '/', 
      
      // 🟢 DODANO: Zapewnienie, że wszystkie zasoby są w folderze 'dist'
      build: {
          outDir: 'dist',
          assetsDir: 'assets',
          rollupOptions: {
            output: {
              manualChunks(id) {
                if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
                  return 'recharts';
                }
                if (id.includes('node_modules/lucide-react')) {
                  return 'lucide';
                }
                if (id.includes('node_modules/@google/genai') || id.includes('node_modules/@google/generative-ai')) {
                  return 'genai';
                }
                if (id.includes('node_modules/@supabase')) {
                  return 'supabase';
                }
                if (
                  id.includes('node_modules/react-dom') ||
                  id.includes('node_modules/react-router') ||
                  id.includes('node_modules/react/') ||
                  id.includes('node_modules/scheduler/')
                ) {
                  return 'react-vendor';
                }
                if (id.includes('node_modules/html-to-image')) {
                  return 'html-to-image';
                }
              },
            },
          },
      },

      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'), // Poprawiono alias, by wskazywał na src
        }
      }
    };
});