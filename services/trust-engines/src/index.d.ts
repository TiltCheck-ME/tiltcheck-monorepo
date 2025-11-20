/**
 * Trust Engines Service
 * Implements Casino Trust Engine and Degen Trust Engine
 *
 * Casino Trust Scoring (0-100):
 * - 30% Fairness consistency
 * - 20% Payout reliability
 * - 15% Bonus stability
 * - 15% User weighted reports
 * - 10% FreeSpinScan validation
 * - 5% Regulatory compliance
 * - 5% Support quality
 *
 * Degen Trust Scoring (0-100):
 * - Very High: 95-100
 * - High: 80-94
 * - Neutral: 60-79
 * - Low: 40-59
 * - High Risk: <40
 */
export interface TrustEnginesConfig {
    startingCasinoScore: number;
    startingUserScore: number;
    autoSubscribe?: boolean;
    severityScale?: number[];
    logger?: TrustLogger;
    persistDir?: string;
    logDir?: string;
    maxLogSizeBytes?: number;
    maxLogFiles?: number;
    recoveryRatePerHour?: number;
}
export interface TrustLogger {
    debug?(msg: string, meta?: any): void;
    info?(msg: string, meta?: any): void;
    warn?(msg: string, meta?: any): void;
    error?(msg: string, meta?: any): void;
}
export interface CasinoTrustRecord {
    score: number;
    fairnessScore: number;
    payoutScore: number;
    bonusScore: number;
    userReportScore: number;
    freespinScore: number;
    complianceScore: number;
    supportScore: number;
    history: TrustEvent[];
    lastUpdated: number;
}
export interface DegenTrustRecord {
    score: number;
    tiltIndicators: number;
    behaviorScore: number;
    scamFlags: number;
    accountabilityBonus: number;
    communityReports: number;
    history: TrustEvent[];
    lastUpdated: number;
    recoveryScheduledAt?: number;
}
export interface TrustEvent {
    timestamp: number;
    delta: number;
    reason: string;
    severity?: number;
    category: string;
}
export type TrustLevel = 'very-high' | 'high' | 'neutral' | 'low' | 'high-risk';
export declare class TrustEnginesService {
    private casinoRecords;
    private degenRecords;
    private cfg;
    private recoveryInterval?;
    constructor(config?: Partial<TrustEnginesConfig>);
    private subscribeToEvents;
    private getCasinoRecord;
    private updateCasinoScore;
    private onLinkFlagged;
    private onBonusNerf;
    private onCasinoRollup;
    private onDomainRollup;
    private getDegenRecord;
    private updateDegenScore;
    private onTipCompleted;
    private onTiltDetected;
    private onCooldownViolated;
    private onScamReported;
    private onAccountabilitySuccess;
    getCasinoScore(casinoName: string): number;
    getCasinoBreakdown(casinoName: string): CasinoTrustRecord;
    getDegenScore(userId: string): number;
    getDegenBreakdown(userId: string): DegenTrustRecord;
    getTrustLevel(score: number): TrustLevel;
    explainCasinoScore(casinoName: string): string[];
    explainDegenScore(userId: string): string[];
    private persist;
    private loadPersisted;
    private startRecoveryScheduler;
    private runRecovery;
    shutdown(): void;
    clearState(): void;
    private log;
    private rotateLogs;
}
export declare const trustEngines: TrustEnginesService;
//# sourceMappingURL=index.d.ts.map