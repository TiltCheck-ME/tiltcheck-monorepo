// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the build works behind the Discord proxy at any mapping root.
  base: './',
  server: {
    port: 5173,
    // `pnpm dev:worker` runs wrangler on 8787. Only used in guest mode with ?remote=1.
    proxy: { '/api': { target: 'http://127.0.0.1:8787', ws: true } },
  },
  build: { outDir: 'dist', target: 'es2022', sourcemap: false },
});
