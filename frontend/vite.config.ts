import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'frontend',
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  }
});
