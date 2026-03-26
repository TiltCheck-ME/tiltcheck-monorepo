import fs from 'fs';
import path from 'path';

const fileExtensions = {
  '.ts': '/* Copyright (c) 2026 TiltCheck. All rights reserved. */',
  '.tsx': '/* Copyright (c) 2026 TiltCheck. All rights reserved. */',
  '.js': '/* Copyright (c) 2026 TiltCheck. All rights reserved. */',
  '.jsx': '/* Copyright (c) 2026 TiltCheck. All rights reserved. */',
  '.py': '# Copyright (c) 2026 TiltCheck. All rights reserved.',
  '.go': '// Copyright (c) 2026 TiltCheck. All rights reserved.',
  '.sh': '# Copyright (c) 2026 TiltCheck. All rights reserved.',
  '.ps1': '# Copyright (c) 2026 TiltCheck. All rights reserved.',
};

const directories = ['apps', 'packages', 'modules', 'services'];

function processFile(filePath) {
  const ext = path.extname(filePath);
  const header = fileExtensions[ext];
  if (!header) return;

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Improved regex to find existing copyright headers
    // Matches: /** ... © 2024-2026 TiltCheck ... */
    const jsDocMatch = content.match(/^\/\*\*[\s\S]*?(©|Copyright)[\s\S]*?TiltCheck[\s\S]*?\*\//);
    // Matches: /* Copyright ... */
    const simpleMatch = content.match(/^\/\*[\s\S]*?Copyright[\s\S]*?\*\//);
    // Matches: # Copyright ...
    const hashMatch = content.match(/^#.*Copyright.*$/m);
    // Matches: // Copyright ...
    const slashMatch = content.match(/^\/\/.*Copyright.*$/m);

    if (jsDocMatch && jsDocMatch.index === 0) {
      content = content.replace(jsDocMatch[0], header);
    } else if (simpleMatch && simpleMatch.index === 0) {
      content = content.replace(simpleMatch[0], header);
    } else if (hashMatch && content.indexOf(hashMatch[0]) < 100) {
        content = content.replace(hashMatch[0], header);
    } else if (slashMatch && content.indexOf(slashMatch[0]) < 100) {
        content = content.replace(slashMatch[0], header);
    } else {
      // Avoid prepending if header already exists but not matched by regex (simple check)
      if (!content.includes('Copyright (c) 2026 TiltCheck')) {
        content = header + '\n' + content;
      }
    }

    fs.writeFileSync(filePath, content, 'utf8');
  } catch (err) {
    console.error(`Error processing ${filePath}: ${err.message}`);
  }
}

function walkDir(dir) {
  const fullPath = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) return;
  const files = fs.readdirSync(fullPath);
  for (const file of files) {
    const filePath = path.join(fullPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git' && file !== '.turbo') {
        walkDir(filePath);
      }
    } else {
      processFile(filePath);
    }
  }
}

directories.forEach(dir => {
  console.log(`Processing directory: ${dir}`);
  walkDir(dir);
});

console.log('Copyright headers update complete.');
