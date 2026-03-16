/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Post-build script to inject hashed asset paths into HTML files.
 * This enables cache-busting for static assets.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = resolve(__dirname, 'dist');
const manifestPath = resolve(distPath, '.vite/manifest.json');

try {
  console.log('[Build] Reading asset manifest...');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

  const htmlFiles = readdirSync(distPath).filter(file => file.endsWith('.html'));

  console.log(`[Build] Processing ${htmlFiles.length} HTML files...`);

  for (const htmlFile of htmlFiles) {
    const filePath = resolve(distPath, htmlFile);
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;

    for (const originalPath in manifest) {
      const hashedPath = `/${manifest[originalPath].file}`;
      const regex = new RegExp(`(href|src)=["']/${originalPath}["']`, 'g');
      if (content.match(regex)) {
        content = content.replace(regex, `$1="${hashedPath}"`);
        modified = true;
        console.log(`  - Injected ${hashedPath} into ${htmlFile}`);
      }
    }

    if (modified) writeFileSync(filePath, content);
  }
  console.log('[Build] Successfully injected hashed assets into HTML.');
} catch (error) {
  console.error('[Build] Error processing asset manifest:', error);
  process.exit(1);
}