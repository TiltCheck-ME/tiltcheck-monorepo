/* Copyright (c) 2026 TiltCheck. All rights reserved. */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runner } from './agent';
import { db } from '@tiltcheck/database';
import type { LlmSession } from '@google/adk';

const MOCK_DISCORD_ID = '123456789';

describe('Degen Intelligence Agent', () => {
  let session: LlmSession;

  beforeAll(async () => {
    // Create a session from the service before tests run
    session = await runner.sessionService.createSession();

    // Mock the database connection and methods for testing
    db.connect = async () => Promise.resolve();
    db.disconnect = async () => Promise.resolve();
    db.isConnected = () => true;

    // Mock database methods
    db.getUserStats = async (discordId: string) => ({
      discord_id: discordId,
      username: 'TestDegen',
      total_games: 100,
      total_wins: 60,
      poker_wins: 10,
      dad_wins: 5,
      wagered_amount_sol: 500,
      profit_sol: 150,
      deposited_amount_sol: 200,
    });
    
    db.getCreditBalance = async (discordId: string) => ({
      discord_id: discordId,
      balance_lamports: 2 * 1e9, // 2 SOL
    });

    db.getUserGameHistory = async (discordId: string, limit: number) => ([
      { game_type: 'poker', completed_at: new Date(), winner_id: discordId },
      { game_type: 'dad', completed_at: new Date(), winner_id: 'another_user' },
    ]);

    db.getDegenIdentity = async (discordId: string) => ({
      discord_id: discordId,
      trust_score: 75,
      tos_accepted: true,
      tos_nft_paid: true,
      tos_nft_minted: true,
    });

    db.getTiltStats = async (discordId: string) => ({
      averageTiltScore: 3.5,
      maxTiltScore: 6,
      eventsLast24h: 2,
      lastEventAt: new Date(),
    });

    db.getTiltHistory = async (discordId: string, options: { limit: number }) => ([
      { tilt_score: 6, timestamp: new Date(), context: 'Lost a big hand in poker' },
    ]);

    db.getBonusStatus = async (discordId: string) => ([
      { casino: 'Stake', bonus: 'Daily Reload', status: 'READY', emoji: '🥩' },
      { casino: 'Shuffle', bonus: 'Faucet', status: 'READY', emoji: '🔀' },
      { casino: 'Rollbit', bonus: 'Hourly', status: 'LOCKED (30m remaining)', emoji: '🎲' }
    ]);
    
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  it('should get full stats for a user', async () => {
    const prompt = `What are the full stats for user ${MOCK_DISCORD_ID}?`;
    const response = await session.prompt(prompt);
    expect(response.content).toBeDefined();
    expect(response.content).toContain('TestDegen');
    expect(response.content).toContain('wagered');
  }, 30000);

  it('should explain trust standing', async () => {
    const prompt = `Is user ${MOCK_DISCORD_ID} tilted? Explain their trust standing.`;
    const response = await session.prompt(prompt);
    expect(response.content).toBeDefined();
    expect(response.content).toContain('Trust Score');
    expect(response.content).toContain('Stable');
  }, 30000);

  it('should get bonus status', async () => {
    const prompt = `Can user ${MOCK_DISCORD_ID} claim any bonuses right now?`;
    const response = await session.prompt(prompt);
    expect(response.content).toBeDefined();
    expect(response.content).toContain('Stake');
    expect(response.content).toContain('READY');
  }, 30000);
  
  it('should get profit and loss', async () => {
    const prompt = `What's my profit and loss? My discord id is ${MOCK_DISCORD_ID}.`;
    const response = await session.prompt(prompt);
    expect(response.content).toBeDefined();
    expect(response.content).toContain('150'); // profit_sol
  }, 30000);
});
