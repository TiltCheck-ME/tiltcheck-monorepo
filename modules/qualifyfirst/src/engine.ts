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

/** Basic weight constants */
const WEIGHTS = {
  country: 20,
  age: 10,
  tags: 30,
  completionRate: 25,
  engagement: 15,
  screenOutPenalty: 35
};

export function predictSurveyMatch(user: UserProfile, survey: SurveyMeta): MatchProbability {
  const reasons: string[] = [];
  const riskFlags: string[] = [];
  let raw = 0;

  // Country match
  if (!survey.country || survey.country === user.country) {
    raw += WEIGHTS.country;
    reasons.push('country-match');
  } else {
    riskFlags.push('country-mismatch');
  }

  // Age bracket
  if ((survey.minAge && user.age && user.age < survey.minAge) || (survey.maxAge && user.age && user.age > survey.maxAge)) {
    riskFlags.push('age-range');
  } else {
    raw += WEIGHTS.age;
    reasons.push('age-range-ok');
  }

  // Tag coverage
  const req = survey.requiredTags || [];
  const userTags = user.tags || [];
  const tagMatches = req.filter(t => userTags.includes(t)).length;
  if (req.length === 0) {
    raw += WEIGHTS.tags * 0.5; // neutral bonus
    reasons.push('no-required-tags');
  } else if (tagMatches === req.length) {
    raw += WEIGHTS.tags;
    reasons.push('all-tags');
  } else if (tagMatches > 0) {
    raw += WEIGHTS.tags * (tagMatches / req.length);
    reasons.push('partial-tags');
    if (tagMatches / req.length < 0.5) riskFlags.push('low-tag-coverage');
  } else {
    riskFlags.push('zero-tag-coverage');
  }

  // Completion rate influence
  const completionRate = (user.completionRate ?? 50) / 100; // default midpoint
  raw += WEIGHTS.completionRate * completionRate;
  reasons.push('completion-rate');
  if (completionRate < 0.4) riskFlags.push('low-completion-rate');

  // Engagement hours last 7 days
  const engagement = Math.min((user.hoursActiveLast7d ?? 0) / 20, 1); // cap at 20 hours
  raw += WEIGHTS.engagement * engagement;
  reasons.push('recent-engagement');
  if (engagement < 0.2) riskFlags.push('low-engagement');

  // Screen-out historical penalty
  const so = survey.screenOutRate ?? 0.5; // default median
  const penaltyFactor = 1 - Math.min(so, 0.9); // high screen-out reduces probability
  raw = raw * penaltyFactor;
  if (so > 0.6) riskFlags.push('high-screen-out');
  reasons.push('screen-out-adjust');

  // Normalize score 0-100 and probability 0-1 using simple cap
  const score = Math.min(Math.round(raw), 100);
  const probability = Math.min(raw / 100, 1);

  return {
    surveyId: survey.id,
    userId: user.id,
    probability,
    score,
    reasons,
    riskFlags
  };
}

export function routeSurveys(user: UserProfile, surveys: SurveyMeta[]): RouteResult {
  const matches = surveys.map(s => predictSurveyMatch(user, s))
    .filter(m => m.score >= 30) // basic threshold to avoid poor matches initially
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

export function publishRouteResult(route: RouteResult) {
  publisher?.publish('survey.route.generated', route);
}

export function publishMatch(result: MatchProbability) {
  publisher?.publish('survey.match.predicted', result);
}
