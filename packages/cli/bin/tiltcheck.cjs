#!/usr/bin/env node
/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */
/* eslint-disable */
const { existsSync } = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const entry = path.resolve(__dirname, '../dist/index.js');

if (!existsSync(entry)) {
  console.error(
    '[tiltcheck-cli] Build artifacts not found at packages/cli/dist/index.js.\n' +
      'Run: pnpm -C packages/cli build'
  );
  process.exit(1);
}

import(pathToFileURL(entry).href).catch((error) => {
  console.error('[tiltcheck-cli] Failed to start CLI:', error);
  process.exit(1);
});
