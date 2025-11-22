import { eventRouter } from '@tiltcheck/event-router';
import { addTrustSignal } from './store.js';

// Simple heuristic mapping from events to trust signals.
function registerIdentityEventSubscriptions() {
  try {
    eventRouter.subscribe('tilt.detected', (evt) => {
      const { userId, severityScore = 0.5 } = evt.data || {};
      if (!userId) return;
      // Negative signal proportional to severity
      addTrustSignal(userId, 'tilt', 'tilt_severity', -Math.min(1, severityScore), 0.6);
    }, 'tiltcheck-core');

    eventRouter.subscribe('link.flagged', (evt) => {
      const { url: _url, riskLevel = 'HIGH', userId } = evt.data || {};
      if (!userId) return;
      const val = riskLevel === 'HIGH' ? -0.8 : riskLevel === 'MEDIUM' ? -0.4 : -0.2;
      addTrustSignal(userId, 'link', 'link_risk', val, 0.5);
    }, 'tiltcheck-core');

    eventRouter.subscribe('trust.casino.updated', (evt) => {
      const { sessionId: _sessionId, userId, metrics = {} } = evt.data || {};
      const targetId = userId || evt.data?.userId || metrics?.userId;
      if (!targetId) return;
      // Positive if volatility reasonable, negative if extreme drift
      const drift = metrics.rtpDriftFrac;
      if (typeof drift === 'number') {
        const val = drift < 0 ? -Math.min(1, Math.abs(drift)) : 0.1; // slight positive if zero/positive drift
        addTrustSignal(targetId, 'gameplay', 'rtp_drift', val, 0.4);
      }
    }, 'tiltcheck-core');

    // Placeholder tipping event sample
    eventRouter.subscribe('tip.completed', (evt) => {
      const { senderId } = evt.data || {};
      if (!senderId) return;
      addTrustSignal(senderId, 'tip', 'tip_activity', 0.05, 0.2); // small positive for normal activity
    }, 'tiltcheck-core');

    // Gameplay anomaly subscriptions
    eventRouter.subscribe('fairness.pump.detected', (evt) => {
      const { userId, severity, confidence } = evt.data || {};
      if (!userId) return; // Can't attribute without userId
      // Negative signal for pump detection (potential manipulation)
      const severityMap = { info: -0.1, warning: -0.3, critical: -0.6 };
      const baseVal = severityMap[severity as keyof typeof severityMap] || -0.2;
      const val = baseVal * (confidence || 0.5);
      addTrustSignal(userId, 'gameplay', 'pump_detected', val, 0.5);
    }, 'tiltcheck-core');

    eventRouter.subscribe('fairness.compression.detected', (evt) => {
      const { userId, severity, confidence } = evt.data || {};
      if (!userId) return;
      // Volatility compression precedes pumps - moderate negative signal
      const severityMap = { info: -0.05, warning: -0.15, critical: -0.3 };
      const baseVal = severityMap[severity as keyof typeof severityMap] || -0.1;
      const val = baseVal * (confidence || 0.5);
      addTrustSignal(userId, 'gameplay', 'compression_detected', val, 0.3);
    }, 'tiltcheck-core');

    eventRouter.subscribe('fairness.cluster.detected', (evt) => {
      const { userId, severity, confidence } = evt.data || {};
      if (!userId) return;
      // Win clustering anomaly - moderate negative
      const severityMap = { info: -0.1, warning: -0.25, critical: -0.5 };
      const baseVal = severityMap[severity as keyof typeof severityMap] || -0.15;
      const val = baseVal * (confidence || 0.5);
      addTrustSignal(userId, 'gameplay', 'cluster_detected', val, 0.4);
    }, 'tiltcheck-core');

    // Human review verified events
    eventRouter.subscribe('trust.human.verified', (evt) => {
      const { userId, verified, decision } = evt.data || {};
      if (!userId) return;
      // Human reviewer confirmed the anomaly - stronger negative signal
      if (verified && decision === 'approve') {
        addTrustSignal(userId, 'gameplay', 'human_verified_anomaly', -0.8, 0.9);
      }
    }, 'tiltcheck-core');

    eventRouter.subscribe('trust.false.positive', (evt) => {
      const { userId, falsePositive } = evt.data || {};
      if (!userId) return;
      // Human reviewer marked as false positive - restore some trust
      if (falsePositive) {
        addTrustSignal(userId, 'gameplay', 'false_positive_corrected', 0.3, 0.6);
      }
    }, 'tiltcheck-core');
  } catch (e) {
    console.error('[identity-core] Failed to register event subscriptions', e);
  }
}

registerIdentityEventSubscriptions();

export {};