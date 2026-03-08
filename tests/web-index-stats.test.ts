import { describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const repoRoot = process.cwd();

function runScript(dom: JSDOM) {
  const script = fs.readFileSync(path.join(repoRoot, 'apps/web/scripts/index-stats.js'), 'utf8');
  vm.runInContext(script, dom.getInternalVMContext());
}

describe('landing stats strip', () => {
  it('hydrates stats from /api/stats payload', async () => {
    const dom = new JSDOM(
      `<!doctype html><body>
        <strong id="stat-communities">—</strong>
        <strong id="stat-scans">—</strong>
        <strong id="stat-blocked">—</strong>
        <span id="api-stats-status">Loading...</span>
      </body>`,
      { url: 'https://tiltcheck.dev', runScripts: 'outside-only' },
    );
    const context = dom.getInternalVMContext() as unknown as { fetch: typeof fetch };
    context.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        stats: {
          communitiesProtected: 15,
          scansLast24h: 101,
          highRiskBlocked: 7,
        },
      }),
    } as Response);

    runScript(dom);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.getElementById('stat-communities')?.textContent).toBe('15');
    expect(dom.window.document.getElementById('stat-scans')?.textContent).toBe('101');
    expect(dom.window.document.getElementById('stat-blocked')?.textContent).toBe('7');
    expect(dom.window.document.getElementById('api-stats-status')?.textContent).toContain('Live stats');
  });

  it('shows explicit fallback message when stats fetch fails', async () => {
    const dom = new JSDOM(
      `<!doctype html><body>
        <strong id="stat-communities">—</strong>
        <strong id="stat-scans">—</strong>
        <strong id="stat-blocked">—</strong>
        <span id="api-stats-status">Loading...</span>
      </body>`,
      { url: 'https://tiltcheck.dev', runScripts: 'outside-only' },
    );
    const context = dom.getInternalVMContext() as unknown as { fetch: typeof fetch };
    context.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    runScript(dom);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(dom.window.document.getElementById('api-stats-status')?.textContent).toContain(
      'temporarily unavailable',
    );
  });
});
