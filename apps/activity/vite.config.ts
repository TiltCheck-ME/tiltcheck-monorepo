// © 2024-2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-20
import { defineConfig } from 'vite';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    {
      name: 'generate-version-json',
      apply: 'build',
      writeBundle(options) {
        const outDir = options.dir || 'dist';
        const versionInfo = { version: new Date().getTime() };
        writeFileSync(resolve(outDir, 'version.json'), JSON.stringify(versionInfo));
      },
    },
  ],
  resolve: {
    alias: {
      '@sdk': resolve(__dirname, 'src/sdk'),
      '@views': resolve(__dirname, 'src/views'),
      '@state': resolve(__dirname, 'src/state'),
      '@utils': resolve(__dirname, 'src/utils'),
    }
  },
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
      '/api': {
        target: process.env.VITE_ACTIVITY_API_PROXY_TARGET || 'https://api.tiltcheck.me',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: process.env.VITE_ACTIVITY_SOCKET_PROXY_TARGET || 'http://127.0.0.1:8080',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
});
