/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { RiskQuizQuestion } from '@tiltcheck/types';

/**
 * Shared Risk Assessment Quiz Questions
 * Used to suggest settings (Conservative, Moderate, Degen)
 */

export const ONBOARDING_QUESTIONS: RiskQuizQuestion[] = [
  {
    id: 'tilt_trigger',
    text: "How do you react when you've lost 15% of your session balance?",
    options: [
      { label: "STOP IMMEDIATELY.", value: 'stop', riskWeight: -1 },
      { label: "Take a 15-minute walk.", value: 'break', riskWeight: -0.5 },
      { label: "Increase bet size to win it back fast.", value: 'chase', riskWeight: 1 },
      { label: "Just another day in the arena.", value: 'neutral', riskWeight: 0.5 }
    ]
  },
  {
    id: 'squad_vibe',
    text: "How often do you participate in high-intensity cluster drops (trivia, giveaways)?",
    options: [
      { label: "Rarely, I prefer slow surgical play.", value: 'solo', riskWeight: -0.5 },
      { label: "Occasionally with the squad.", value: 'group', riskWeight: 0 },
      { label: "I LIVE FOR THE HYPE. Notification squad.", value: 'hype', riskWeight: 1 }
    ]
  },
  {
    id: 'limit_preference',
    text: "What kind of 'Emergency Brake' do you prefer?",
    options: [
      { label: "Hard lock. Don't let me bet if I'm tilting.", value: 'strict', riskWeight: -1 },
      { label: "Just a nudge. I'll listen... maybe.", value: 'soft', riskWeight: 0.5 },
      { label: "No locks. I trust my math.", value: 'none', riskWeight: 1 }
    ]
  }
];

/**
 * Calculates a suggested risk level based on quiz results
 */
export function calculateSuggestedRisk(results: Record<string, number>): 'conservative' | 'moderate' | 'degen' {
  const values = Object.values(results);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  
  if (avg <= -0.5) return 'conservative';
  if (avg >= 0.5) return 'degen';
  return 'moderate';
}
