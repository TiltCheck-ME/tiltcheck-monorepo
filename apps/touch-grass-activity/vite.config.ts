// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-12
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// The browser never gets the real trivia bank (or its answers): guest mode runs on a small demo deck,
// and inside Discord the worker sends one question at a time with the answer only at the reveal.
const guestBank = fileURLToPath(new URL('./src/client/guestTriviaBank.ts', import.meta.url));
// Same for the solo games: Daily Grass answers and dictionary, and the Myth or Math bank, stay on
// the worker. Guest mode gets a practice word list and a small practice deck.
const guestDaily = fileURLToPath(new URL('./src/client/guestDailyWords.ts', import.meta.url));
const guestMyth = fileURLToPath(new URL('./src/client/guestMythBank.ts', import.meta.url));

export default defineConfig({
  // Relative asset paths so the build works behind the Discord proxy at any mapping root.
  base: './',
  resolve: {
    alias: [
      // Any relative path to these modules ('./x.js' from src/shared, '../shared/x.js' from src/client).
      { find: /^(?:\.{1,2}\/)+(?:shared\/)?triviaBank\.js$/, replacement: guestBank },
      { find: /^(?:\.{1,2}\/)+(?:shared\/)?dailyWords\.js$/, replacement: guestDaily },
      { find: /^(?:\.{1,2}\/)+(?:shared\/)?mythBank\.js$/, replacement: guestMyth },
    ],
  },
  server: {
    port: 5173,
    // `pnpm dev:worker` runs wrangler on 8787. Only used in guest mode with ?remote=1.
    proxy: { '/api': { target: 'http://127.0.0.1:8787', ws: true } },
  },
  build: { outDir: 'dist', target: 'es2022', sourcemap: false },
});
