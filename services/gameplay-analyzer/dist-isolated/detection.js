/**
 * Detection Engine
 * Anomaly detection algorithms for fairness analysis
 */
/**
 * Pump Detection: Rapid RTP elevation above baseline
 * Flags periods where observed RTP significantly exceeds expected
 */
export function detectPump(spins, windowSize = 100, baselineRTP = 0.96, thresholdMultiplier = 1.15) {
    if (spins.length < windowSize) {
        return { detected: false, severity: 'info', confidence: 0, metadata: {}, reason: 'Insufficient data' };
    }
    const window = spins.slice(-windowSize);
    const totalBet = window.reduce((a, s) => a + s.bet, 0);
    const totalWin = window.reduce((a, s) => a + s.win, 0);
    const observedRTP = totalBet > 0 ? totalWin / totalBet : 0;
    const threshold = baselineRTP * thresholdMultiplier;
    const detected = observedRTP > threshold;
    const deviationRatio = (observedRTP - baselineRTP) / baselineRTP;
    const confidence = Math.min(1, Math.max(0, deviationRatio / 0.5)); // 50% deviation = max confidence
    let severity = 'info';
    if (detected) {
        severity = deviationRatio > 0.5 ? 'critical' : deviationRatio > 0.25 ? 'warning' : 'info';
    }
    return {
        detected,
        severity,
        confidence,
        metadata: {
            windowSize,
            observedRTP: observedRTP.toFixed(4),
            baselineRTP,
            threshold,
            deviationRatio: deviationRatio.toFixed(3),
            totalBet,
            totalWin,
        },
        reason: detected
            ? `RTP elevated ${(deviationRatio * 100).toFixed(1)}% above baseline in ${windowSize}-spin window`
            : 'RTP within expected range',
    };
}
/**
 * Volatility Compression: Unusually low variance before RTP spike
 * Often precedes pump scenarios as system "stabilizes" before payout burst
 */
export function detectVolatilityCompression(spins, compressionWindow = 50, comparisonWindow = 200, compressionThreshold = 0.3 // variance ratio threshold
) {
    if (spins.length < comparisonWindow) {
        return { detected: false, severity: 'info', confidence: 0, metadata: {}, reason: 'Insufficient data' };
    }
    const recent = spins.slice(-compressionWindow);
    const baseline = spins.slice(-(comparisonWindow + compressionWindow), -compressionWindow);
    const calcVariance = (data) => {
        const netWins = data.map(s => s.win - s.bet);
        const mean = netWins.reduce((a, b) => a + b, 0) / netWins.length;
        return netWins.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / netWins.length;
    };
    const recentVariance = calcVariance(recent);
    const baselineVariance = calcVariance(baseline);
    if (baselineVariance === 0) {
        return { detected: false, severity: 'info', confidence: 0, metadata: {}, reason: 'Zero baseline variance' };
    }
    const varianceRatio = recentVariance / baselineVariance;
    const detected = varianceRatio < compressionThreshold;
    const confidence = detected ? Math.min(1, (compressionThreshold - varianceRatio) / compressionThreshold) : 0;
    let severity = 'info';
    if (detected) {
        severity = varianceRatio < 0.15 ? 'critical' : varianceRatio < 0.25 ? 'warning' : 'info';
    }
    return {
        detected,
        severity,
        confidence,
        metadata: {
            compressionWindow,
            comparisonWindow,
            recentVariance: recentVariance.toFixed(4),
            baselineVariance: baselineVariance.toFixed(4),
            varianceRatio: varianceRatio.toFixed(3),
            compressionThreshold,
        },
        reason: detected
            ? `Volatility compressed to ${(varianceRatio * 100).toFixed(1)}% of baseline (${compressionWindow}-spin window)`
            : 'Volatility within expected range',
    };
}
/**
 * Consecutive Win Clustering: Abnormal density of wins in short sequence
 * Detects streaks that deviate significantly from expected distribution
 */
export function detectWinClustering(spins, clusterWindow = 20, winThresholdMultiplier = 1.5, // win > bet * multiplier = "win"
clusterThreshold = 0.7 // % of wins in window to flag
) {
    if (spins.length < clusterWindow) {
        return { detected: false, severity: 'info', confidence: 0, metadata: {}, reason: 'Insufficient data' };
    }
    let maxClusterDensity = 0;
    let maxClusterStart = 0;
    for (let i = 0; i <= spins.length - clusterWindow; i++) {
        const window = spins.slice(i, i + clusterWindow);
        const winCount = window.filter(s => s.win > s.bet * winThresholdMultiplier).length;
        const density = winCount / clusterWindow;
        if (density > maxClusterDensity) {
            maxClusterDensity = density;
            maxClusterStart = i;
        }
    }
    const detected = maxClusterDensity >= clusterThreshold;
    const confidence = detected ? Math.min(1, (maxClusterDensity - clusterThreshold) / (1 - clusterThreshold)) : 0;
    let severity = 'info';
    if (detected) {
        severity = maxClusterDensity > 0.85 ? 'critical' : maxClusterDensity > 0.75 ? 'warning' : 'info';
    }
    return {
        detected,
        severity,
        confidence,
        metadata: {
            clusterWindow,
            maxClusterDensity: maxClusterDensity.toFixed(3),
            clusterThreshold,
            clusterStartIdx: maxClusterStart,
            winThresholdMultiplier,
        },
        reason: detected
            ? `${(maxClusterDensity * 100).toFixed(1)}% win density in ${clusterWindow}-spin window (threshold ${clusterThreshold * 100}%)`
            : 'Win distribution normal',
    };
}
/**
 * Combined Anomaly Score: Composite detection for multi-signal alerts
 */
export function computeAnomalyScore(detections) {
    const weights = { pump: 0.4, compression: 0.3, clustering: 0.3 };
    const score = (detections.pump.detected ? detections.pump.confidence * weights.pump : 0) +
        (detections.compression.detected ? detections.compression.confidence * weights.compression : 0) +
        (detections.clustering.detected ? detections.clustering.confidence * weights.clustering : 0);
    const flags = [];
    if (detections.pump.detected)
        flags.push('pump');
    if (detections.compression.detected)
        flags.push('compression');
    if (detections.clustering.detected)
        flags.push('clustering');
    let severity = 'info';
    if (score > 0.7)
        severity = 'critical';
    else if (score > 0.4)
        severity = 'warning';
    return { score, severity, flags };
}
