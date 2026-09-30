import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  // nginx отдаёт фронт по префиксу /nogotochki/ (alias /var/www/nogotochki-frontend/).
  // С base:'/' сборка ссылалась на /assets/... → 404, страница оставалась пустой.
  base: '/nogotochki/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // dev-режим: запросы /api перенаправляем на локальный backend
      '/api': 'http://127.0.0.1:3001',
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});


