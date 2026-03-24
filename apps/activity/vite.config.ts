import { defineConfig } from 'vite';

/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 *
 * HTTPS required: Discord Activities block HTTP content.
 * basicSsl generates a self-signed cert for local dev.
 */
export default defineConfig({
  plugins: [], 
  optimizeDeps: {
    include: ['@discord/embedded-app-sdk'],
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['dev-activity.tiltcheck.me', 'localhost'],
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
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
});

