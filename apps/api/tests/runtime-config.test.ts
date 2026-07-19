/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-19 */

import { describe, expect, it } from 'vitest';
import { resolveApiPort } from '../src/runtime-config.js';

describe('resolveApiPort', () => {
  it('pins local development to the canonical API port', () => {
    expect(resolveApiPort({ NODE_ENV: 'development', PORT: '3001' })).toBe(8080);
  });

  it('uses the explicit production port when deployed', () => {
    expect(resolveApiPort({ NODE_ENV: 'production', PORT: '3001' })).toBe(3001);
  });

  it('falls back to 8080 when the provided production port is invalid', () => {
    expect(resolveApiPort({ NODE_ENV: 'production', PORT: 'not-a-port' })).toBe(8080);
  });

  it('defaults production to 8080 when PORT is unset (Hyperlift contract)', () => {
    expect(resolveApiPort({ NODE_ENV: 'production' })).toBe(8080);
  });
});
