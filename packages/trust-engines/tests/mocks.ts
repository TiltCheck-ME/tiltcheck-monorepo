/* Copyright (c) 2026 TiltCheck. All rights reserved. */

import { CasinoTrustRecord, DegenTrustRecord, TrustEvent } from '../src/index.js';

/**
 * Generates a mock TrustEvent for testing
 */
export function createMockTrustEvent(overrides: Partial<TrustEvent> = {}): TrustEvent {
    return {
        timestamp: Date.now(),
        delta: -5,
        reason: 'Mock event reason',
        severity: 2,
        category: 'bonusScore',
        ...overrides,
    };
}

/**
 * Generates a mock CasinoTrustRecord (CasinoRisk) for testing
 */
export function createMockCasinoRisk(overrides: Partial<CasinoTrustRecord> = {}): CasinoTrustRecord {
    return {
        score: 75,
        fairnessScore: 75,
        payoutScore: 75,
        bonusScore: 75,
        userReportScore: 75,
        freespinScore: 75,
        complianceScore: 75,
        supportScore: 75,
        history: [],
        lastUpdated: Date.now(),
        ...overrides,
    };
}

/**
 * Generates a mock DegenTrustRecord (UserScore) for testing
 */
export function createMockUserScore(overrides: Partial<DegenTrustRecord> = {}): DegenTrustRecord {
    return {
        score: 70,
        tiltIndicators: 0,
        behaviorScore: 70,
        scamFlags: 0,
        accountabilityBonus: 0,
        communityReports: 0,
        history: [],
        lastUpdated: Date.now(),
        ...overrides,
    };
}
