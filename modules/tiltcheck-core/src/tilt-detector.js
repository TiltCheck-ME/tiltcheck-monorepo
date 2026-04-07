/* Copyright (c) 2026 TiltCheck. All rights reserved. */
// v0.1.0 — 2026-02-25
/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Tilt Detector
 * Main service that monitors activity and emits tilt.detected events
 */
import { eventRouter } from '@tiltcheck/event-router';
import { analyzeMessages, calculateTiltScore } from './message-analyzer.js';
import { startCooldown, isOnCooldown, recordViolation, getCooldownStatus } from './cooldown-manager.js';
const userActivities = new Map();
/** Threshold for bet size increase considered a red flag (2x baseline) */
const BET_INCREASE_THRESHOLD = 2.0;
/** Minimum bets required to establish baseline */
const MIN_BETS_FOR_BASELINE = 3;
/**
 * Get or create user activity record
 */
function getOrCreateActivity(userId) {
    let activity = userActivities.get(userId);
    if (!activity) {
        activity = {
            userId,
            messages: [],
            lossStreak: 0,
            cooldownViolations: 0,
            recentBets: [],
        };
        userActivities.set(userId, activity);
    }
    return activity;
}
/**
 * Track a user message
 */
export function trackMessage(userId, content, channelId) {
    const activity = getOrCreateActivity(userId);
    // Add message to history
    activity.messages.push({
        content,
        timestamp: Date.now(),
        channelId,
    });
    // Keep last 20 messages only
    if (activity.messages.length > 20) {
        activity.messages = activity.messages.slice(-20);
    }
    // Check if user is on cooldown
    if (isOnCooldown(userId)) {
        recordViolation(userId);
        return; // Don't analyze further if on cooldown
    }
    // Analyze messages for tilt signals
    const signals = analyzeMessages(activity.messages, userId);
    if (signals.length > 0) {
        processTiltSignals(userId, signals);
    }
}
/**
 * Track a loss event (from poker, tips, etc.)
 */
export function trackLoss(userId, amount, context) {
    const activity = getOrCreateActivity(userId);
    activity.lastLoss = Date.now();
    activity.lossStreak++;
    // Loss streaks trigger tilt detection
    if (activity.lossStreak >= 3) {
        const signal = {
            userId,
            signalType: 'loss-streak',
            severity: Math.min(5, activity.lossStreak),
            confidence: 0.85,
            context: { lossStreak: activity.lossStreak, amount, ...context },
            detectedAt: Date.now(),
        };
        processTiltSignals(userId, [signal]);
    }
}
/**
 * Reset loss streak (on win or successful cooldown)
 */
export function resetLossStreak(userId) {
    const activity = userActivities.get(userId);
    if (activity) {
        activity.lossStreak = 0;
    }
}
/**
 * Track a bet for bet sizing analysis
 * @param userId - User who placed the bet
 * @param amount - Bet amount
 * @param gameType - Type of game (poker, blackjack, etc.)
 * @param won - Whether the bet was won
 */
export function trackBet(userId, amount, gameType, won) {
    const activity = getOrCreateActivity(userId);
    const betRecord = {
        amount,
        game: gameType,
        timestamp: Date.now(),
        gameType,
        won,
    };
    activity.recentBets.push(betRecord);
    // Keep last 10 bets
    if (activity.recentBets.length > 10) {
        activity.recentBets = activity.recentBets.slice(-10);
    }
    // Update baseline bet size (rolling average of winning/stable bets)
    updateBaselineBetSize(activity);
    // Check for bet sizing tilt signal
    const betSignal = detectBetSizingChange(activity, amount);
    if (betSignal) {
        processTiltSignals(userId, [betSignal]);
    }
    // Track loss if bet was lost
    if (!won) {
        trackLoss(userId, amount, { source: 'bet', gameType });
    }
    else {
        // Win resets loss streak
        resetLossStreak(userId);
    }
}
/**
 * Update baseline bet size using rolling average
 * Uses the first 3 bets to establish a stable baseline for comparison
 */
function updateBaselineBetSize(activity) {
    // Only update baseline with at least MIN_BETS_FOR_BASELINE bets
    if (activity.recentBets.length < MIN_BETS_FOR_BASELINE) {
        return;
    }
    // Use the first 3 bets to establish a stable baseline
    // This provides a consistent reference point regardless of history size
    const baselineBets = activity.recentBets.slice(0, MIN_BETS_FOR_BASELINE);
    const avgBet = baselineBets.reduce((sum, b) => sum + b.amount, 0) / baselineBets.length;
    // Only set baseline if not already set (we want to detect changes from normal behavior)
    if (activity.baselineBetSize === undefined) {
        activity.baselineBetSize = avgBet;
    }
}
/**
 * Detect sudden bet sizing changes (a key tilt indicator)
 * Doubling or more of bet size after losses is a red flag
 */
function detectBetSizingChange(activity, currentBet) {
    // Need baseline to compare
    if (activity.baselineBetSize === undefined || activity.baselineBetSize === 0) {
        return null;
    }
    const betRatio = currentBet / activity.baselineBetSize;
    // If bet is BET_INCREASE_THRESHOLD times the baseline, flag it
    if (betRatio >= BET_INCREASE_THRESHOLD) {
        // Severity scales with bet increase: 2x=2, 3x=3, 4x=4, 5x+=5
        // Ensure minimum severity of 2 when threshold is met
        const severity = Math.max(2, Math.min(5, Math.floor(betRatio)));
        // Higher confidence if on a loss streak
        const confidence = activity.lossStreak >= 2 ? 0.9 : 0.75;
        return {
            userId: activity.userId,
            signalType: 'bet-sizing',
            severity,
            confidence,
            context: {
                currentBet,
                baselineBet: activity.baselineBetSize,
                betRatio: betRatio.toFixed(2),
                lossStreak: activity.lossStreak,
            },
            detectedAt: Date.now(),
        };
    }
    return null;
}
/**
 * Process tilt signals and emit events
 */
function processTiltSignals(userId, signals) {
    const tiltScore = calculateTiltScore(signals);
    // Tilt score > 3.0 triggers cooldown recommendation
    if (tiltScore >= 3.0) {
        const primarySignal = signals.reduce((prev, curr) => curr.severity > prev.severity ? curr : prev);
        // Emit tilt.detected event
        void eventRouter.publish('tilt.detected', 'tiltcheck-core', {
            userId,
            reason: primarySignal.signalType,
            severity: Math.ceil(tiltScore),
            tiltScore,
            indicators: signals.map(s => `type: ${s.signalType}, severity: ${s.severity}, confidence: ${s.confidence}`),
        });
        console.log(`[TiltCheck] Tilt detected for ${userId}: ${primarySignal.signalType} (score: ${tiltScore.toFixed(2)})`);
        // Auto-start cooldown for severe tilt (score >= 4)
        if (tiltScore >= 4.0 && !isOnCooldown(userId)) {
            const duration = Math.min(30, Math.ceil(tiltScore * 5)) * 60 * 1000; // 5-30 minutes
            startCooldown(userId, `Tilt detected: ${primarySignal.signalType}`, duration);
        }
    }
}
/**
 * Manually trigger cooldown (from Discord command)
 */
export function triggerCooldown(userId, reason = 'User requested', durationMinutes = 15) {
    startCooldown(userId, reason, durationMinutes * 60 * 1000);
}
/**
 * Check if user should be warned
 */
export function shouldWarnUser(userId) {
    const activity = userActivities.get(userId);
    if (!activity)
        return false;
    // Warn on loss streak
    if (activity.lossStreak >= 2)
        return true;
    // Warn if recent tilt signals
    const recentMessages = activity.messages.filter((m) => Date.now() - m.timestamp < 5 * 60 * 1000 // Last 5 minutes
    );
    const signals = analyzeMessages(recentMessages, userId);
    return signals.length > 0 && calculateTiltScore(signals) >= 2.0;
}
/**
 * Get user tilt status
 */
export function getUserTiltStatus(userId) {
    const activity = userActivities.get(userId);
    const cooldownInfo = getCooldownStatus(userId);
    const recentMessages = activity?.messages.filter((m) => Date.now() - m.timestamp < 10 * 60 * 1000) || [];
    const recentSignals = analyzeMessages(recentMessages, userId);
    return {
        lossStreak: activity?.lossStreak || 0,
        onCooldown: isOnCooldown(userId),
        cooldownInfo: cooldownInfo || undefined,
        recentSignals,
    };
}
/**
 * Get user activity (for admin/debug purposes)
 */
export function getUserActivity(userId) {
    return userActivities.get(userId);
}
// Subscribe to game/tip events to track losses
eventRouter.subscribe('tip.failed', (event) => {
    const { userId, amount } = event.data;
    trackLoss(userId, amount, { source: 'tip-failed' });
}, 'tiltcheck-core');
eventRouter.subscribe('game.completed', (event) => {
    const data = event.data;
    const { result, participants } = data;
    if (!result)
        return;
    const winnerIds = new Set(result.winners?.map((w) => w.userId) || []);
    // Get all participants - either from explicit list or from winners
    const allParticipants = participants || Array.from(winnerIds);
    // Track losses for non-winners
    for (const participantId of allParticipants) {
        if (typeof participantId === 'string') {
            if (!winnerIds.has(participantId)) {
                // This participant lost - track the loss
                // Use pot/participant count as estimated loss amount
                const estimatedLoss = result.pot / Math.max(allParticipants.length, 2);
                trackLoss(participantId, estimatedLoss, {
                    source: 'game-completed',
                    gameId: data.gameId,
                });
            }
            else {
                // Winner - reset their loss streak
                resetLossStreak(participantId);
            }
        }
    }
    // Check for bad beats (highly unlikely losses) - strong tilt indicator
    if (result.badBeat) {
        const { loserId, probability } = result.badBeat;
        // Bad beats with < 10% probability are severe tilt triggers
        const severity = probability < 0.05 ? 5 : probability < 0.1 ? 4 : 3;
        const signal = {
            userId: loserId,
            signalType: 'bad-beat',
            severity,
            confidence: 0.95,
            context: {
                probability,
                gameId: data.gameId,
                pot: result.pot,
            },
            detectedAt: Date.now(),
        };
        processTiltSignals(loserId, [signal]);
    }
}, 'tiltcheck-core');
console.log('[TiltCheck] Tilt Detection Core initialized');
