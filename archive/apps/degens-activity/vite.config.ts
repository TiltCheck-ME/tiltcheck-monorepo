// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved.
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  optimizeDeps: {
    include: ['@discord/embedded-app-sdk'],
  },
  server: {
    host: true,
    port: 5174,
    allowedHosts: ['dev-degens.tiltcheck.me', 'localhost'],
    proxy: {
      '/.proxy': {
        target: 'https://discord.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/\.proxy/, ''),
      },
      '/api': {
        target: process.env.VITE_API_PROXY || 'https://api.tiltcheck.me',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: process.env.VITE_SOCKET_PROXY || 'http://127.0.0.1:3010',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: { input: { main: './index.html' } },
  },
});
