import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// React (plugin-react v6, sem Babel) + Tailwind 4 (plugin oficial Vite).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // Pacote do workspace consumido como TS-source (Vite trata linked dep como source).
      '@contracts': fileURLToPath(
        new URL('../../packages/contracts/src', import.meta.url),
      ),
    },
  },
  server: {
    host: true, // escuta em 0.0.0.0 — necessário para acessar do Windows quando rodando no WSL2
    port: 5173,
  },
});
