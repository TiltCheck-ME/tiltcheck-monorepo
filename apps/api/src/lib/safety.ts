/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { analyzeSentiment } from '@tiltcheck/utils';
export type TiltRiskTier = 'low' | 'moderate' | 'high' | 'critical';

export interface BreathalyzerInput {
  userId: string;
  eventsInWindow: number;
  windowMinutes: number;
  lossAmountWindow?: number;
  streakLosses?: number;
}

export interface BreathalyzerResult {
  riskScore: number;
  riskTier: TiltRiskTier;
  recommendedCooldownMinutes: number;
  requiresCooldown: boolean;
  factors: {
    velocityScore: number;
    lossPressureScore: number;
    streakScore: number;
  };
}

export interface SentimentInput {
  userId: string;
  message: string;
  distressSignals?: string[];
}

export interface SentimentResult {
  score: number;
  severity: 'low' | 'moderate' | 'high';
  intervention: 'none' | 'check-in' | 'cooldown' | 'escalation';
  matchedSignals: string[];
}

export function evaluateBreathalyzer(input: BreathalyzerInput): BreathalyzerResult {
  const events = Math.max(0, input.eventsInWindow);
  const windowMinutes = Math.max(1, input.windowMinutes);
  const lossAmount = Math.max(0, input.lossAmountWindow ?? 0);
  const streakLosses = Math.max(0, input.streakLosses ?? 0);

  const perMinute = events / windowMinutes;
  const velocityScore = clamp(perMinute * 25);
  const lossPressureScore = clamp(lossAmount * 0.75);
  const streakScore = clamp(streakLosses * 15);

  const riskScore = round2(
    velocityScore * 0.45 + lossPressureScore * 0.35 + streakScore * 0.2,
  );
  const riskTier = riskScoreToTier(riskScore);
  const recommendedCooldownMinutes = cooldownForTier(riskTier);

  return {
    riskScore,
    riskTier,
    recommendedCooldownMinutes,
    requiresCooldown: recommendedCooldownMinutes > 0,
    factors: {
      velocityScore: round2(velocityScore),
      lossPressureScore: round2(lossPressureScore),
      streakScore: round2(streakScore),
    },
  };
}


export function evaluateSentiment(input: SentimentInput): SentimentResult {
  const analysis = analyzeSentiment(input.message);
  
  let severity: SentimentResult['severity'] = 'low';
  let intervention: SentimentResult['intervention'] = 'none';

  // Map analysis stage to API result
  if (analysis.stage === 'FINAL_EXIT' || analysis.stage === 'BREAKING_POINT') {
    severity = 'high';
    intervention = 'escalation';
  } else if (analysis.stage === 'DESPERATION') {
    severity = 'high';
    intervention = 'cooldown';
  } else if (analysis.stage === 'EUPHORIA') {
    severity = 'moderate';
    intervention = 'check-in';
  }

  return {
    score: analysis.score,
    severity,
    intervention,
    matchedSignals: analysis.detectedKeywords,
  };
}

/**
 * Advanced Sentiment Evaluation (Vertex AI via DIA)
 * Asynchronous call to the Degen Intelligence Agent for contextual analysis.
 * Uses V1 as a pre-filter to optimize latency and costs.
 */
export async function evaluateSentimentV2(input: SentimentInput): Promise<SentimentResult> {
  // Step 1: Pre-filter with V1 (Fast Rules)
  const v1Result = evaluateSentiment(input);
  
  // If rules definitely caught a critical signal, no need to ask AI yet unless we want a nudge
  if (v1Result.severity === 'high' && v1Result.intervention === 'escalation') {
    return v1Result;
  }

  const diaUrl = process.env.AGENT_DIA_URL;
  const diaApiKey = process.env.AGENT_DIA_API_KEY;

  if (!diaUrl) return v1Result;

  try {
    const resp = await fetch(`${diaUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(diaApiKey ? { Authorization: `Bearer ${diaApiKey}` } : {}),
      },
      body: JSON.stringify({
        message: `ANALYZE PSYCHOLOGY: "${input.message}". Categorize risk for user ${input.userId}. Use the analyze_sentiment_v2 tool.`,
      }),
    });

    if (!resp.ok) return v1Result;
    
    const data = (await resp.json()) as any;
    
    // Step 2: Merge V1 signals with AI depth
    return {
      score: data.riskScore ?? v1Result.score,
      severity: (data.riskScore ?? v1Result.score) > 75 ? 'high' : (data.riskScore ?? v1Result.score) > 40 ? 'moderate' : 'low',
      intervention: (data.riskScore ?? v1Result.score) > 85 ? 'escalation' : (data.riskScore ?? v1Result.score) > 60 ? 'cooldown' : v1Result.intervention,
      matchedSignals: [...new Set([...v1Result.matchedSignals, ...(data.signals ?? ['vertex-ai-audit'])])],
    };
  } catch (err) {
    console.error('[Safety] Vertex Sentiment V2 failed:', err);
    return v1Result;
  }
}

function riskScoreToTier(score: number): TiltRiskTier {
  if (score >= 75) {
    return 'critical';
  }
  if (score >= 50) {
    return 'high';
  }
  if (score >= 25) {
    return 'moderate';
  }
  return 'low';
}

function cooldownForTier(tier: TiltRiskTier): number {
  switch (tier) {
    case 'critical':
      return 60;
    case 'high':
      return 15;
    default:
      return 0;
  }
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
