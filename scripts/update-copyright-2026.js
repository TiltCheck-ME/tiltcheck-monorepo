const fs = require('fs');
const path = require('path');

const TARGET_DIRECTORIES = ['apps', 'modules', 'packages'];
const EXTENSIONS = ['.ts', '.js', '.tsx', '.jsx'];
const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.next', '.turbo', '.git'];

const NEW_HEADER = '/* Copyright (c) 2026 TiltCheck. All rights reserved. */\n';
const COPYRIGHT_REGEX = /\/\* Copyright \(c\) 2026 TiltCheck\. All rights reserved\. \*\/\r?\n?/;
const OLD_RANGE_REGEX = /© 2024[–-]2025/g;
const OLD_SINGLE_YEAR_REGEX = /© 2024/g;

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stats = fs.statSync(fullPath);
    if (stats.isDirectory()) {
      if (!EXCLUDE_DIRS.includes(file)) {
        walk(fullPath, callback);
      }
    } else {
      if (EXTENSIONS.includes(path.extname(file))) {
        callback(fullPath);
      }
    }
  }
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // 1. Identify and preserve shebang
    let shebang = '';
    if (content.startsWith('#!')) {
      const firstLineEnd = content.indexOf('\n');
      if (firstLineEnd !== -1) {
        shebang = content.substring(0, firstLineEnd + 1);
        content = content.substring(firstLineEnd + 1);
      } else {
        shebang = content;
        content = '';
      }
    }

    // 2. Remove existing 2026 header if present (to re-add it cleanly)
    content = content.replace(COPYRIGHT_REGEX, '');

    // 3. Update older ranges
    content = content.replace(OLD_RANGE_REGEX, '© 2024–2026');
    content = content.replace(OLD_SINGLE_YEAR_REGEX, '© 2024–2026');

    // 4. Prepend the new header
    const newContent = shebang + NEW_HEADER + content;

    if (newContent !== originalContent) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`Updated: ${filePath}`);
    } else {
      // console.log(`Skipped (already up to date): ${filePath}`);
    }
  } catch (err) {
    console.error(`Error processing ${filePath}: ${err.message}`);
  }
}

console.log('Starting copyright header update...');
const rootDir = process.argv[2] || process.cwd();

for (const targetDir of TARGET_DIRECTORIES) {
  const fullTargetDir = path.join(rootDir, targetDir);
  if (fs.existsSync(fullTargetDir)) {
    console.log(`Processing directory: ${targetDir}`);
    walk(fullTargetDir, processFile);
  } else {
    console.log(`Directory not found: ${targetDir}`);
  }
}

console.log('Copyright header update complete!');
