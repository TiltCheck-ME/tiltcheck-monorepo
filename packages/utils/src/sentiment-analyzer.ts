/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Sentiment Analyzer Utility
 * 
 * Identifies 'red-flag' phrases in chat interfaces to trigger behavioral interventions.
 * Categorized by the 'Stage of the Rinse'.
 */

export type SentimentStage = 'EUPHORIA' | 'DESPERATION' | 'BREAKING_POINT' | 'FINAL_EXIT' | 'NEUTRAL';

export interface SentimentAnalysisResult {
  stage: SentimentStage;
  score: number; // 0-100 (weighted risk)
  detectedKeywords: string[];
}

const CRISIS_DICTIONARY: Record<SentimentStage, string[]> = {
  EUPHORIA: [
    "i can't lose", "god run", "infinite money glitch", "never ending", 
    "too easy", "printing", "maxing", "send it all", "free money", "unbeatable"
  ],
  DESPERATION: [
    "need it back", "chasing", "revenge", "so rigged", "one hit to break even", 
    "last deposit", "please just one", "recovery", "break even", "force a win"
  ],
  BREAKING_POINT: [
    "i'm fucked", "ruined", "lost it all", "why did i", "idiot", 
    "stupid", "kill me", "it's over", "everything is gone", "disaster", "liquidated"
  ],
  FINAL_EXIT: [
    "close my account", "i'm done", "ban me", "self exclude", 
    "rehab", "delete this", "help me stop", "i can't do this anymore", "stop me"
  ],
  NEUTRAL: []
};

/**
 * Analyzes a message string for gambling-related crisis sentiment.
 */
export function analyzeSentiment(text: string): SentimentAnalysisResult {
  const normalized = text.toLowerCase();
  const result: SentimentAnalysisResult = {
    stage: 'NEUTRAL',
    score: 0,
    detectedKeywords: []
  };

  // Check each stage for keyword matches
  for (const [stage, keywords] of Object.entries(CRISIS_DICTIONARY)) {
    if (stage === 'NEUTRAL') continue;

    const matched = keywords.filter(k => normalized.includes(k));
    if (matched.length > 0) {
      // Prioritize the most severe stage detected
      const stagePriority = {
        'FINAL_EXIT': 4,
        'BREAKING_POINT': 3,
        'DESPERATION': 2,
        'EUPHORIA': 1,
        'NEUTRAL': 0
      };

      const currentStagePriority = stagePriority[result.stage as keyof typeof stagePriority] || 0;
      const newStagePriority = stagePriority[stage as SentimentStage];

      if (newStagePriority > currentStagePriority) {
        result.stage = stage as SentimentStage;
        result.detectedKeywords = matched;
        
        // Base scores for stages
        const baseScores = {
          'EUPHORIA': 30,
          'DESPERATION': 60,
          'BREAKING_POINT': 85,
          'FINAL_EXIT': 100,
          'NEUTRAL': 0
        };
        
        // Boost score based on number of keywords matched
        const base = baseScores[stage as SentimentStage] || 0;
        result.score = Math.min(100, base + (matched.length * 5));
      }
    }
  }

  return result;
}
