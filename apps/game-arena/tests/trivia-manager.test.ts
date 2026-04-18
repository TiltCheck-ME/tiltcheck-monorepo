// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

import { rm } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { eventRouter } from '@tiltcheck/event-router';
import { triviaManager } from '../src/trivia-manager.js';

const TEST_STATE_FILE = path.resolve(process.cwd(), 'data/trivia-manager.test-state.json');

describe('triviaManager', () => {
  beforeEach(async () => {
    await rm(TEST_STATE_FILE, { force: true });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-18T00:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    vi.spyOn(eventRouter, 'publish').mockImplementation(() => undefined);
    await triviaManager.initialize({ stateFilePath: TEST_STATE_FILE });
  });

  afterEach(async () => {
    await triviaManager.endGame();
    await rm(TEST_STATE_FILE, { force: true });
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('scores normalized answer keys against the live round question', async () => {
    await triviaManager.scheduleGame({
      category: 'casino',
      totalRounds: 1,
      startTime: Date.now() + 1_000,
    });

    const joinedGame = triviaManager.getLiveState();
    expect(joinedGame).not.toBeNull();
    expect((await triviaManager.joinGame('user-1', 'Alice', joinedGame!.gameId)).success).toBe(true);

    await vi.advanceTimersByTimeAsync(1_000);

    const liveRound = triviaManager.getLiveState();
    expect(liveRound?.currentQuestion?.id).toBeTruthy();

    await expect(triviaManager.submitAnswer('user-1', liveRound!.currentQuestion!.id, 'A')).resolves.toEqual({
      success: true,
      message: 'Answer accepted.',
    });

    await vi.advanceTimersByTimeAsync(20_000);
    await vi.runAllTimersAsync();

    const audit = triviaManager.getAuditSnapshot();
    expect(audit.recentAuditEvents.some((event) => event.type === 'answer.submitted')).toBe(true);
  });

  it('rejects stale question submissions', async () => {
    await triviaManager.scheduleGame({
      category: 'casino',
      totalRounds: 1,
      startTime: Date.now() + 1_000,
    });

    const game = triviaManager.getLiveState();
    expect(game).not.toBeNull();
    await triviaManager.joinGame('user-1', 'Alice', game!.gameId);

    await vi.advanceTimersByTimeAsync(1_000);

    await expect(triviaManager.submitAnswer('user-1', 'wrong-question-id', 'A')).resolves.toEqual({
      success: false,
      message: 'Round already moved.',
    });
  });

  it('expires shield protection after the round it was armed for', async () => {
    await triviaManager.scheduleGame({
      category: 'casino',
      totalRounds: 2,
      startTime: Date.now() + 1_000,
    });

    const game = triviaManager.getLiveState();
    expect(game).not.toBeNull();
    await triviaManager.joinGame('user-1', 'Alice', game!.gameId);

    await vi.advanceTimersByTimeAsync(1_000);

    const roundOne = triviaManager.getLiveState();
    expect(roundOne?.currentQuestion?.id).toBeTruthy();

    await expect(triviaManager.requestShield('user-1', game!.gameId, roundOne!.currentQuestion!.id)).resolves.toEqual({
      success: true,
      message: 'Shield activated — you are protected for this round.',
      eliminated: [],
    });

    expect((await triviaManager.submitAnswer('user-1', roundOne!.currentQuestion!.id, 'A')).success).toBe(true);

    await vi.advanceTimersByTimeAsync(20_000);
    await vi.runAllTimersAsync();

    const roundTwo = triviaManager.getLiveState();
    expect(roundTwo?.currentQuestion?.id).toBeTruthy();
    expect(roundTwo?.currentQuestion?.id).not.toBe(roundOne?.currentQuestion?.id);

    await vi.advanceTimersByTimeAsync(20_000);

    const reinstatedCalls = vi.mocked(eventRouter.publish).mock.calls.filter(([type]) => type === 'trivia.player.reinstated');
    expect(reinstatedCalls).toHaveLength(0);
  });

  it('blocks shield activation after the player already answered the round', async () => {
    await triviaManager.scheduleGame({
      category: 'casino',
      totalRounds: 1,
      startTime: Date.now() + 1_000,
    });

    const game = triviaManager.getLiveState();
    expect(game).not.toBeNull();
    await triviaManager.joinGame('user-1', 'Alice', game!.gameId);

    await vi.advanceTimersByTimeAsync(1_000);

    const liveRound = triviaManager.getLiveState();
    expect(liveRound?.currentQuestion?.id).toBeTruthy();
    expect((await triviaManager.submitAnswer('user-1', liveRound!.currentQuestion!.id, 'A')).success).toBe(true);

    await expect(triviaManager.requestShield('user-1', game!.gameId, liveRound!.currentQuestion!.id)).resolves.toEqual({
      success: false,
      message: 'Shield must be activated before answering.',
    });
  });

  it('records durable audit data and recent results for completed trivia games', async () => {
    await triviaManager.scheduleGame({
      category: 'casino',
      totalRounds: 1,
      startTime: Date.now() + 1_000,
    });

    const game = triviaManager.getLiveState();
    expect(game).not.toBeNull();
    await triviaManager.joinGame('user-1', 'Alice', game!.gameId);

    await vi.advanceTimersByTimeAsync(1_000);

    const liveRound = triviaManager.getLiveState();
    await triviaManager.submitAnswer('user-1', liveRound!.currentQuestion!.id, 'A');
    await vi.advanceTimersByTimeAsync(20_000);
    await vi.advanceTimersByTimeAsync(5_000);

    const persistence = await triviaManager.getPersistenceStatus();
    const audit = triviaManager.getAuditSnapshot();

    expect(persistence.snapshotExists).toBe(true);
    expect(audit.recentAuditEvents.some((event) => event.type === 'answer.submitted')).toBe(true);
  });
});
