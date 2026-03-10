import { describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const repoRoot = process.cwd();

function runScriptInDom(scriptPath: string, dom: JSDOM) {
  const script = fs.readFileSync(path.join(repoRoot, scriptPath), 'utf8');
  vm.runInContext(script, dom.getInternalVMContext());
}

describe('web XSS hardening', () => {
  it('escapes untrusted trust dashboard payload values', () => {
    const dom = new JSDOM(
      `<!doctype html><body>
        <table><tbody id="trustBody"></tbody></table>
        <div id="status"></div>
        <input id="filterScore" value="0" />
        <select id="filterRisk"><option value=""></option></select>
        <button id="refreshBtn"></button>
      </body>`,
      { url: 'https://tiltcheck.dev', runScripts: 'outside-only' },
    );
    const context = dom.getInternalVMContext() as unknown as {
      fetch: typeof fetch;
      EventSource: unknown;
      renderRows: (data: unknown[]) => void;
    };
    context.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);
    context.EventSource = class {
      close() {}
    };

    runScriptInDom('apps/web/trust-dashboard.js', dom);

    context.renderRows([
      {
        casinoName: `<img src=x onerror="window.__xss='name'">`,
        currentScore: 91,
        scoreDelta: 3,
        riskLevel: 'high',
        volatility24h: 0.42,
        nerfs24h: 1,
        lastReasons: [`<svg onload="window.__xss='reason'"></svg>`],
      },
    ]);

    const tbody = dom.window.document.getElementById('trustBody') as HTMLTableSectionElement;
    expect(tbody.querySelector('img')).toBeNull();
    expect(tbody.querySelector('svg')).toBeNull();
    expect(tbody.innerHTML).toContain('&lt;img src=x onerror=');
    expect((dom.window as unknown as { __xss?: string }).__xss).toBeUndefined();
  });

  it('renders Discord username as text in auth dropdown', () => {
    const dom = new JSDOM('<!doctype html><body></body>', {
      url: 'https://tiltcheck.dev',
      runScripts: 'outside-only',
    });
    const context = dom.getInternalVMContext() as unknown as {
      fetch: typeof fetch;
      __TC_AUTH_DISABLE_AUTO_INIT: boolean;
    };
    context.fetch = vi.fn().mockResolvedValue({ ok: false } as Response);
    context.__TC_AUTH_DISABLE_AUTO_INIT = true;

    runScriptInDom('apps/web/scripts/auth.js', dom);

    const TiltCheckAuth = vm.runInContext('TiltCheckAuth', dom.getInternalVMContext()) as {
      prototype: { init: () => Promise<void> };
      new (): {
        user: { username: string; id: string; avatar: null };
        createUserAvatar: () => HTMLElement;
      };
    };
    TiltCheckAuth.prototype.init = async () => {};
    const auth = new TiltCheckAuth();
    auth.user = {
      username: `<img src=x onerror="window.__xss='auth'">`,
      id: '1234',
      avatar: null,
    };
    const avatar = auth.createUserAvatar();
    const dropdown = avatar.querySelector('.user-dropdown-menu') as HTMLDivElement;

    expect(dropdown.querySelector('img[src="x"]')).toBeNull();
    expect(dropdown.textContent).toContain(`<img src=x onerror="window.__xss='auth'">`);
    expect((dom.window as unknown as { __xss?: string }).__xss).toBeUndefined();
  });

  it('sanitizes casino directory values before table render', async () => {
    const html = fs.readFileSync(path.join(repoRoot, 'apps/web/casinos.html'), 'utf8');
    const inlineScriptMatch = html.match(/<script>\s*\(function\(\)\{[\s\S]*?\}\)\(\);\s*<\/script>/);
    if (!inlineScriptMatch) {
      throw new Error('Could not locate casinos inline script');
    }
    const inlineScript = inlineScriptMatch[0]
      .replace(/^<script>\s*/, '')
      .replace(/\s*<\/script>$/, '');

    const dom = new JSDOM(
      `<!doctype html><body>
        <div id="meta"></div>
        <input id="search" />
        <table id="casino-table">
          <thead><tr><th data-sort="name"></th></tr></thead>
          <tbody></tbody>
        </table>
      </body>`,
      { url: 'https://tiltcheck.dev/casinos.html', runScripts: 'outside-only' },
    );
    const context = dom.getInternalVMContext() as unknown as {
      fetch: typeof fetch;
      Papa: { parse: (csv: string, options: { complete: (result: unknown) => void }) => void };
    };
    context.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'ignored',
    } as Response);
    context.Papa = {
      parse: (_csv, options) =>
        options.complete({
          data: [
            {
              name: `<svg onload="window.__xss='casino'"></svg>`,
              url: `javascript:alert('xss')`,
              data_completeness_score: '99.9',
              avg_rating: '4.8',
              has_ssl: true,
              two_factor_auth: true,
              fairness_certifications: `<img src=x onerror="window.__xss='fairness'">`,
              provider_count: '10',
              withdrawal_methods_count: '5',
            },
          ],
        }),
    };

    vm.runInContext(inlineScript, dom.getInternalVMContext());
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const tbody = dom.window.document.querySelector('#casino-table tbody') as HTMLTableSectionElement;
    expect(tbody.querySelector('svg')).toBeNull();
    expect(tbody.querySelector('img[src="x"]')).toBeNull();
    expect(tbody.querySelector('a')).toBeNull();
    expect(tbody.innerHTML).toContain('&lt;svg onload=');
    expect((dom.window as unknown as { __xss?: string }).__xss).toBeUndefined();
  });

  it('keeps DAAD lobby render paths free of innerHTML sinks', () => {
    const html = fs.readFileSync(path.join(repoRoot, 'apps/web/tools/daad.html'), 'utf8');
    const scriptMatch = html.match(/<script>\s*([\s\S]*?)\s*<\/script>\s*<script src="\/scripts\/components-loader.js"><\/script>/);
    if (!scriptMatch) {
      throw new Error('Could not locate DAAD lobby inline script');
    }
    const script = scriptMatch[1];

    const renderRoomsBody = script.match(/function renderRooms\(\)\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
    const renderFriendsBody = script.match(/function renderFriends\(\)\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
    const renderChatBody = script.match(/function renderChat\(\)\s*\{([\s\S]*?)\n\s*\}/)?.[1] ?? '';

    expect(renderRoomsBody).toBeTruthy();
    expect(renderFriendsBody).toBeTruthy();
    expect(renderChatBody).toBeTruthy();
    expect(renderRoomsBody).not.toContain('innerHTML');
    expect(renderFriendsBody).not.toContain('innerHTML');
    expect(renderChatBody).not.toContain('innerHTML');
  });

  it('renders game arena chat payload as text content', async () => {
    const dom = new JSDOM(
      '<!doctype html><body><div id="chat-messages"></div></body>',
      { url: 'https://tiltcheck.dev/game/abc', runScripts: 'outside-only' },
    );
    const context = dom.getInternalVMContext() as unknown as {
      io: () => { on: () => void };
    };
    context.io = () => ({ on: () => {} });

    runScriptInDom('apps/game-arena/public/scripts/game.js', dom);

    const GameManager = vm.runInContext('GameManager', dom.getInternalVMContext()) as {
      prototype: { init: () => Promise<void> | void };
      new (): { addChatMessage: (message: { username: string; message: string }) => void };
    };
    GameManager.prototype.init = () => {};
    const gameManager = new GameManager();
    gameManager.addChatMessage({
      username: `<img src=x onerror="window.__xss='sender'">`,
      message: `<svg onload="window.__xss='text'"></svg>`,
    });

    const container = dom.window.document.getElementById('chat-messages') as HTMLDivElement;
    expect(container.querySelector('img[src="x"]')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
    expect(container.textContent).toContain(`<img src=x onerror="window.__xss='sender'">`);
    expect(container.textContent).toContain(`<svg onload="window.__xss='text'"></svg>`);
    expect((dom.window as unknown as { __xss?: string }).__xss).toBeUndefined();
  });
});
