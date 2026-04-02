import { defineConfig } from 'vite';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

/**
 * © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
 *
 * HTTPS required: Discord Activities block HTTP content.
 */
export default defineConfig({
  plugins: [
    // Custom plugin to generate version.json on build
    {
      name: 'generate-version-json',
      apply: 'build', // Only run on build
      writeBundle(options) {
        const outDir = options.dir || 'dist';
        const versionInfo = { version: new Date().getTime() };
        writeFileSync(resolve(outDir, 'version.json'), JSON.stringify(versionInfo));
      },
    },
  ],
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
