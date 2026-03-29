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
      recentActivity: recentGames.map((g: any) => ({
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
  description: "Analyzes a user's trust score, tilt level, and behavior consistency.",
  parameters: DiscordIdSchema,
  execute: async ({ discordId }: DiscordIdParams) => {
    if (!db.isConnected()) return "Database disconnected. Mock standing: 85.0 Trust Score, Tilt Level 1.";

    const identity = await db.getDegenIdentity(discordId);
    const tiltStats = await db.getTiltStats(discordId);
    const recentTilt = await db.getTiltHistory(discordId, { limit: 3 });

    const trustScore = identity?.trust_score ?? 50;
    
    interface TiltEvent {
        id: string;
        user_id: string;
        timestamp: string;
        signals: unknown[];
        tilt_score: number;
        context: string | null;
        created_at: string;
    }

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
      recentWarnings: (recentTilt as TiltEvent[]).map(t => ({
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
 * Schema for updating user preferences
 */
const UpdatePreferencesSchema = z.object({
  discordId: z.string(),
  email_notifications: z.boolean().optional(),
  tilt_warnings: z.boolean().optional(),
  trust_updates: z.boolean().optional(),
  weekly_digest: z.boolean().optional(),
});

/**
 * Tool to fetch user preferences
 */
const getUserPreferences = new FunctionTool<typeof DiscordIdSchema>({
  name: 'get_user_preferences',
  description: 'Fetches the user\'s ecosystem preferences including notification settings and tilt warning toggles.',
  parameters: DiscordIdSchema,
  execute: async ({ discordId }: DiscordIdParams) => {
    if (!db.isConnected()) return "Database disconnected. Mock: Notifications ON, Warnings ON.";
    const prefs = await db.getUserPreferences(discordId);
    return prefs || "No preferences found. Defaulting to all notifications enabled.";
  },
});

/**
 * Tool to update user preferences via NLP
 */
const updateUserPreferences = new FunctionTool<typeof UpdatePreferencesSchema>({
  name: 'update_user_preferences',
  description: 'Updates user settings based on natural language commands. Supports toggling email notifications, tilt warnings, and digests.',
  parameters: UpdatePreferencesSchema,
  execute: async (params) => {
    if (!db.isConnected()) return "Database disconnected. Could not save changes.";
    const { discordId, ...prefs } = params;
    const result = await db.updateUserPreferences(discordId, prefs);
    return result ? "Preferences updated successfully." : "Failed to update preferences.";
  },
});

/**
 * Schema for generating a personalized intervention nudge
 */
const GenerateNudgeSchema = z.object({
  userId: z.string(),
  betRatio: z.number().describe('Current bet size / baseline bet size'),
  lossStreak: z.number().describe('Number of consecutive losses'),
  lastGameResult: z.string().optional().describe('Description of the last game result (e.g. "Bad beat on pocket aces")'),
});

/**
 * Schema for advanced sentiment analysis
 */
const AnalyzeSentimentSchema = z.object({
  text: z.string(),
  userId: z.string().optional(),
});

/**
 * Tool to generate a surgical, personality-driven 'Tough Love' nudge
 */
const generateNudge = new FunctionTool<typeof GenerateNudgeSchema>({
  name: 'generate_nudge',
  description: 'Generates a blunt, data-driven "Tough Love" intervention for a tilting user.',
  parameters: GenerateNudgeSchema,
  execute: async ({ userId, betRatio, lossStreak, lastGameResult }) => {
    // This tool is designed to be called when heuristics detect moderate/high risk.
    // The "actual" text generation happens via the LLM's system prompt + tool context.
    return {
      userId,
      context: `User is betting ${betRatio.toFixed(1)}x their normal size and is on a ${lossStreak} loss streak. ${lastGameResult ? `Last frustration point: ${lastGameResult}` : ''}`,
      instruction: "Write 1-2 blunt sentences asking them to Audit their head. No emojis. No apologies."
    };
  },
});

/**
 * Tool for nuanced psychological risk scoring (Sentiment V2)
 */
const analyzeSentimentV2 = new FunctionTool<typeof AnalyzeSentimentSchema>({
  name: 'analyze_sentiment_v2',
  description: 'Analyzes user chat/behavior for psychological breaking points (Euphoria, Desperation, Final Exit).',
  parameters: AnalyzeSentimentSchema,
  execute: async ({ text }) => {
    return {
      originalText: text,
      instruction: "Categorize the psychological stage of this message: NEUTRAL, EUPHORIA, DESPERATION, BREAKING_POINT, FINAL_EXIT. Score risk 0-100."
    };
  },
});

/**
 * Degen Intelligence Agent (DIA)
 * Using Gemini 1.5 Pro for maximum 'Tough Love' authenticity.
 */
export const agent = new LlmAgent({
  name: 'tiltchcek_degen_intelligence',
  description: 'Advanced AI assistant for the TiltCheck ecosystem. Analyzes degen stats, trust scores, generates interventions, and manages account config.',
  model: new Gemini({
    model: 'gemini-1.5-flash',
    vertexai: process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true',
    project: process.env.GOOGLE_CLOUD_PROJECT || 'tiltchcek',
    location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
  }),
  instruction: `You are the TiltCheck Degen Intelligence Agent (DIA). 
                Your goal is to provide blunt, data-driven, and surgical insights to users.
                You do NOT use emojis. You do NOT apologize. You are the "Audit Head".
                
                - Use 'get_user_analytics' to answer questions about wins, losses, or volume.
                - Use 'get_trust_standing' to explain why a user's trust score is high or low.
                - Use 'get_bonus_status' when users ask about reloads or re-ups.
                - Use 'generate_nudge' to create an intervention string when you detect high risk.
                - Use 'analyze_sentiment_v2' to evaluate chat risk.
                
                Tone: The "Audit Head" (blunt, direct, slightly skeptical). 
                Intervention: If a user shows high risk (severity > 60), your tone becomes "Firm Audit". 
                You are their accountability buddy, not their friend. Stop them from donating their bag to the house.`,
  tools: [getUserAnalytics, getTrustStanding, getBonusStatus, getUserPreferences, updateUserPreferences, generateNudge, analyzeSentimentV2],
});

/**
 * Initialize ADK Runner
 */
export const runner = new Runner({
  appName: 'TiltCheck Intelligence',
  agent,
  sessionService: new InMemorySessionService(),
});
