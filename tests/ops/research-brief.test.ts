/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  parseArgs,
  runResearchBrief,
  validateModelCellValue,
} from '../../scripts/ops/research-brief.mjs';

const tempDirs = [];

async function makeTempDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'research-brief-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('parseArgs', () => {
  it('parses supported flags', () => {
    expect(
      parseArgs([
        '--slug',
        'competitor-matrix',
        '--date',
        '2026-07-18',
        '--config',
        'docs/ops/research-competitors.json',
        '--out-dir',
        'docs/research',
      ]),
    ).toEqual({
      slug: 'competitor-matrix',
      date: '2026-07-18',
      config: 'docs/ops/research-competitors.json',
      outDir: 'docs/research',
      help: false,
    });
  });
});

describe('validateModelCellValue', () => {
  it('forces unsupported positive claims back to unknown', () => {
    expect(
      validateModelCellValue('yes', '<p>Public pricing plans live here.</p>', {
        positive: ['safety index', 'trust score'],
      }),
    ).toBe('unknown');
  });
});

describe('runResearchBrief', () => {
  it('writes markdown and sidecar even when fetches fail', async () => {
    const root = await makeTempDir();
    const configPath = path.join(root, 'competitors.json');
    const outDir = path.join(root, 'research');

    await writeFile(
      configPath,
      JSON.stringify(
        {
          copyright: '© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18',
          axes: ['trust_scoring', 'pricing'],
          axisHints: {
            trust_scoring: ['safety index'],
            pricing: ['pricing plans'],
          },
          competitors: [
            {
              id: 'rival-one',
              name: 'Rival One',
              urls: ['https://example.com/rival-one'],
            },
          ],
        },
        null,
        2,
      ),
      'utf8',
    );

    const result = await runResearchBrief({
      slug: 'competitor-matrix',
      date: '2026-07-18',
      configPath,
      outDir,
      fetchImpl: async () => ({
        ok: false,
        status: 503,
        text: async () => '',
      }),
    });

    const markdown = await readFile(result.markdownPath, 'utf8');
    const sidecar = JSON.parse(await readFile(result.sidecarPath, 'utf8'));

    expect(result.mode).toBe('heuristic');
    expect(result.fetches).toHaveLength(1);
    expect(markdown).toContain('status 503');
    expect(markdown).toContain('## Gaps');
    expect(sidecar.proposedTasks).toHaveLength(2);
  });

  it('downgrades llm output when fetched text does not support it', async () => {
    const root = await makeTempDir();
    const configPath = path.join(root, 'competitors.json');
    const outDir = path.join(root, 'research');

    await writeFile(
      configPath,
      JSON.stringify(
        {
          copyright: '© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-18',
          axes: ['trust_scoring', 'pricing'],
          axisHints: {
            trust_scoring: ['safety index', 'trust score'],
            pricing: ['pricing plans'],
          },
          competitors: [
            {
              id: 'rival-two',
              name: 'Rival Two',
              urls: ['https://example.com/rival-two'],
            },
          ],
        },
        null,
        2,
      ),
      'utf8',
    );

    const result = await runResearchBrief({
      slug: 'competitor-matrix',
      date: '2026-07-18',
      configPath,
      outDir,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        text: async () => '<html><body><p>Public pricing plans are live.</p></body></html>',
      }),
      llmApiKey: 'test-key',
      llmClient: async () => ({
        mode: 'llm',
        cells: {
          'Rival Two': {
            trust_scoring: 'yes',
            pricing: 'yes',
          },
        },
      }),
    });

    expect(result.mode).toBe('llm');
    expect(result.matrix['Rival Two'].trust_scoring.value).toBe('unknown');
    expect(result.matrix['Rival Two'].pricing.value).toBe('yes');
  });
});
