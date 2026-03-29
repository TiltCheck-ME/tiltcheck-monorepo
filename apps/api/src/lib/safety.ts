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
 */
export async function evaluateSentimentV2(input: SentimentInput): Promise<SentimentResult> {
  const diaUrl = process.env.AGENT_DIA_URL;
  const diaApiKey = process.env.AGENT_DIA_API_KEY;

  if (!diaUrl) {
    // Fallback to V1 if agent is not configured
    return evaluateSentiment(input);
  }

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

    if (!resp.ok) return evaluateSentiment(input);
    
    const data = (await resp.json()) as any;
    // The ADK agent returns the response as a string or structured data
    // For now, we trust the agent's summary or parse its tool outputs if available
    // Mocking the parse logic for the refined V2 result:
    return {
      score: data.riskScore ?? 50,
      severity: (data.riskScore ?? 50) > 75 ? 'high' : (data.riskScore ?? 50) > 40 ? 'moderate' : 'low',
      intervention: (data.riskScore ?? 50) > 85 ? 'escalation' : (data.riskScore ?? 50) > 60 ? 'cooldown' : 'none',
      matchedSignals: data.signals ?? ['vertex-ai-audit'],
    };
  } catch (err) {
    console.error('[Safety] Vertex Sentiment V2 failed:', err);
    return evaluateSentiment(input);
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
