import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: path.resolve(__dirname, 'frontend'),
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
      '/ws':  { target: 'ws://localhost:3001',   ws: true },
      '/py':  { target: 'http://localhost:8765',  changeOrigin: true, rewrite: p => p.replace(/^\/py/, '') },
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});
