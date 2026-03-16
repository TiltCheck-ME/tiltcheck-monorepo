/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { resolve } from 'path';
import { readdirSync } from 'fs';
import { defineConfig } from 'vite';

const root = 'public';
const publicPath = resolve(__dirname, root);

// Dynamically find all HTML files in the public directory to use as entry points.
const input = readdirSync(publicPath)
  .filter(file => file.endsWith('.html'))
  .reduce((acc, file) => {
    const name = file.slice(0, -5); // remove .html extension
    acc[name] = resolve(publicPath, file);
    return acc;
  }, {});

export default defineConfig({
  root,
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input,
    },
  },
});