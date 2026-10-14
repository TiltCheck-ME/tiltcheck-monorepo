// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13

import { TRIVIA_QUESTION_BANK, type SharedTriviaQuestion, type TriviaAnswerKey } from '@tiltcheck/shared';

const CHOICE_KEYS: TriviaAnswerKey[] = ['A', 'B', 'C', 'D'];

export type PracticeChoice = {
  key: TriviaAnswerKey;
  text: string;
};

export type PracticeQuestion = {
  id: string;
  question: string;
  choices: PracticeChoice[];
};

export type PracticeReveal = {
  answer: TriviaAnswerKey;
  explanation: string;
  correct: boolean;
};

function flattenBank(): SharedTriviaQuestion[] {
  return Object.values(TRIVIA_QUESTION_BANK).flat();
}

function toPublicQuestion(source: SharedTriviaQuestion): PracticeQuestion {
  return {
    id: source.id,
    question: source.text,
    choices: CHOICE_KEYS.filter((key) => Boolean(source.choices[key])).map((key) => ({
      key,
      text: source.choices[key],
    })),
  };
}

export function nextPracticeQuestion(excludeId?: string): PracticeQuestion {
  const pool = flattenBank();
  const filtered = excludeId ? pool.filter((item) => item.id !== excludeId) : pool;
  const pickFrom = filtered.length > 0 ? filtered : pool;
  const picked = pickFrom[Math.floor(Math.random() * pickFrom.length)];
  return toPublicQuestion(picked);
}

export function revealPracticeChoice(id: string, selected: TriviaAnswerKey): PracticeReveal | null {
  const source = flattenBank().find((item) => item.id === id);
  if (!source) {
    return null;
  }
  return {
    answer: source.answer,
    explanation: source.explanation,
    correct: source.answer === selected,
  };
}
