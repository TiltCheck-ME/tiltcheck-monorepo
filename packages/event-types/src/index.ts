/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * @tiltcheck/event-types
 * Shared event contracts for the TiltCheck Event Router.
 */

export type TiltCheckEventName =
  | 'security.phishing.detected'
  | 'security.domain.blocked'
  | 'safety.breathalyzer.evaluated'
  | 'safety.cooldown.triggered'
  | 'safety.sentiment.flagged'
  | 'safety.intervention.triggered'
  | 'safety.tilt.detected'
  | 'trust.affiliate.score.updated'
  | 'identity.wallet.linked'
  | 'financial.tip.processed'
  | 'trust.casino.graded'
  | 'activity.launched'
  | 'activity.action'
  | 'activity.completed'
  | 'activity.paused'
  | 'activity.resumed'
  | 'activity.error';

export interface TiltCheckBaseEvent<
  Name extends TiltCheckEventName,
  Payload = Record<string, unknown>,
> {
  id: string;
  name: Name;
  source: string;
  occurredAt: string;
  correlationId?: string;
  payload: Payload;
}

export interface WalletLinkedPayload {
  userId: string;
  walletAddress: string;
  provider: 'magic' | 'phantom' | 'metamask' | 'x402';
}

export interface TipProcessedPayload {
  tipId: string;
  senderId: string;
  recipientId: string;
  amount: number;
  currency: string;
  signature?: string;
  status: 'completed' | 'failed';
}

export interface CasinoGradedPayload {
  casinoId: string;
  casinoName: string;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' | 'S';
  previousGrade?: string;
  adminId: string;
  reason?: string;
}

export interface PhishingDetectedPayload {
  url: string;
  domain: string;
  confidence: number;
  matchedSignals: string[];
}

export interface DomainBlockedPayload {
  domain: string;
  reason: string;
  blocklist: 'internal' | 'community' | 'third-party';
}

export interface BreathalyzerEvaluatedPayload {
  userId: string;
  riskScore: number;
  riskTier: 'low' | 'moderate' | 'high' | 'critical';
  eventsInWindow: number;
  windowMinutes: number;
  recommendedCooldownMinutes: number;
}

export interface CooldownTriggeredPayload {
  userId: string;
  cooldownMinutes: number;
  reason: string;
}

export interface SentimentFlaggedPayload {
  userId: string;
  score: number;
  severity: 'low' | 'moderate' | 'high';
  matchedSignals: string[];
}

export interface InterventionTriggeredPayload {
  userId: string;
  interventionType: 'nudge' | 'check-in' | 'cooldown' | 'escalation';
  reason: string;
}

export interface TiltDetectedPayload {
  userId: string;
  tiltScore: number;
  threshold: number;
  trigger: 'loss_streak' | 'large_loss' | 'time_played' | 'behavior';
  sessionMetrics: {
    pnl: number;
    currentStreak: { wins: number; losses: number };
    rtp: number;
    timeInSession: number;
  };
}

export interface AffiliateScoreUpdatedPayload {
  affiliateId: string;
  score: number;
  categories: {
    fairness: number;
    support: number;
    payouts: number;
    compliance: number;
    bonusQuality: number;
  };
  sourceCount: number;
}

export interface ActivityLaunchedPayload {
  instanceId: string;
  userId: string;
  activityType: 'trivia' | 'poker' | 'slots' | 'blackjack';
  guildId: string;
  channelId: string;
}

export interface ActivityActionPayload {
  instanceId: string;
  userId: string;
  action: Record<string, unknown>;
}

export interface ActivityCompletedPayload {
  instanceId: string;
  userId: string;
  activityType: 'trivia' | 'poker' | 'slots' | 'blackjack';
  status: 'won' | 'lost' | 'abandoned';
  score?: number;
  prizeAmount?: number;
  entitlementConsumed?: boolean;
  completedAt: number;
}

export interface ActivityPausedPayload {
  instanceId: string;
}

export interface ActivityResumedPayload {
  instanceId: string;
}

export interface ActivityErrorPayload {
  instanceId: string;
  userId: string;
  error: Record<string, unknown>;
}

export type WalletLinkedEvent = TiltCheckBaseEvent<'identity.wallet.linked', WalletLinkedPayload>;
export type TipProcessedEvent = TiltCheckBaseEvent<'financial.tip.processed', TipProcessedPayload>;
export type CasinoGradedEvent = TiltCheckBaseEvent<'trust.casino.graded', CasinoGradedPayload>;

export type TiltCheckEvent =
  | TiltCheckBaseEvent<'security.phishing.detected', PhishingDetectedPayload>
  | TiltCheckBaseEvent<'security.domain.blocked', DomainBlockedPayload>
  | TiltCheckBaseEvent<'safety.breathalyzer.evaluated', BreathalyzerEvaluatedPayload>
  | TiltCheckBaseEvent<'safety.cooldown.triggered', CooldownTriggeredPayload>
  | TiltCheckBaseEvent<'safety.sentiment.flagged', SentimentFlaggedPayload>
  | TiltCheckBaseEvent<'safety.intervention.triggered', InterventionTriggeredPayload>
  | TiltCheckBaseEvent<'safety.tilt.detected', TiltDetectedPayload>
  | TiltCheckBaseEvent<'trust.affiliate.score.updated', AffiliateScoreUpdatedPayload>
  | WalletLinkedEvent
  | TipProcessedEvent
  | CasinoGradedEvent
  | TiltCheckBaseEvent<'activity.launched', ActivityLaunchedPayload>
  | TiltCheckBaseEvent<'activity.action', ActivityActionPayload>
  | TiltCheckBaseEvent<'activity.completed', ActivityCompletedPayload>
  | TiltCheckBaseEvent<'activity.paused', ActivityPausedPayload>
  | TiltCheckBaseEvent<'activity.resumed', ActivityResumedPayload>
  | TiltCheckBaseEvent<'activity.error', ActivityErrorPayload>;

export interface CreateEventInput<
  Name extends TiltCheckEventName,
  Payload extends object,
> {
  name: Name;
  source: string;
  payload: Payload;
  correlationId?: string;
  id?: string;
  occurredAt?: string;
}

export function createEvent<
  Name extends TiltCheckEventName,
  Payload extends object,
>(input: CreateEventInput<Name, Payload>): TiltCheckBaseEvent<Name, Payload> {
  return {
    id: input.id ?? generateEventId(),
    name: input.name,
    source: input.source,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    correlationId: input.correlationId,
    payload: input.payload,
  };
}

function generateEventId(): string {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `evt_${Date.now()}_${randomPart}`;
}
