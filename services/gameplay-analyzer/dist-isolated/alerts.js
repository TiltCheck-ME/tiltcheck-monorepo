/**
 * Alert Management
 * Throttling and escalation for fairness anomalies
 */
class AlertManager {
    recentAlerts = new Map(); // key: `${casinoId}:${type}`, value: lastTimestamp
    alertHistory = [];
    throttleConfig;
    escalationConfig;
    constructor(throttleConfig = { cooldownMs: 5 * 60 * 1000, dedupWindow: 60 * 1000 }, escalationConfig = { multiAnomalyWindow: 10 * 60 * 1000, criticalThreshold: 0.7 }) {
        this.throttleConfig = throttleConfig;
        this.escalationConfig = escalationConfig;
    }
    /**
     * Emit alert if not throttled
     * Returns null if throttled, Alert object if emitted
     */
    emit(alert) {
        const throttleKey = `${alert.casinoId}:${alert.type}`;
        const now = Date.now();
        // Check throttle
        const lastAlert = this.recentAlerts.get(throttleKey);
        if (lastAlert && (now - lastAlert) < this.throttleConfig.cooldownMs) {
            return null; // throttled
        }
        // Check dedup window
        const isDuplicate = this.alertHistory.some(a => a.casinoId === alert.casinoId &&
            a.type === alert.type &&
            a.severity === alert.severity &&
            (now - a.timestamp) < this.throttleConfig.dedupWindow);
        if (isDuplicate) {
            return null; // duplicate within dedup window
        }
        // Create alert
        const fullAlert = {
            id: `${alert.casinoId}-${alert.type}-${now}`,
            ...alert,
        };
        this.recentAlerts.set(throttleKey, now);
        this.alertHistory.push(fullAlert);
        // Cleanup old history (keep 1 hour)
        this.alertHistory = this.alertHistory.filter(a => (now - a.timestamp) < 60 * 60 * 1000);
        return fullAlert;
    }
    /**
     * Check if multiple anomalies warrant escalation
     */
    shouldEscalate(casinoId, currentAlert) {
        const now = Date.now();
        const recentAnomalies = this.alertHistory.filter(a => a.casinoId === casinoId &&
            (now - a.timestamp) < this.escalationConfig.multiAnomalyWindow &&
            a.severity !== 'info');
        // Escalate if:
        // 1. Current alert is critical
        // 2. Multiple warning/critical alerts in window
        if (currentAlert.severity === 'critical') {
            return true;
        }
        if (recentAnomalies.length >= 3) {
            return true;
        }
        // Escalate if composite confidence exceeds threshold
        if (currentAlert.confidence >= this.escalationConfig.criticalThreshold) {
            return true;
        }
        return false;
    }
    /**
     * Get recent alerts for casino
     */
    getRecentAlerts(casinoId, limit = 10) {
        return this.alertHistory
            .filter(a => a.casinoId === casinoId)
            .slice(-limit);
    }
    /**
     * Get all critical alerts
     */
    getCriticalAlerts() {
        return this.alertHistory.filter(a => a.severity === 'critical');
    }
    /**
     * Clear throttle state for casino (manual reset)
     */
    resetThrottle(casinoId, type) {
        if (type) {
            this.recentAlerts.delete(`${casinoId}:${type}`);
        }
        else {
            // Clear all for casino
            for (const key of this.recentAlerts.keys()) {
                if (key.startsWith(`${casinoId}:`)) {
                    this.recentAlerts.delete(key);
                }
            }
        }
    }
}
export { AlertManager };
