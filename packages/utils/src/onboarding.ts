/* Copyright (c) 2026 TiltCheck. All rights reserved. */
import { RiskQuizQuestion } from '@tiltcheck/types';

/**
 * Shared Risk Assessment Quiz Questions
 * Used to suggest settings (Conservative, Moderate, Degen)
 */

export const ONBOARDING_QUESTIONS: RiskQuizQuestion[] = [
  {
    id: 'delusion_check',
    text: "Okay, hotshot. You're actually up 20%. What's the genius move?",
    options: [
      { label: "I'm out. A win is a win.", value: 'secure', riskWeight: -1 },
      { label: "Set a stop-loss at my entry. Playing with house money now.", value: 'protect', riskWeight: -0.5 },
      { label: "It's called a 'hot streak' for a reason. Let it ride.", value: 'streak', riskWeight: 0.5 },
      { label: "Double the bet. Scared money don't make money.", value: 'press', riskWeight: 1 }
    ]
  },
  {
    id: 'whats_your_damage',
    text: "Let's be honest, what's your usual 'strategy'?",
    options: [
      { label: "I'm a boring RTP nerd. I only play if the math is right.", value: 'analytical', riskWeight: -0.5 },
      { label: "I'm just here for a good time, but leaving with their money is better.", value: 'casual_profit', riskWeight: 0 },
      { label: "I chase bonus buys and hunt for those 1000x screen-caps.", value: 'thrill_seeker', riskWeight: 1 }
    ]
  },
  {
    id: 'the_leash',
    text: "This thing has a leash. How tight do you want it?",
    options: [
      { label: "If I'm tilting, lock me out. Save me from myself.", value: 'strict', riskWeight: -1 },
      { label: "Flash a warning. I'll probably ignore it, but at least I saw it.", value: 'nudge', riskWeight: 0.5 },
      { label: "No leash. I'm an adult. (Narrator: He was not.)", value: 'manual', riskWeight: 1 }
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
