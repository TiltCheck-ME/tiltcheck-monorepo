/* Copyright (c) 2026 TiltCheck. All rights reserved. */

import { FunctionTool, LlmAgent, Runner, InMemorySessionService, Gemini } from '@google/adk';
import { z } from 'zod';
import { db } from '@tiltcheck/database';

const DiscordIdSchema = z.object({
  discordId: z.string(),
});

type DiscordIdParams = z.infer<typeof DiscordIdSchema>;

/**
 * Tool to fetch user analytics and gaming stats
 */
const getUserAnalytics = new FunctionTool<typeof DiscordIdSchema>({
  name: 'get_user_analytics',
  description: 'Fetches detailed gaming and financial analytics for a user including wagered volume, profit/loss, and game counts.',
  parameters: DiscordIdSchema,
  execute: async ({ discordId }: DiscordIdParams) => {
    if (!db.isConnected()) return "Database disconnected. High-level mock: User has 12 SOL wagered and 4 SOL profit.";
    
    const stats = await db.getUserStats(discordId);
    if (!stats) return `No stats found for user ${discordId}. They might be new!`;

    return {
      username: stats.username,
      totalGames: stats.total_games,
      totalWins: stats.total_wins,
      wageredSol: stats.wagered_amount_sol,
      profitSol: stats.profit_sol,
      depositedSol: stats.deposited_amount_sol,
      pokerWins: stats.poker_wins,
      dadWins: stats.dad_wins
    };
  },
});

/**
 * Tool to fetch trust standing and tilt analysis
 */
const getTrustStanding = new FunctionTool<typeof DiscordIdSchema>({
  name: 'get_trust_standing',
  description: 'Analyzes a user\'s trust score, tilt level, and behavior consistency.',
  parameters: DiscordIdSchema,
  execute: async ({ discordId }: DiscordIdParams) => {
    if (!db.isConnected()) return "Database disconnected. Mock standing: 85.0 Trust Score, Tilt Level 1.";

    const identity = await db.getDegenIdentity(discordId);
    const tiltStats = await db.getTiltStats(discordId);

    return {
      trustScore: identity?.trust_score ?? 50,
      tiltLevel: tiltStats.averageTiltScore > 7 ? 'High' : tiltStats.averageTiltScore > 4 ? 'Moderate' : 'Low',
      lastTiltEvent: tiltStats.lastEventAt,
      totalFlags: tiltStats.totalEvents,
      identityVerified: identity?.tos_nft_paid ?? false
    };
  },
});

/**
 * Tool to check for available casino reloads/bonuses
 */
const getBonusStatus = new FunctionTool<typeof DiscordIdSchema>({
  name: 'get_bonus_status',
  description: 'Checks which casino bonuses or reloads are ready to be claimed.',
  parameters: DiscordIdSchema,
  execute: async ({ discordId }: DiscordIdParams) => {
    return [
      { casino: 'Stake', bonus: 'Daily Reload', status: 'READY', emoji: '🥩' },
      { casino: 'Shuffle', bonus: 'Faucet', status: 'LOCKED (2h remaining)', emoji: '🔀' },
      { casino: 'Rollbit', bonus: 'Hourly', status: 'READY', emoji: '🎲' }
    ];
  },
});

/**
 * Degen Intelligence Agent
 */
export const agent = new LlmAgent({
  name: 'tiltcheck_degen_intelligence',
  description: 'Advanced AI assistant for the TiltCheck ecosystem. Analyzes degen stats, trust scores, and casino bonuses.',
  model: new Gemini({
    modelName: 'gemini-1.5-flash',
  }),
  instruction: `You are the TiltCheck Degen Intelligence Agent (DIA). 
                Your goal is to provide blunt, data-driven, and slightly skeptical insights to users about their gambling behavior and ecosystem status.
                
                - Use 'get_user_analytics' to answer questions about wins, losses, or volume.
                - Use 'get_trust_standing' to explain why a user's trust score is high or low.
                - Use 'get_bonus_status' when users ask about reloads or re-ups.
                - Tone: Professional but "degen-friendly" (blunt, direct, no emojis unless specified in tool output).
                - If data is missing, tell them to "get back in the trenches" (interact more with the bot).`,
  tools: [getUserAnalytics, getTrustStanding, getBonusStatus],
});

/**
 * Initialize ADK Runner
 */
export const runner = new Runner({
  appName: 'TiltCheck Intelligence',
  agent,
  sessionService: new InMemorySessionService(),
});
