import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:7842', changeOrigin: true },
    }
  },
  build: { outDir: 'dist', emptyOutDir: true },
  optimizeDeps: {
    exclude: ['three/addons']
  },
  resolve: {
    alias: {
      // allow "three/addons/..." imports in node_modules to resolve correctly
    }
  }
});
