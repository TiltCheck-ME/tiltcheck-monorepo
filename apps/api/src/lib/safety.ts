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
  const normalized = input.message.toLowerCase();
  const matchedSignals = new Set<string>();

  const highRiskKeywords = [
    'all in',
    'can not stop',
    'cannot stop',
    "can't stop",
    'lost everything',
    'chasing losses',
    'maxing out',
    'tilted',
    'rage bet',
  ];
  const moderateKeywords = [
    'down bad',
    'stress',
    'angry',
    'frustrated',
    'need to win back',
    'spiraling',
    'panic',
  ];

  let score = 0;

  for (const keyword of highRiskKeywords) {
    if (normalized.includes(keyword)) {
      matchedSignals.add(keyword);
      score += 18;
    }
  }
  for (const keyword of moderateKeywords) {
    if (normalized.includes(keyword)) {
      matchedSignals.add(keyword);
      score += 10;
    }
  }

  const distressSignals = input.distressSignals ?? [];
  for (const signal of distressSignals) {
    if (signal.trim()) {
      matchedSignals.add(signal);
      score += 8;
    }
  }

  if (input.message.includes('!!!')) {
    score += 8;
  }
  if (/[A-Z]{4,}/.test(input.message)) {
    score += 6;
  }

  score = clamp(score);

  let severity: SentimentResult['severity'] = 'low';
  let intervention: SentimentResult['intervention'] = 'none';
  if (score >= 75) {
    severity = 'high';
    intervention = 'escalation';
  } else if (score >= 50) {
    severity = 'high';
    intervention = 'cooldown';
  } else if (score >= 30) {
    severity = 'moderate';
    intervention = 'check-in';
  }

  return {
    score,
    severity,
    intervention,
    matchedSignals: Array.from(matchedSignals),
  };
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
