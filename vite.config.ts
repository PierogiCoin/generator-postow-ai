import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Ładujemy zmienne z prefixem VITE_
    const env = loadEnv(mode, '.', 'VITE_'); 

    return {
      server: {
        port: 3000,
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
      plugins: [react()],
      
      define: {
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL),
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY),
      },
      
      // 🟢 DODANO: Konfiguracja ścieżki bazowej dla produkcyjnego budowania
      base: '/', 
      
      // 🟢 DODANO: Zapewnienie, że wszystkie zasoby są w folderze 'dist'
      build: {
          outDir: 'dist',
          assetsDir: 'assets',
      },

      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'), // Poprawiono alias, by wskazywał na src
        }
      }
    };
});