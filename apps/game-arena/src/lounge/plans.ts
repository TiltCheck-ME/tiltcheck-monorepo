/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-28 */

export type LoungePlan = 'free' | 'pro' | 'streamer';

export const LOUNGE_PLAN_FLAGS: Record<LoungePlan, { enabled: boolean; includes: string[] }> = {
  free: {
    enabled: true,
    includes: ['lounge chat', 'presence', 'scorecards', 'peer flags'],
  },
  pro: {
    enabled: false,
    includes: ['full cross-site Logger history', 'monthly recap card', 'tax-year win/loss CSV', 'private side rooms', 'flair'],
  },
  streamer: {
    enabled: false,
    includes: ['trivia hosting', 'overlay session stats', 'breather timer', 'scorecard badge', 'Rain scheduling'],
  },
};

export function planEnabled(plan: LoungePlan): boolean {
  return LOUNGE_PLAN_FLAGS[plan].enabled;
}
