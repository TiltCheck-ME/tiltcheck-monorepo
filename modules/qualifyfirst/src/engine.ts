/**
 * QualifyFirst heuristic engine
 * Phase 1: deterministic scoring (no external AI calls yet)
 */

export interface UserProfile {
  id: string;
  country?: string;
  age?: number;
  tags?: string[]; // interest or experience tags
  hoursActiveLast7d?: number;
  completionRate?: number; // percent 0-100
}

export interface SurveyMeta {
  id: string;
  country?: string; // target country or undefined means global
  minAge?: number;
  maxAge?: number;
  requiredTags?: string[];
  estMinutes?: number;
  payoutUsd?: number;
  screenOutRate?: number; // historical screen-out probability 0-1
}

export interface MatchProbability {
  surveyId: string;
  userId: string;
  probability: number; // 0-1
  score: number; // 0-100 scaled
  reasons: string[];
  riskFlags: string[];
}

export interface RouteResult {
  userId: string;
  generatedAt: number;
  matches: MatchProbability[];
}

/** Basic weight constants (externalizable) */
export interface WeightConfig {
  country: number;
  age: number;
  tags: number;
  completionRate: number;
  engagement: number;
  screenOutPenalty: number;
  minScoreThreshold: number; // routing filter threshold
}

export const DEFAULT_WEIGHTS: WeightConfig = {
  country: 20,
  age: 10,
  tags: 30,
  completionRate: 25,
  engagement: 15,
  screenOutPenalty: 35,
  minScoreThreshold: 30
};

let ACTIVE_WEIGHTS: WeightConfig = { ...DEFAULT_WEIGHTS };
let WEIGHT_VERSION = 1; // incremented whenever weights change for experiment tracking
let EXPERIMENT_LABEL: string | undefined; // optional label for A/B test tracking
export function setWeights(next: Partial<WeightConfig>, experimentLabel?: string) {
  ACTIVE_WEIGHTS = { ...ACTIVE_WEIGHTS, ...next };
  WEIGHT_VERSION += 1;
  EXPERIMENT_LABEL = experimentLabel;
}
export function getWeights(): WeightConfig { return ACTIVE_WEIGHTS; }
export function currentWeightVersion() { return WEIGHT_VERSION; }
export function currentExperimentLabel() { return EXPERIMENT_LABEL; }

export interface MatchBreakdown extends MatchProbability {
  breakdown: {
    country: number;
    age: number;
    tags: number;
    completionRate: number;
    engagement: number;
    screenOutPenaltyFactor: number;
    rawBeforePenalty: number;
  };
}

export function predictSurveyMatch(user: UserProfile, survey: SurveyMeta, includeBreakdown = false): MatchProbability | MatchBreakdown {
  const reasons: string[] = [];
  const riskFlags: string[] = [];
  const W = ACTIVE_WEIGHTS;
  let raw = 0;
  let countryScore = 0;
  let ageScore = 0;
  let tagScore = 0;
  let completionScore = 0;
  let engagementScore = 0;

  // Country match
  if (!survey.country || survey.country === user.country) {
    countryScore = W.country;
    raw += countryScore;
    reasons.push('country-match');
  } else {
    riskFlags.push('country-mismatch');
  }

  // Age bracket
  if ((survey.minAge && user.age && user.age < survey.minAge) || (survey.maxAge && user.age && user.age > survey.maxAge)) {
    riskFlags.push('age-range');
  } else {
    ageScore = W.age;
    raw += ageScore;
    reasons.push('age-range-ok');
  }

  // Tag coverage
  const req = survey.requiredTags || [];
  const userTags = user.tags || [];
  const tagMatches = req.filter(t => userTags.includes(t)).length;
  if (req.length === 0) {
    tagScore = W.tags * 0.5; // neutral bonus
    raw += tagScore;
    reasons.push('no-required-tags');
  } else if (tagMatches === req.length) {
    tagScore = W.tags;
    raw += tagScore;
    reasons.push('all-tags');
  } else if (tagMatches > 0) {
    tagScore = W.tags * (tagMatches / req.length);
    raw += tagScore;
    reasons.push('partial-tags');
    if (tagMatches / req.length < 0.5) riskFlags.push('low-tag-coverage');
  } else {
    riskFlags.push('zero-tag-coverage');
  }

  // Completion rate influence
  const completionRate = (user.completionRate ?? 50) / 100; // default midpoint
  completionScore = W.completionRate * completionRate;
  raw += completionScore;
  reasons.push('completion-rate');
  if (completionRate < 0.4) riskFlags.push('low-completion-rate');

  // Engagement hours last 7 days
  const engagement = Math.min((user.hoursActiveLast7d ?? 0) / 20, 1); // cap at 20 hours
  engagementScore = W.engagement * engagement;
  raw += engagementScore;
  reasons.push('recent-engagement');
  if (engagement < 0.2) riskFlags.push('low-engagement');

  // Screen-out historical penalty
  const so = survey.screenOutRate ?? 0.5; // default median
  const penaltyFactor = 1 - Math.min(so, 0.9); // high screen-out reduces probability
  const rawBeforePenalty = raw;
  raw = raw * penaltyFactor;
  if (so > 0.6) riskFlags.push('high-screen-out');
  reasons.push('screen-out-adjust');

  // Normalize score 0-100 and probability 0-1 using simple cap
  const score = Math.min(Math.round(raw), 100);
  const probability = Math.min(raw / 100, 1);
  const base: MatchProbability = {
    surveyId: survey.id,
    userId: user.id,
    probability,
    score,
    reasons,
    riskFlags
  };
  if (!includeBreakdown) return base;
  return {
    ...base,
    breakdown: {
      country: countryScore,
      age: ageScore,
      tags: tagScore,
      completionRate: completionScore,
      engagement: engagementScore,
      screenOutPenaltyFactor: penaltyFactor,
      rawBeforePenalty
    }
  };
}

export function routeSurveys(user: UserProfile, surveys: SurveyMeta[]): RouteResult {
  const minScore = ACTIVE_WEIGHTS.minScoreThreshold;
  const matches = surveys.map(s => predictSurveyMatch(user, s) as MatchProbability)
    .filter(m => m.score >= minScore)
    .sort((a, b) => b.score - a.score);
  return { userId: user.id, generatedAt: Date.now(), matches };
}

export function explainScreenOut(user: UserProfile, survey: SurveyMeta): string[] {
  const result = predictSurveyMatch(user, survey);
  const explanations: string[] = [];
  if (result.riskFlags.includes('country-mismatch')) explanations.push('Country mismatch');
  if (result.riskFlags.includes('age-range')) explanations.push('Outside target age range');
  if (result.riskFlags.includes('zero-tag-coverage')) explanations.push('Missing required experience/interests');
  if (result.riskFlags.includes('low-completion-rate')) explanations.push('Low historical completion rate');
  if (result.riskFlags.includes('high-screen-out')) explanations.push('Survey historically screens out many participants');
  if (explanations.length === 0) explanations.push('No major risk flags detected');
  return explanations;
}

// Event integration stub (lazy init to avoid hard dependency cycles)
export interface EventPublisher {
  publish: (type: string, payload: any) => void;
}

let publisher: EventPublisher | null = null;
export function attachPublisher(p: EventPublisher) { publisher = p; }

// In-memory metrics accumulator (non-persistent, reset on process restart)
interface MetricsState {
  totalMatches: number;
  totalRoutes: number;
  sumScores: number;
  sumProbabilities: number;
  riskFlagCounts: Record<string, number>;
}
const METRICS: MetricsState = {
  totalMatches: 0,
  totalRoutes: 0,
  sumScores: 0,
  sumProbabilities: 0,
  riskFlagCounts: {}
};

// Rolling window (last N matches) metrics
const _rollingCapacityRaw = process.env.QF_ROLLING_CAPACITY || '100';
let ROLLING_CAPACITY = parseInt(_rollingCapacityRaw);
if (Number.isNaN(ROLLING_CAPACITY)) {
  console.warn(`[QualifyFirst] Invalid QF_ROLLING_CAPACITY value "${_rollingCapacityRaw}", falling back to default (100).`);
  ROLLING_CAPACITY = 100;
}
interface RollingEntry { score: number; probability: number; riskFlags: string[]; }
const ROLLING: RollingEntry[] = [];

export function getRollingMetrics() {
  const count = ROLLING.length;
  let sumScore = 0; let sumProb = 0; const rf: Record<string, number> = {};
  for (const e of ROLLING) {
    sumScore += e.score; sumProb += e.probability;
    e.riskFlags.forEach(f => { rf[f] = (rf[f] || 0) + 1; });
  }
  return {
    windowSize: ROLLING_CAPACITY,
    count,
    averageScore: count ? sumScore / count : 0,
    averageProbability: count ? sumProb / count : 0,
    riskFlagCounts: rf
  };
}

export function getRollingMetricsWindow(size: number) {
  const n = Math.min(size, ROLLING.length);
  const slice = ROLLING.slice(-n);
  let sumScore = 0; let sumProb = 0; const rf: Record<string, number> = {};
  for (const e of slice) {
    sumScore += e.score; sumProb += e.probability;
    e.riskFlags.forEach(f => { rf[f] = (rf[f] || 0) + 1; });
  }
  return {
    requestedSize: size,
    actualSize: n,
    averageScore: n ? sumScore / n : 0,
    averageProbability: n ? sumProb / n : 0,
    riskFlagCounts: rf
  };
}

export function getMetrics() {
  return {
    totalMatches: METRICS.totalMatches,
    totalRoutes: METRICS.totalRoutes,
    averageScore: METRICS.totalMatches ? METRICS.sumScores / METRICS.totalMatches : 0,
    averageProbability: METRICS.totalMatches ? METRICS.sumProbabilities / METRICS.totalMatches : 0,
    riskFlagCounts: { ...METRICS.riskFlagCounts }
  };
}

export function resetMetrics() {
  METRICS.totalMatches = 0;
  METRICS.totalRoutes = 0;
  METRICS.sumScores = 0;
  METRICS.sumProbabilities = 0;
  METRICS.riskFlagCounts = {};
  ROLLING.length = 0;
}

export function publishRouteResult(route: RouteResult) {
  METRICS.totalRoutes += 1;
  // Each match also contributes to score/prob aggregates
  route.matches.forEach(m => {
    METRICS.totalMatches += 1;
    METRICS.sumScores += m.score;
    METRICS.sumProbabilities += m.probability;
    m.riskFlags.forEach(f => { METRICS.riskFlagCounts[f] = (METRICS.riskFlagCounts[f] || 0) + 1; });
    ROLLING.push({ score: m.score, probability: m.probability, riskFlags: m.riskFlags });
    if (ROLLING.length > ROLLING_CAPACITY) ROLLING.shift();
  });
  publisher?.publish('survey.route.generated', { weightVersion: WEIGHT_VERSION, ts: Date.now(), route });
}

export function publishMatch(result: MatchProbability | MatchBreakdown) {
  METRICS.totalMatches += 1;
  METRICS.sumScores += result.score;
  METRICS.sumProbabilities += result.probability;
  result.riskFlags.forEach(f => { METRICS.riskFlagCounts[f] = (METRICS.riskFlagCounts[f] || 0) + 1; });
  ROLLING.push({ score: result.score, probability: result.probability, riskFlags: result.riskFlags });
  if (ROLLING.length > ROLLING_CAPACITY) ROLLING.shift();
  publisher?.publish('survey.match.predicted', { weightVersion: WEIGHT_VERSION, ts: Date.now(), match: result });
}
