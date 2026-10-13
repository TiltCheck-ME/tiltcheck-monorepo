// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-04
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function destinationFor(source: string, config: string): string | undefined {
  const pattern = new RegExp(`source: '${source.replaceAll('/', '\\/')}'[\\s\\S]*?destination: '([^']+)'`);
  return config.match(pattern)?.[1];
}

describe('legacy redirects', () => {
  const config = readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../next.config.mjs'),
    'utf8',
  );

  it('sends leftover html and autovault install straight home', () => {
    expect(destinationFor('/casinos.html', config)).toBe('/');
    expect(destinationFor('/tools/auto-vault/install', config)).toBe('/');
  });

  it('keeps the hub handoff on the dashboard', () => {
    expect(destinationFor('/hub.html', config)).toBe('/dashboard');
  });
});
