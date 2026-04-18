// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18
/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const shared = vi.hoisted(() => {
  const mountBehaviors = new Map<string, () => void | Promise<void>>();
  const bridgeState = {
    userId: 'user-1',
    username: 'TiltBoss',
    channelId: 'channel-1',
    participants: [],
    voiceActive: false,
    orientation: 'landscape' as const,
  };

  const bridgeInitialize = vi.fn(async () => bridgeState);
  const bridgeGetState = vi.fn(() => bridgeState);
  const bridgeGetAccessToken = vi.fn(() => 'activity-token');
  const bridgeOn = vi.fn();
  const bridgeOpenExternalLink = vi.fn(async () => undefined);
  const bridgeInviteUserToActivity = vi.fn(async () => undefined);
  const bridgeSetRichPresence = vi.fn(async () => undefined);
  const relayInstances: RelayMock[] = [];

  class RelayMock {
    public connect = vi.fn();
    public on = vi.fn();
    public getChannelId = vi.fn(() => 'channel-1');
  }

  const createViewMock = (key: string) => class {
    private container: HTMLElement;

    constructor(container: HTMLElement) {
      this.container = container;
    }

    async mount(): Promise<void> {
      const behavior = mountBehaviors.get(key);
      if (behavior) {
        await behavior();
      }
      this.container.innerHTML = `<div data-view-mock="${key}">${key}</div>`;
    }
  };

  return {
    mountBehaviors,
    bridgeInitialize,
    bridgeGetState,
    bridgeGetAccessToken,
    bridgeOn,
    bridgeOpenExternalLink,
    bridgeInviteUserToActivity,
    bridgeSetRichPresence,
    relayInstances,
    RelayMock,
    createViewMock,
  };
});

vi.mock('../src/sdk/DiscordBridge.js', () => ({
  DiscordBridge: class {
    initialize = shared.bridgeInitialize;
    getState = shared.bridgeGetState;
    getAccessToken = shared.bridgeGetAccessToken;
    on = shared.bridgeOn;
    openExternalLink = shared.bridgeOpenExternalLink;
    inviteUserToActivity = shared.bridgeInviteUserToActivity;
    setRichPresence = shared.bridgeSetRichPresence;
  },
}));

vi.mock('../src/sdk/HubRelay.js', () => ({
  HubRelay: class extends shared.RelayMock {
    constructor() {
      super();
      shared.relayInstances.push(this);
    }
  },
}));

vi.mock('../src/views/HomeView.js', () => ({ HomeView: shared.createViewMock('home-shell') }));
vi.mock('../src/views/AnalyzerView.js', () => ({ AnalyzerView: shared.createViewMock('analyzer') }));
vi.mock('../src/views/GameView.js', () => ({ GameView: shared.createViewMock('game') }));
vi.mock('../src/views/BonusFeedView.js', () => ({ BonusFeedView: shared.createViewMock('bonus-feed') }));
vi.mock('../src/views/VaultView.js', () => ({ VaultView: shared.createViewMock('vault') }));
vi.mock('../src/views/TipView.js', () => ({ TipView: shared.createViewMock('tip') }));
vi.mock('../src/views/RecapView.js', () => ({ RecapView: shared.createViewMock('recap') }));
vi.mock('../src/views/LeaderboardView.js', () => ({ LeaderboardView: shared.createViewMock('leaderboard') }));

function renderShell(): void {
  document.body.innerHTML = `
    <div id="app">
      <p id="sdk-status"></p>
      <div class="bottom-nav">
        <button class="nav-tab active" data-view="home">Home</button>
        <button class="nav-tab" data-view="play">Play</button>
        <button class="nav-tab" data-view="bonuses">Bonuses</button>
        <button class="nav-tab" data-view="recap">Recap</button>
      </div>
      <section id="view-home" class="view-content active">
        <div id="view-home-shell"></div>
        <div id="view-home-analyzer"></div>
      </section>
      <section id="view-play" class="view-content">
        <div id="view-play-game"></div>
      </section>
      <section id="view-bonuses" class="view-content">
        <div id="view-bonuses-feed"></div>
        <div id="view-bonuses-tip"></div>
        <div id="view-bonuses-vault"></div>
      </section>
      <section id="view-recap" class="view-content">
        <div id="view-recap-shell"></div>
        <div id="view-recap-leaderboard"></div>
      </section>
      <button id="btn-open-dashboard" type="button">Open dashboard</button>
      <button id="btn-invite-buddy" type="button">Invite buddy</button>
    </div>
  `;
}

async function bootMain(): Promise<void> {
  renderShell();
  await import('../src/main.ts');
  await vi.waitFor(() => {
    expect(document.getElementById('sdk-status')?.textContent).toBe('CONNECTED');
  });
}

describe('activity main shell', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    shared.mountBehaviors.clear();
    shared.bridgeInitialize.mockClear();
    shared.bridgeGetState.mockClear();
    shared.bridgeGetAccessToken.mockClear();
    shared.bridgeOn.mockClear();
    shared.bridgeOpenExternalLink.mockClear();
    shared.bridgeInviteUserToActivity.mockClear();
    shared.bridgeSetRichPresence.mockClear();
    shared.relayInstances.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('switches shell navigation across home, play, bonuses, and recap', async () => {
    await bootMain();

    expect(shared.relayInstances).toHaveLength(1);
    expect(shared.relayInstances[0]?.connect).toHaveBeenCalledTimes(1);
    expect(document.getElementById('view-home')?.classList.contains('active')).toBe(true);
    expect(document.querySelector('.nav-tab.active')?.textContent).toBe('Home');

    (document.querySelector('.nav-tab[data-view="play"]') as HTMLButtonElement).click();
    expect(document.getElementById('view-play')?.classList.contains('active')).toBe(true);
    expect(document.querySelector('.nav-tab.active')?.textContent).toBe('Play');

    (document.querySelector('.nav-tab[data-view="bonuses"]') as HTMLButtonElement).click();
    expect(document.getElementById('view-bonuses')?.classList.contains('active')).toBe(true);
    expect(document.querySelector('.nav-tab.active')?.textContent).toBe('Bonuses');

    (document.querySelector('.nav-tab[data-view="recap"]') as HTMLButtonElement).click();
    expect(document.getElementById('view-recap')?.classList.contains('active')).toBe(true);
    expect(document.querySelector('.nav-tab.active')?.textContent).toBe('Recap');
  });

  it('holds the shell together with a soft fallback when a module mount fails', async () => {
    shared.mountBehaviors.set('bonus-feed', () => {
      throw new Error('bonus feed boom');
    });

    await bootMain();

    expect(document.getElementById('view-bonuses-feed')?.textContent).toContain('Bonus feed');
    expect(document.getElementById('view-bonuses-feed')?.textContent).toContain('This module failed soft');

    (document.querySelector('.nav-tab[data-view="bonuses"]') as HTMLButtonElement).click();
    expect(document.getElementById('view-bonuses')?.classList.contains('active')).toBe(true);
  });
});
