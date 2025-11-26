import * as esbuild from 'esbuild';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isWatch = process.argv.includes('--watch');

async function build() {
  console.log('🔨 Building TiltGuard Browser Extension...');

  // Clean dist directory
  await fs.rm(path.join(__dirname, 'dist'), { recursive: true, force: true });
  await fs.mkdir(path.join(__dirname, 'dist'), { recursive: true });

  // Build content script
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src/content.ts')],
    bundle: true,
    outfile: path.join(__dirname, 'dist/content.js'),
    format: 'iife',
    platform: 'browser',
    target: 'chrome100',
    sourcemap: true,
    minify: false,
  });

  // Build popup script
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src/popup.js')],
    bundle: true,
    outfile: path.join(__dirname, 'dist/popup.js'),
    format: 'iife',
    platform: 'browser',
    target: 'chrome100',
    sourcemap: true,
    minify: false,
  });

  // Copy static files
  const staticFiles = [
    { src: 'src/manifest.json', dest: 'dist/manifest.json' },
    { src: 'src/popup.html', dest: 'dist/popup.html' },
  ];

  for (const file of staticFiles) {
    const srcPath = path.join(__dirname, file.src);
    const destPath = path.join(__dirname, file.dest);
    await fs.copyFile(srcPath, destPath);
    console.log(`📋 Copied ${file.src} -> ${file.dest}`);
  }

  console.log('✅ Build complete! Extension ready in ./dist');
  console.log('');
  console.log('📦 To install in Chrome:');
  console.log('   1. Open chrome://extensions/');
  console.log('   2. Enable "Developer mode" (top right)');
  console.log('   3. Click "Load unpacked"');
  console.log('   4. Select the ./dist folder');
  console.log('');
}

build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
