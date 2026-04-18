// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18
/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { SessionState } from '../src/state/SessionState.js';
import { RecapView } from '../src/views/RecapView.js';

describe('activity recap view', () => {
  let container: HTMLElement;
  let state: SessionState;

  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div id="recap-root"></div>';
    container = document.getElementById('recap-root') as HTMLElement;
    state = new SessionState();
  });

  it('renders a safe fallback when the lane has no live data yet', () => {
    new RecapView(container, state).mount();

    expect(container.textContent).toContain('Recap');
    expect(container.textContent).toContain('No real tape yet');
    expect(container.textContent).toContain('No round tape yet');
    expect(container.textContent).toContain('Smart move is patience');
    expect(container.textContent).toContain('Top topics');
    expect(container.textContent).toContain('Safety tape');
    expect(container.textContent).toContain('No obvious promo scam signal');
    expect(container.textContent).toContain('Degen move would be forcing a recap out of empty data');
  });

  it('renders branded recap storytelling from local activity state', () => {
    state.setIdentity('user-1', 'TiltBoss');
    state.setRoundStage('post-round', {
      title: 'DA&D round settled',
      detail: 'DEGEN LORD took the round. Recap is live while the next lobby forms.',
    });
    state.setParticipantCount(2);
    state.addRound({ bet: 10, win: 22, timestamp: Date.now() - 4000 });
    state.addRound({ bet: 12, win: 0, timestamp: Date.now() - 3000 });
    state.addRound({ bet: 8, win: 18, timestamp: Date.now() - 2000 });
    state.addRound({ bet: 5, win: 9, timestamp: Date.now() - 1000 });
    state.setBonusFeed([
      {
        id: 'bonus-1',
        casinoName: 'Stake',
        description: 'Verified reload ready',
        nextClaimAt: null,
        is_expired: false,
        is_verified: true,
      },
      {
        id: 'bonus-2',
        casinoName: 'Roobet',
        description: 'Daily cashback ready',
        nextClaimAt: null,
        is_expired: false,
        is_verified: true,
      },
      {
        id: 'bonus-3',
        casinoName: 'Shuffle',
        description: 'Old promo still floating',
        nextClaimAt: null,
        is_expired: true,
        is_verified: false,
      },
    ]);
    state.updateVault({
      activeVaults: 2,
      profitGuardActive: true,
      totalVaultedBalance: 48,
    });
    state.addTipToHistory({
      id: 'tip-1',
      fromUsername: 'Whale',
      toUsername: 'TiltBoss',
      amountSol: 0.15,
      message: 'nice save',
      timestamp: Date.now(),
      claimed: true,
    });

    new RecapView(container, state).mount();

    expect(container.textContent).toContain('The room stayed sharp');
    expect(container.textContent).toContain('Top topics');
    expect(container.textContent).toContain('profit guard');
    expect(container.textContent).toContain('bonus hunt');
    expect(container.textContent).toContain('Red flags');
    expect(container.textContent).toContain('expired bonus');
    expect(container.textContent).toContain('Safety tape');
    expect(container.textContent).toContain('Protection made the exit easy');
    expect(container.textContent).toContain('Recap is the cooldown surface');
    expect(container.textContent).toContain('1 promo still needs a trust check');
    expect(container.textContent).toContain('Smart move');
    expect(container.textContent).toContain('Profit guard stayed live');
    expect(container.textContent).toContain('Degen move');
    expect(container.textContent).toContain('Dead promos are bait');
  });

  it('renders the lightweight clout lane with titles and badges', () => {
    state.recordProgressionPromptStart('question-1', 4);
    state.recordProgressionRoundResult({
      questionId: 'question-1',
      survived: true,
      usedCrowdRead: true,
    });
    state.recordProgressionPromptStart('question-2', 4);
    state.recordProgressionRoundResult({
      questionId: 'question-2',
      survived: true,
      usedCrowdRead: false,
    });
    state.recordProgressionPromptStart('question-3', 2);
    state.recordProgressionRoundResult({
      questionId: 'question-3',
      survived: true,
      usedCrowdRead: false,
    });

    new RecapView(container, state).mount();

    expect(container.textContent).toContain('Clout lane');
    expect(container.textContent).toContain('Room Glue');
    expect(container.textContent).toContain('Weekly clout');
    expect(container.textContent).toContain('Crowd Reader');
    expect(container.textContent).toContain('Clean Escape');
    expect(container.textContent).toContain('No chips. No fake bankroll loop.');
  });
});
