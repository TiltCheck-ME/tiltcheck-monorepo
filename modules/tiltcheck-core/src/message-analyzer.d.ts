/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Message Pattern Analyzer
 * Detects tilt signals from Discord message patterns
 * Enhanced with AI Gateway integration for intelligent analysis
 */
import type { TiltSignal, MessageActivity } from './types.js';
/**
 * Analyze recent messages for tilt patterns
 */
export declare function analyzeMessages(messages: MessageActivity[], userId: string): TiltSignal[];
/**
 * Calculate aggregate tilt score from multiple signals
 */
export declare function calculateTiltScore(signals: TiltSignal[]): number;
/**
 * Enhanced async message analysis using AI Gateway
 * Falls back to local analysis if AI is unavailable
 */
export declare function analyzeMessagesWithAI(messages: MessageActivity[], userId: string, additionalContext?: {
    recentBets?: Array<{
        amount: number;
        won: boolean;
        timestamp: number;
    }>;
    sessionDuration?: number;
    losses?: number;
}): Promise<{
    signals: TiltSignal[];
    tiltScore: number;
    aiAnalysis?: {
        riskLevel: string;
        interventionSuggestions: string[];
        cooldownRecommended: boolean;
        cooldownDuration: number;
    };
}>;
