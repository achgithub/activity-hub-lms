import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/api/apps/lms-manager/proxy/',
  server: {
    port: 3024,
  },
  build: {
    outDir: '../backend/static',
    emptyOutDir: true,
  },
});
