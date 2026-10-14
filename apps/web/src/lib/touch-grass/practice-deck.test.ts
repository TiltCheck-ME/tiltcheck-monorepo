// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-13

import { describe, expect, it } from 'vitest';
import { nextPracticeQuestion } from './practice-deck';

describe('nextPracticeQuestion', () => {
  it('returns a public question without the answer', () => {
    const question = nextPracticeQuestion();

    expect(question.id).toEqual(expect.any(String));
    expect(question.id.length).toBeGreaterThan(0);
    expect(question.question).toEqual(expect.any(String));
    expect(question.question.length).toBeGreaterThan(0);
    expect(Array.isArray(question.choices)).toBe(true);
    expect(question.choices.length).toBeGreaterThanOrEqual(2);
    expect(question).not.toHaveProperty('answer');
    expect(Object.keys(question)).toEqual(['id', 'question', 'choices']);
  });
});
