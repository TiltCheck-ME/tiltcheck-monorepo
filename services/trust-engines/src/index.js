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
import { eventRouter } from '@tiltcheck/event-router';
import fs from 'fs';
import path from 'path';
import { computeSeverity, penaltyForSeverity } from '@tiltcheck/config';
const defaultConfig = {
    startingCasinoScore: 75,
    startingUserScore: 70,
    autoSubscribe: true,
    severityScale: [2, 4, 6, 8, 12],
    logger: undefined,
    persistDir: process.env.TRUST_ENGINES_PERSIST_DIR || './data',
    logDir: process.env.TRUST_ENGINES_LOG_DIR,
    maxLogSizeBytes: 256 * 1024,
    maxLogFiles: 3,
    recoveryRatePerHour: 0.5, // Scores recover 0.5 points/hour naturally
};
export class TrustEnginesService {
    casinoRecords = new Map();
    degenRecords = new Map();
    cfg;
    recoveryInterval;
    constructor(config) {
        this.cfg = { ...defaultConfig, ...(config || {}) };
        if (!this.cfg.logger && process.env.TRUST_ENGINES_LOG_ERRORS === '1') {
            this.cfg.logger = console;
        }
        this.loadPersisted();
        this.startRecoveryScheduler();
        if (this.cfg.autoSubscribe) {
            this.subscribeToEvents();
        }
    }
    subscribeToEvents() {
        // Casino trust events
        eventRouter.subscribe('link.flagged', this.onLinkFlagged.bind(this), 'trust-engine-casino');
        eventRouter.subscribe('bonus.nerf.detected', this.onBonusNerf.bind(this), 'trust-engine-casino');
        eventRouter.subscribe('trust.casino.rollup', this.onCasinoRollup.bind(this), 'trust-engine-casino');
        eventRouter.subscribe('trust.domain.rollup', this.onDomainRollup.bind(this), 'trust-engine-casino');
        // Degen trust events
        eventRouter.subscribe('tip.completed', this.onTipCompleted.bind(this), 'trust-engine-degen');
        eventRouter.subscribe('tilt.detected', this.onTiltDetected.bind(this), 'trust-engine-degen');
        eventRouter.subscribe('cooldown.violated', this.onCooldownViolated.bind(this), 'trust-engine-degen');
        eventRouter.subscribe('scam.reported', this.onScamReported.bind(this), 'trust-engine-degen');
        eventRouter.subscribe('accountability.success', this.onAccountabilitySuccess.bind(this), 'trust-engine-degen');
    }
    // ============================================
    // CASINO TRUST ENGINE
    // ============================================
    getCasinoRecord(casinoName) {
        if (!this.casinoRecords.has(casinoName)) {
            this.casinoRecords.set(casinoName, {
                score: this.cfg.startingCasinoScore,
                fairnessScore: 75,
                payoutScore: 75,
                bonusScore: 75,
                userReportScore: 75,
                freespinScore: 75,
                complianceScore: 75,
                supportScore: 75,
                history: [],
                lastUpdated: Date.now(),
            });
        }
        return this.casinoRecords.get(casinoName);
    }
    updateCasinoScore(casinoName, category, delta, reason, severity) {
        const record = this.getCasinoRecord(casinoName);
        const previousScore = record.score;
        // Update category score
        const currentCategoryScore = record[category];
        const newCategoryScore = Math.max(0, Math.min(100, currentCategoryScore + delta));
        record[category] = newCategoryScore;
        // Recalculate weighted total score
        record.score = Math.round(record.fairnessScore * 0.30 +
            record.payoutScore * 0.20 +
            record.bonusScore * 0.15 +
            record.userReportScore * 0.15 +
            record.freespinScore * 0.10 +
            record.complianceScore * 0.05 +
            record.supportScore * 0.05);
        // Add to history
        record.history.push({
            timestamp: Date.now(),
            delta: record.score - previousScore,
            reason,
            severity,
            category,
        });
        // Keep last 100 events
        if (record.history.length > 100) {
            record.history = record.history.slice(-100);
        }
        record.lastUpdated = Date.now();
        // Publish trust update event
        const trustEvt = {
            casinoName,
            previousScore,
            newScore: record.score,
            delta: record.score - previousScore,
            severity,
            reason,
            source: 'trust-engine-casino',
        };
        void eventRouter.publish('trust.casino.updated', 'trust-engine-casino', trustEvt);
        this.log('info', `Casino ${casinoName} score: ${previousScore} → ${record.score} (${category}: ${reason})`, trustEvt);
        this.persist();
    }
    async onLinkFlagged(event) {
        const { url, riskLevel } = event.data;
        try {
            const hostname = new URL(url).hostname.replace('www.', '');
            const delta = riskLevel === 'critical' ? -10 : -5;
            const severity = riskLevel === 'critical' ? 4 : 2;
            this.updateCasinoScore(hostname, 'freespinScore', delta, `Suspicious link flagged (${riskLevel})`, severity);
        }
        catch {
            this.log('warn', 'Invalid URL in link.flagged event', { url });
        }
    }
    async onBonusNerf(event) {
        const { casinoName, percentDrop } = event.data;
        if (!casinoName || typeof percentDrop !== 'number')
            return;
        const severity = computeSeverity(Math.abs(percentDrop));
        const scale = this.cfg.severityScale || defaultConfig.severityScale;
        const delta = penaltyForSeverity(severity, scale);
        this.updateCasinoScore(casinoName, 'bonusScore', delta, `Bonus nerf detected (-${(Math.abs(percentDrop) * 100).toFixed(1)}%)`, severity);
    }
    async onCasinoRollup(event) {
        const { casinos } = event.data;
        if (!casinos)
            return;
        // Process hourly aggregated casino trust events
        for (const [casinoName, agg] of Object.entries(casinos)) {
            const { totalDelta, events: eventCount } = agg;
            if (eventCount === 0)
                continue;
            // Average delta impact on bonus score
            const avgDelta = totalDelta / eventCount;
            const delta = Math.max(-5, Math.min(5, avgDelta / 2)); // Dampened rollup impact
            this.updateCasinoScore(casinoName, 'bonusScore', delta, `Hourly rollup: ${eventCount} events, avg Δ${avgDelta.toFixed(1)}`);
        }
    }
    async onDomainRollup(event) {
        const { domains } = event.data;
        if (!domains)
            return;
        // Process hourly aggregated domain trust events from SusLink
        for (const [domain, agg] of Object.entries(domains)) {
            const { totalDelta, events: eventCount, lastSeverity } = agg;
            if (eventCount === 0)
                continue;
            const avgDelta = totalDelta / eventCount;
            const delta = Math.max(-8, Math.min(3, avgDelta / 3)); // Domains have stronger negative impact
            this.updateCasinoScore(domain, 'complianceScore', delta, `Domain rollup: ${eventCount} events, avg Δ${avgDelta.toFixed(1)}`, lastSeverity);
        }
    }
    // ============================================
    // DEGEN TRUST ENGINE
    // ============================================
    getDegenRecord(userId) {
        if (!this.degenRecords.has(userId)) {
            this.degenRecords.set(userId, {
                score: this.cfg.startingUserScore,
                tiltIndicators: 0,
                behaviorScore: 70,
                scamFlags: 0,
                accountabilityBonus: 0,
                communityReports: 0,
                history: [],
                lastUpdated: Date.now(),
            });
        }
        return this.degenRecords.get(userId);
    }
    updateDegenScore(userId, delta, reason, category, severity) {
        const record = this.getDegenRecord(userId);
        const previousScore = record.score;
        // Apply delta based on category
        switch (category) {
            case 'tilt':
                record.tiltIndicators = Math.max(0, record.tiltIndicators + delta);
                break;
            case 'behavior':
                record.behaviorScore = Math.max(0, Math.min(100, record.behaviorScore + delta));
                break;
            case 'scam':
                // Scam category: increment flag count (delta is ignored for this category)
                record.scamFlags = Math.max(0, record.scamFlags + 1);
                break;
            case 'accountability':
                record.accountabilityBonus = Math.max(0, Math.min(20, record.accountabilityBonus + delta));
                break;
            case 'community':
                record.communityReports = Math.max(-20, Math.min(10, record.communityReports + delta));
                break;
        }
        // Recalculate overall score
        const tiltPenalty = Math.min(30, record.tiltIndicators * 5); // Max -30 from tilt
        const scamPenalty = record.scamFlags * 15; // -15 per confirmed scam
        record.score = Math.max(0, Math.min(100, record.behaviorScore +
            record.accountabilityBonus +
            record.communityReports -
            tiltPenalty -
            scamPenalty));
        // Add to history
        record.history.push({
            timestamp: Date.now(),
            delta: record.score - previousScore,
            reason,
            severity,
            category,
        });
        if (record.history.length > 100) {
            record.history = record.history.slice(-100);
        }
        record.lastUpdated = Date.now();
        // Publish degen trust update
        void eventRouter.publish('trust.degen.updated', 'trust-engine-degen', {
            userId,
            previousScore,
            newScore: record.score,
            delta: record.score - previousScore,
            level: this.getTrustLevel(record.score),
            reason,
        }, userId);
        this.log('info', `Degen ${userId} score: ${previousScore} → ${record.score} (${category}: ${reason})`);
        this.persist();
    }
    async onTipCompleted(event) {
        const { fromUserId, toUserId, amount } = event.data;
        if (!fromUserId || !toUserId)
            return;
        // Positive trust for completing tips
        this.updateDegenScore(fromUserId, +1, 'Completed tip transaction', 'behavior');
        this.updateDegenScore(toUserId, +0.5, 'Received tip', 'behavior');
        // Generosity bonus for large tips
        if (amount > 100) {
            this.updateDegenScore(fromUserId, +2, `Large tip: $${amount}`, 'accountability');
        }
    }
    async onTiltDetected(event) {
        const { userId, severity } = event.data;
        if (!userId)
            return;
        // Tilt is temporary - increases tilt indicators
        const delta = severity || 1;
        this.updateDegenScore(userId, delta, 'Tilt behavior detected', 'tilt', severity);
        // Schedule recovery
        const record = this.getDegenRecord(userId);
        record.recoveryScheduledAt = Date.now() + (3600000 * 4); // 4 hours
    }
    async onCooldownViolated(event) {
        const { userId, severity } = event.data;
        if (!userId)
            return;
        const delta = -(severity || 2) * 2; // -4 to -10
        this.updateDegenScore(userId, delta, 'Violated cooldown', 'behavior', severity);
    }
    async onScamReported(event) {
        const { reporterId, accusedId, verified, falseReport } = event.data;
        if (verified && accusedId) {
            // Confirmed scam - heavy penalty
            this.updateDegenScore(accusedId, 0, 'Confirmed scam report', 'scam', 5);
        }
        else if (falseReport && reporterId) {
            // False accusation - both lose trust
            this.updateDegenScore(reporterId, -10, 'False scam accusation', 'behavior', 3);
            this.updateDegenScore(accusedId, -3, 'Involved in false scam accusation', 'community');
        }
    }
    async onAccountabilitySuccess(event) {
        const { userId, action } = event.data;
        if (!userId)
            return;
        const bonuses = {
            'cooldown-accepted': 2,
            'vault-used': 3,
            'phone-a-friend': 2,
            'smart-withdrawal': 4,
        };
        const bonus = bonuses[action] || 1;
        this.updateDegenScore(userId, bonus, `Accountability: ${action}`, 'accountability');
    }
    // ============================================
    // PUBLIC API
    // ============================================
    getCasinoScore(casinoName) {
        return this.getCasinoRecord(casinoName).score;
    }
    getCasinoBreakdown(casinoName) {
        return { ...this.getCasinoRecord(casinoName) };
    }
    getDegenScore(userId) {
        return this.getDegenRecord(userId).score;
    }
    getDegenBreakdown(userId) {
        return { ...this.getDegenRecord(userId) };
    }
    getTrustLevel(score) {
        if (score >= 95)
            return 'very-high';
        if (score >= 80)
            return 'high';
        if (score >= 60)
            return 'neutral';
        if (score >= 40)
            return 'low';
        return 'high-risk';
    }
    explainCasinoScore(casinoName) {
        const record = this.getCasinoRecord(casinoName);
        const explanations = [];
        if (record.bonusScore < 60) {
            explanations.push('⚠️ Frequent bonus nerfs detected');
        }
        if (record.fairnessScore < 60) {
            explanations.push('⚠️ Fairness concerns reported');
        }
        if (record.payoutScore < 60) {
            explanations.push('⚠️ Payout delays or issues');
        }
        if (record.freespinScore < 60) {
            explanations.push('⚠️ Suspicious promotional links');
        }
        if (record.supportScore < 60) {
            explanations.push('⚠️ Poor support quality');
        }
        if (explanations.length === 0) {
            explanations.push('✅ No major trust issues detected');
        }
        // Add recent significant events
        const recentEvents = record.history.slice(-5);
        recentEvents.forEach(evt => {
            if (Math.abs(evt.delta) >= 3) {
                explanations.push(`${evt.delta > 0 ? '📈' : '📉'} ${evt.reason}`);
            }
        });
        return explanations;
    }
    explainDegenScore(userId) {
        const record = this.getDegenRecord(userId);
        const explanations = [];
        const level = this.getTrustLevel(record.score);
        explanations.push(`Trust Level: ${level.toUpperCase().replace('-', ' ')}`);
        if (record.tiltIndicators > 3) {
            explanations.push('⚠️ Recent tilt behavior detected');
        }
        if (record.scamFlags > 0) {
            explanations.push(`🚨 ${record.scamFlags} confirmed scam report(s)`);
        }
        if (record.accountabilityBonus > 10) {
            explanations.push('✅ Strong accountability tool usage');
        }
        if (record.behaviorScore > 85) {
            explanations.push('✅ Excellent community behavior');
        }
        if (record.communityReports < -10) {
            explanations.push('⚠️ Multiple negative community reports');
        }
        // Recent events
        const recentEvents = record.history.slice(-3);
        recentEvents.forEach(evt => {
            if (Math.abs(evt.delta) >= 5) {
                explanations.push(`${evt.delta > 0 ? '📈' : '📉'} ${evt.reason}`);
            }
        });
        return explanations;
    }
    // ============================================
    // PERSISTENCE & RECOVERY
    // ============================================
    persist() {
        if (!this.cfg.persistDir)
            return;
        try {
            if (!fs.existsSync(this.cfg.persistDir)) {
                fs.mkdirSync(this.cfg.persistDir, { recursive: true });
            }
            const casinoPath = path.join(this.cfg.persistDir, 'casino-trust.json');
            const degenPath = path.join(this.cfg.persistDir, 'degen-trust.json');
            fs.writeFileSync(casinoPath, JSON.stringify(Array.from(this.casinoRecords.entries()), null, 2));
            fs.writeFileSync(degenPath, JSON.stringify(Array.from(this.degenRecords.entries()), null, 2));
        }
        catch (err) {
            this.log('error', 'Failed to persist trust data', err);
        }
    }
    loadPersisted() {
        if (!this.cfg.persistDir)
            return;
        try {
            const casinoPath = path.join(this.cfg.persistDir, 'casino-trust.json');
            const degenPath = path.join(this.cfg.persistDir, 'degen-trust.json');
            if (fs.existsSync(casinoPath)) {
                const data = JSON.parse(fs.readFileSync(casinoPath, 'utf-8'));
                this.casinoRecords = new Map(data);
                this.log('info', `Loaded ${this.casinoRecords.size} casino trust records`);
            }
            if (fs.existsSync(degenPath)) {
                const data = JSON.parse(fs.readFileSync(degenPath, 'utf-8'));
                this.degenRecords = new Map(data);
                this.log('info', `Loaded ${this.degenRecords.size} degen trust records`);
            }
        }
        catch (err) {
            this.log('warn', 'Failed to load persisted trust data', err);
        }
    }
    startRecoveryScheduler() {
        // Run recovery every hour
        this.recoveryInterval = setInterval(() => {
            this.runRecovery();
        }, 3600000); // 1 hour
    }
    runRecovery() {
        const now = Date.now();
        const rate = this.cfg.recoveryRatePerHour || 0.5;
        // Recover tilt indicators for degen trust
        for (const [userId, record] of this.degenRecords.entries()) {
            if (record.tiltIndicators > 0) {
                const hoursElapsed = (now - record.lastUpdated) / 3600000;
                const recovery = Math.min(record.tiltIndicators, rate * hoursElapsed);
                if (recovery > 0) {
                    this.updateDegenScore(userId, -recovery, 'Natural tilt recovery', 'tilt');
                }
            }
        }
        this.log('debug', 'Trust recovery cycle complete');
    }
    shutdown() {
        if (this.recoveryInterval) {
            clearInterval(this.recoveryInterval);
        }
        this.persist();
    }
    // Test utility - clear all state
    clearState() {
        this.casinoRecords.clear();
        this.degenRecords.clear();
    }
    log(level, msg, meta) {
        const logger = this.cfg.logger;
        if (logger && logger[level]) {
            try {
                logger[level](msg, meta);
            }
            catch { }
        }
        if (!this.cfg.logDir)
            return;
        try {
            if (!fs.existsSync(this.cfg.logDir))
                fs.mkdirSync(this.cfg.logDir, { recursive: true });
            const base = path.join(this.cfg.logDir, 'trust-engines.log');
            const line = JSON.stringify({ ts: Date.now(), level, msg, meta }, null, 0) + '\n';
            fs.appendFileSync(base, line);
            this.rotateLogs(base);
        }
        catch { }
    }
    rotateLogs(baseFile) {
        try {
            const size = fs.statSync(baseFile).size;
            if (size <= (this.cfg.maxLogSizeBytes || 0))
                return;
            const maxFiles = this.cfg.maxLogFiles || 1;
            for (let i = maxFiles - 1; i >= 0; i--) {
                const src = i === 0 ? baseFile : `${baseFile}.${i}`;
                if (fs.existsSync(src)) {
                    const dest = `${baseFile}.${i + 1}`;
                    if (i + 1 > maxFiles) {
                        fs.rmSync(src, { force: true });
                    }
                    else {
                        fs.renameSync(src, dest);
                    }
                }
            }
            fs.writeFileSync(baseFile, '');
        }
        catch { }
    }
}
export const trustEngines = new TrustEnginesService();
//# sourceMappingURL=index.js.map