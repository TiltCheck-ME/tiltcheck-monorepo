import path, { resolve } from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const root = __dirname;
const publicDir = resolve(__dirname, 'public');

// Find HTML files in both root and public directory to use as entry points.
// Note: Vite will only find files within its root.
const input = {
  'index': resolve(root, 'index.html'),
  'login': resolve(root, 'login.html'),
  'dashboard/index': resolve(root, 'dashboard/index.html'),
  'sitemap': resolve(publicDir, 'sitemap.html'),
  'bonuses': resolve(root, 'bonuses.html'),
};

export default defineConfig({
  root,
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input,
    },
  },
});