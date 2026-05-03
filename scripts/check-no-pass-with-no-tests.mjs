#!/usr/bin/env node
/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const workspaceRoots = ['apps', 'packages', 'modules'];
const offenders = [];

for (const workspaceRoot of workspaceRoots) {
  for (const entry of readdirSync(workspaceRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const packageJsonPath = join(workspaceRoot, entry.name, 'package.json');
    if (!existsSync(packageJsonPath)) {
      continue;
    }

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const testScript = packageJson.scripts?.test;

    if (typeof testScript === 'string' && testScript.includes('--passWithNoTests')) {
      offenders.push({
        name: packageJson.name ?? `${workspaceRoot}/${entry.name}`,
        path: packageJsonPath,
        script: testScript,
      });
    }
  }
}

if (offenders.length > 0) {
  console.error('Blocked test script configuration: remove --passWithNoTests before merging.');
  for (const offender of offenders) {
    console.error(`- ${offender.name} (${offender.path}): ${offender.script}`);
  }
  process.exit(1);
}

console.log('No workspace test script uses --passWithNoTests.');
