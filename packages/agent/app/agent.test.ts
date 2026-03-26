/* Copyright (c) 2026 TiltCheck. All rights reserved. */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runner } from './agent.js';
import { db } from '@tiltcheck/database';
import type { Session } from '@google/adk';

const MOCK_DISCORD_ID = '123456789';

describe('Degen Intelligence Agent', () => {
  let session: Session;

  beforeAll(async () => {
    // Create a session from the service before tests run
    session = await runner.sessionService.createSession({ appName: 'test', sessionId: 'test-session', userId: 'test-user' });

    // Mock the database connection and methods for testing
    db.connect = async () => Promise.resolve();
    db.isConnected = () => true;

    // Mock database methods
    db.getUserStats = async (discordId: string) => ({
      discord_id: discordId,
      username: 'TestDegen',
      avatar: null,
      total_games: 100,
      total_wins: 60,
      total_score: 1000,
      wagered_amount_sol: 500,
      deposited_amount_sol: 200,
      lost_amount_sol: 350,
      profit_sol: 150,
      dad_games: 50,
      dad_wins: 30,
      dad_score: 500,
      poker_games: 50,
      poker_wins: 30,
      poker_chips_won: 500,
      last_played_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    
    db.getCreditBalance = async (discordId: string) => ({
      discord_id: discordId,
      balance_lamports: 2 * 1e9, // 2 SOL
      wallet_address: null,
      last_activity_at: new Date().toISOString(),
      refund_mode: 'reset-on-activity',
      hard_expiry_at: null,
      inactivity_days: 0,
      total_deposited_lamports: 0,
      total_withdrawn_lamports: 0,
      total_tipped_lamports: 0,
      total_fees_lamports: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    db.getUserGameHistory = async (discordId: string, limit: number) => ([
      { id: '1', game_id: '1', game_type: 'poker', platform: 'discord', channel_id: '1', winner_id: discordId, player_ids: [discordId], duration: 10, completed_at: new Date().toISOString() },
      { id: '2', game_id: '2', game_type: 'dad', platform: 'discord', channel_id: '1', winner_id: 'another_user', player_ids: [discordId, 'another_user'], duration: 10, completed_at: new Date().toISOString() },
    ]);

    db.getDegenIdentity = async (discordId: string) => ({
      discord_id: discordId,
      magic_address: null,
      primary_external_address: null,
      tos_accepted: true,
      tos_nft_minted: true,
      tos_nft_paid: true,
      tos_nft_signature: null,
      nft_savings_sol: 0,
      trust_score: 75,
      identity_metadata: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    db.getTiltStats = async (userId: string) => ({
      totalEvents: 1,
      averageTiltScore: 3.5,
      maxTiltScore: 6,
      lastEventAt: new Date().toISOString(),
      eventsLast24h: 2,
      eventsLast7d: 2,
    });

    db.getTiltHistory = async (discordId: string, options: { limit: number }) => ([
      { id: '1', user_id: discordId, timestamp: new Date().toISOString(), signals: [], tilt_score: 6, context: 'Lost a big hand in poker', created_at: new Date().toISOString() },
    ]);

    db.getBonusStatus = async (discordId: string) => ([
      { casino: 'Stake', bonus: 'Daily Reload', status: 'READY' },
      { casino: 'Shuffle', bonus: 'Daily Rakeback', status: 'READY' },
      { casino: 'Rollbit', bonus: 'Hourly', status: 'LOCKED (30m remaining)' }
    ]);
    
    await db.connect();
  });

  it('should get full stats for a user', async () => {
    const prompt = `What are the full stats for user ${MOCK_DISCORD_ID}?`;
    const events: any[] = [];
    for await (const event of runner.runAsync({
      userId: 'test-user',
      sessionId: 'test-session',
      newMessage: {
        role: 'user',
        parts: [{ text: prompt }],
      },
    })) {
      events.push(event);
    }
    const response = events.find(e => e.content);
    expect(response.content).toBeDefined();
    expect(response.content).toContain('TestDegen');
    expect(response.content).toContain('wagered');
  }, 30000);

  it('should explain trust standing', async () => {
    const prompt = `Is user ${MOCK_DISCORD_ID} tilted? Explain their trust standing.`;
    const events: any[] = [];
    for await (const event of runner.runAsync({
      userId: 'test-user',
      sessionId: 'test-session',
      newMessage: {
        role: 'user',
        parts: [{ text: prompt }],
      },
    })) {
      events.push(event);
    }
    const response = events.find(e => e.content);
    expect(response.content).toBeDefined();
    expect(response.content).toContain('Trust Score');
    expect(response.content).toContain('Stable');
  }, 30000);

  it('should get bonus status', async () => {
    const prompt = `Can user ${MOCK_DISCORD_ID} claim any bonuses right now?`;
    const events: any[] = [];
    for await (const event of runner.runAsync({
      userId: 'test-user',
      sessionId: 'test-session',
      newMessage: {
        role: 'user',
        parts: [{ text: prompt }],
      },
    })) {
      events.push(event);
    }
    const response = events.find(e => e.content);
    expect(response.content).toBeDefined();
    expect(response.content).toContain('Stake');
    expect(response.content).toContain('READY');
  }, 30000);
  
  it('should get profit and loss', async () => {
    const prompt = `What's my profit and loss? My discord id is ${MOCK_DISCORD_ID}.`;
    const events: any[] = [];
    for await (const event of runner.runAsync({
      userId: 'test-user',
      sessionId: 'test-session',
      newMessage: {
        role: 'user',
        parts: [{ text: prompt }],
      },
    })) {
      events.push(event);
    }
    const response = events.find(e => e.content);
    expect(response.content).toBeDefined();
    expect(response.content).toContain('150'); // profit_sol
  }, 30000);
});
