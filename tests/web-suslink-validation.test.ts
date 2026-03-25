import { describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const repoRoot = process.cwd();

function loadSuslinkInlineScript() {
  const html = fs.readFileSync(path.join(repoRoot, 'apps/web/tools/suslink.html'), 'utf8');
  const inlineScriptMatch = html.match(/<script>\s*\/\/ LinkCheck Scanner Script[\s\S]*?\)\(\);\s*<\/script>/);
  if (!inlineScriptMatch) {
    throw new Error('Could not locate LinkCheck scanner inline script');
  }
  return inlineScriptMatch[0]
    .replace(/^<script>\s*/, '')
    .replace(/\s*<\/script>$/, '');
}

function setupDom() {
  return new JSDOM(
    `<!doctype html><body>
      <form id="scannerForm"></form>
      <input id="urlInput" />
      <button id="scanBtn"></button>
      <div id="scanResult" class="scan-result"></div>
      <span id="resultIcon"></span>
      <span id="resultTitle"></span>
      <div id="resultUrl"></div>
      <div id="resultReason"></div>
      <div id="resultTimestamp"></div>
      <div id="donateWidget" class="donate-widget"></div>
    </body>`,
    { url: 'https://tiltcheck.dev/tools/suslink.html', runScripts: 'outside-only' },
  );
}

describe('suslink web scanner URL validation', () => {
  it('gracefully rejects non-http(s) protocols', async () => {
    const dom = setupDom();
    const context = dom.getInternalVMContext() as unknown as { fetch: typeof fetch };
    context.fetch = vi.fn().mockResolvedValue({ ok: false } as Response);

    vm.runInContext(loadSuslinkInlineScript(), dom.getInternalVMContext());

    const input = dom.window.document.getElementById('urlInput') as HTMLInputElement;
    input.value = 'javascript:alert(1)';
    const form = dom.window.document.getElementById('scannerForm') as HTMLFormElement;
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    await new Promise((resolve) => setTimeout(resolve, 0));

    const title = dom.window.document.getElementById('resultTitle')?.textContent;
    const reason = dom.window.document.getElementById('resultReason')?.textContent;
    expect(title).toBe('Invalid URL');
    expect(reason).toMatch(/http\(s\)/i);
    expect(context.fetch).not.toHaveBeenCalled();
  });

  it('normalizes bare hostnames and scans gracefully', async () => {
    const dom = setupDom();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false } as Response);
    const context = dom.getInternalVMContext() as unknown as { fetch: typeof fetch };
    context.fetch = fetchMock;

    vm.runInContext(loadSuslinkInlineScript(), dom.getInternalVMContext());

    const input = dom.window.document.getElementById('urlInput') as HTMLInputElement;
    input.value = 'example.com';
    const form = dom.window.document.getElementById('scannerForm') as HTMLFormElement;
    form.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }));

    await new Promise((resolve) => setTimeout(resolve, 1700));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body || '{}')) as { url?: string };
    expect(body.url).toBe('https://example.com/');
  });
});
