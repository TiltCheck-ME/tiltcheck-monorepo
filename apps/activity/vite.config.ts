import { defineConfig } from 'vite';

/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 *
 * HTTPS required: Discord Activities block HTTP content.
 * basicSsl generates a self-signed cert for local dev.
 */
export default defineConfig({
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,

    proxy: {
      '/.proxy': {
        target: 'https://discord.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/\.proxy/, ''),
      },
    },
  },
  build: {
    target: 'esnext',
  },
});

