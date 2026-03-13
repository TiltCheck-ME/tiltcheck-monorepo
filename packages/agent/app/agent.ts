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
    const credits = await db.getCreditBalance(discordId);
    const recentGames = await db.getUserGameHistory(discordId, 5);

    if (!stats && !credits) return `No stats found for user ${discordId}. They might be new!`;

    return {
      username: stats?.username || 'Unknown Degen',
      gaming: {
        totalGames: stats?.total_games || 0,
        totalWins: stats?.total_wins || 0,
        winRate: stats?.total_games ? ((stats.total_wins / stats.total_games) * 100).toFixed(1) + '%' : '0%',
        pokerWins: stats?.poker_wins || 0,
        dadWins: stats?.dad_wins || 0
      },
      financials: {
        wageredSol: stats?.wagered_amount_sol || 0,
        profitSol: stats?.profit_sol || 0,
        depositedSol: stats?.deposited_amount_sol || 0,
        currentCreditBalance: credits ? (credits.balance_lamports / 1e9).toFixed(4) + ' SOL' : '0 SOL'
      },
      recentActivity: recentGames.map(g => ({
        type: g.game_type,
        completedAt: g.completed_at,
        won: g.winner_id === discordId
      }))
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
    const recentTilt = await db.getTiltHistory(discordId, { limit: 3 });

    const trustScore = identity?.trust_score ?? 50;
    
    return {
      trustScore,
      standing: trustScore > 80 ? 'Exemplary' : trustScore > 60 ? 'Stable' : trustScore > 40 ? 'Degenerate' : 'Toxic',
      tiltAnalysis: {
        currentLevel: tiltStats.averageTiltScore > 7 ? 'High' : tiltStats.averageTiltScore > 4 ? 'Moderate' : 'Low',
        averageScore: tiltStats.averageTiltScore,
        maxScore: tiltStats.maxTiltScore,
        eventsLast24h: tiltStats.eventsLast24h,
        lastTiltEvent: tiltStats.lastEventAt
      },
      verifications: {
        identityVerified: identity?.tos_nft_paid ?? false,
        tosAccepted: identity?.tos_accepted ?? false,
        nftMinted: identity?.tos_nft_minted ?? false
      },
      recentWarnings: recentTilt.map(t => ({
        score: t.tilt_score,
        time: t.timestamp,
        context: t.context
      }))
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
    if (!db.isConnected()) return [
      { casino: 'Stake', bonus: 'Daily Reload', status: 'DB_DISCONNECTED' },
      { casino: 'Shuffle', bonus: 'Daily Rakeback', status: 'DB_DISCONNECTED' },
      { casino: 'Rollbit', bonus: 'Hourly', status: 'DB_DISCONNECTED' }
    ];

    const bonusStatus = await db.getBonusStatus(discordId);
    if (!bonusStatus || bonusStatus.length === 0) {
      return "No bonus or reload information found for this user.";
    }

    return bonusStatus;
  },
});

/**
 * Degen Intelligence Agent
 */
export const agent = new LlmAgent({
  name: 'tiltcheck_degen_intelligence',
  description: 'Advanced AI assistant for the TiltCheck ecosystem. Analyzes degen stats, trust scores, and casino bonuses.',
  model: new Gemini({
    model: 'gemini-1.5-flash',
  }),
  instruction: `You are the TiltCheck Degen Intelligence Agent (DIA), the only companion who'll tell you the brutal truth. 
                Your mission: dish out blunt, data-driven, and mercilessly skeptical insights about user gambling behavior and the ecosystem.

                Your Core Directives:
                - For questions about wins, losses, or volume, fire up 'get_user_analytics'. We're talking hard numbers, not hopium.
                - If they're wondering why their trust score is looking like shit, or if they're on full tilt, unleash 'get_trust_standing'. Lay it on them.
                - When they're begging for reloads or asking about bonuses, deploy 'get_bonus_status'. Give them the cold, hard facts.

                Tone: "Degen-Friendly" as f***. Be witty, be funny, be cynical, and don't pull any punches. Cursing is not just allowed; it's encouraged if it lands right. We're here to educate, not babysit.

                If their data is missing? Tell them to stop being a ghost and "get back in the goddamn trenches" to interact more with the bot. We can't analyze what ain't there.`,
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
