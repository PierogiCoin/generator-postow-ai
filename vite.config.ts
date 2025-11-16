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
      
      // 🟢 USUNIĘTO: Usunięto próby wstrzyknięcia kluczy GEMINI_API_KEY!
      define: {
        // Możesz wstrzyknąć zmienne Vite, ale jest to opcjonalne, 
        // jeśli używasz import.meta.env w kodzie.
        'import.meta.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL),
        // Zachowaj tylko zmienne frontendowe (VITE_...)
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