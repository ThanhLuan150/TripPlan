import {fileURLToPath, URL} from 'node:url';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Libraries that get their own file: they rarely change, so the browser keeps them cached.
const chunks: Record<string, string[]> = {
  react: ['react', 'react-dom', 'react-router-dom'],
  leaflet: ['leaflet', 'react-leaflet'],
  i18n: ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
};
const chunkOf = (id: string) =>
  Object.entries(chunks).find(([, packages]) => packages.some(name => id.includes(`/node_modules/${name}/`)))?.[0];

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // import {...} from '@/features/trips/...'
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        // (a function: Vite 8 / Rolldown no longer accepts the object form)
        manualChunks: id => chunkOf(id),
      },
    },
  },
});
