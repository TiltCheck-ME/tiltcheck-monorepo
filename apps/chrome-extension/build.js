import * as esbuild from 'esbuild';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isWatch = process.argv.includes('--watch');

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function build() {
  console.log('🔨 Building TiltGuard Browser Extension v1.1.0...');

  // Clean dist directory (but preserve icons if they exist)
  const distPath = path.join(__dirname, 'dist');
  const iconsPath = path.join(distPath, 'icons');
  
  // Check if icons exist before cleaning
  let hasIcons = false;
  try {
    await fs.access(iconsPath);
    hasIcons = true;
  } catch {
    hasIcons = false;
  }

  await fs.rm(distPath, { recursive: true, force: true });
  await fs.mkdir(distPath, { recursive: true });

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

  // Copy icons directory if it exists in src/icons
  const srcIconsDir = path.join(__dirname, 'src', 'icons');
  const destIconsDir = path.join(__dirname, 'dist', 'icons');
  try {
    await fs.access(srcIconsDir);
    await copyDir(srcIconsDir, destIconsDir);
    console.log('📦 Copied icons from src/icons to dist/icons');
  } catch {
    // Create icons directory and add placeholder info
    await fs.mkdir(destIconsDir, { recursive: true });
    console.log('⚠️  Icons directory created - please add icon16.png, icon48.png, icon128.png to src/icons');
  }

  console.log('✅ Build complete! Extension ready in ./dist');
  console.log('');
  console.log('📦 To install in Chrome:');
  console.log('   1. Open chrome://extensions/');
  console.log('   2. Enable "Developer mode" (top right)');
  console.log('   3. Click "Load unpacked"');
  console.log('   4. Select the ./dist folder');
  console.log('');
  console.log('📦 To create zip:');
  console.log('   npm run zip');
  console.log('');
}

build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
