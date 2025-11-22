# QualifyFirst Module (Phase 1)

Deterministic survey pre-screening & routing heuristics for TiltCheck.

## Goals
- Predict likelihood a user completes a survey BEFORE redirect.
- Reduce screen-outs & wasted clicks.
- Provide transparent reasons and risk flags (non-custodial, no suppression of legitimate exclusion criteria).

## Non-Goals
- Bypassing legitimate compliance checks.
- Guaranteeing completion or payout.
- Storing sensitive user PII (keep profiles minimal).

## API (Internal Functions)
```ts
predictSurveyMatch(user: UserProfile, survey: SurveyMeta): MatchProbability
routeSurveys(user: UserProfile, surveys: SurveyMeta[]): RouteResult
explainScreenOut(user: UserProfile, survey: SurveyMeta): string[]
attachPublisher(p: EventPublisher)
publishRouteResult(route: RouteResult)
publishMatch(result: MatchProbability)
```

## Types
```ts
interface UserProfile { id: string; country?: string; age?: number; tags?: string[]; hoursActiveLast7d?: number; completionRate?: number; }
interface SurveyMeta { id: string; country?: string; minAge?: number; maxAge?: number; requiredTags?: string[]; estMinutes?: number; payoutUsd?: number; screenOutRate?: number; }
interface MatchProbability { surveyId: string; userId: string; probability: number; score: number; reasons: string[]; riskFlags: string[]; }
interface RouteResult { userId: string; generatedAt: number; matches: MatchProbability[]; }
```

## Event Model
- Emits `survey.match.predicted` for single predictions.
- Emits `survey.route.generated` for batch routing decisions.

## Heuristic Weighting (Initial)
| Factor | Weight | Notes |
|--------|--------|-------|
| Country match | 20 | +full if match/unspecified |
| Age range | 10 | + if within range |
| Required tags | 30 | proportional coverage |
| Completion rate | 25 | scaled by % |
| Engagement (hours last 7d) | 15 | capped at 20h |
| Screen-out penalty | 35 | multiplicative reduction |

## Expansion Ideas (Phase 2+)
- Adaptive weights based on historical accuracy.
- Integrate trust signals (consistency, false report rate).
- Survey clustering to suggest alternates when top choice fails.

## Anti-Abuse Safeguards
- All reasons and risk flags exposed (no silent filtering).
- High screen-out flagged, not hidden.
- No attempts to spoof required qualifications; low coverage flagged.

## Usage Example
```ts
import { predictSurveyMatch, routeSurveys } from '@tiltcheck/qualifyfirst';
const user = { id: 'u1', country: 'US', age: 29, tags: ['crypto','gaming'], completionRate: 72, hoursActiveLast7d: 8 };
const surveys = [ { id: 's1', country: 'US', requiredTags: ['gaming'], screenOutRate: 0.4 }, { id: 's2', requiredTags: ['finance'], screenOutRate: 0.7 } ];
const route = routeSurveys(user, surveys);
console.log(route.matches);
```

## Build
```bash
pnpm --filter @tiltcheck/qualifyfirst build
```

## Status
Phase 1 heuristic engine scaffolded. Not yet wired into an external service. Ready for integration & test harness.
