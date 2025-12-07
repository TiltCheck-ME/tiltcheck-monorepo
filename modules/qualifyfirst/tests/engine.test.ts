import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  predictSurveyMatch,
  routeSurveys,
  routeSurveysWithAI,
  explainScreenOut,
  attachPublisher,
  publishRouteResult,
  publishMatch,
  type UserProfile,
  type SurveyMeta,
  type EventPublisher,
} from '../src/engine';

describe('QualifyFirst Engine', () => {
  describe('predictSurveyMatch', () => {
    it('should match user with perfect country match', () => {
      const user: UserProfile = {
        id: 'user1',
        country: 'US',
        age: 30,
        tags: [],
        hoursActiveLast7d: 10,
        completionRate: 80,
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        country: 'US',
        minAge: 18,
        maxAge: 65,
        requiredTags: [],
        estMinutes: 10,
        payoutUsd: 5.0,
        screenOutRate: 0.3,
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.surveyId).toBe('survey1');
      expect(result.userId).toBe('user1');
      expect(result.probability).toBeGreaterThan(0);
      expect(result.score).toBeGreaterThan(0);
      expect(result.reasons).toContain('country-match');
      expect(result.reasons).toContain('age-range-ok');
    });

    it('should flag country mismatch', () => {
      const user: UserProfile = {
        id: 'user1',
        country: 'UK',
        age: 30,
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        country: 'US',
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.riskFlags).toContain('country-mismatch');
    });

    it('should match user with no country restriction', () => {
      const user: UserProfile = {
        id: 'user1',
        country: 'CA',
        age: 25,
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        // No country specified - global survey
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.reasons).toContain('country-match');
      expect(result.riskFlags).not.toContain('country-mismatch');
    });

    it('should flag age range violations - too young', () => {
      const user: UserProfile = {
        id: 'user1',
        age: 16,
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        minAge: 18,
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.riskFlags).toContain('age-range');
    });

    it('should flag age range violations - too old', () => {
      const user: UserProfile = {
        id: 'user1',
        age: 70,
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        maxAge: 65,
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.riskFlags).toContain('age-range');
    });

    it('should match user in valid age range', () => {
      const user: UserProfile = {
        id: 'user1',
        age: 30,
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        minAge: 18,
        maxAge: 65,
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.reasons).toContain('age-range-ok');
      expect(result.riskFlags).not.toContain('age-range');
    });

    it('should handle all required tags matched', () => {
      const user: UserProfile = {
        id: 'user1',
        tags: ['gaming', 'tech', 'sports'],
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        requiredTags: ['gaming', 'tech'],
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.reasons).toContain('all-tags');
      expect(result.riskFlags).not.toContain('zero-tag-coverage');
    });

    it('should handle partial tag matches', () => {
      const user: UserProfile = {
        id: 'user1',
        tags: ['gaming'],
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        requiredTags: ['gaming', 'tech'],
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.reasons).toContain('partial-tags');
    });

    it('should flag low tag coverage', () => {
      const user: UserProfile = {
        id: 'user1',
        tags: ['gaming'],
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        requiredTags: ['gaming', 'tech', 'sports', 'finance'],
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.riskFlags).toContain('low-tag-coverage');
    });

    it('should flag zero tag coverage', () => {
      const user: UserProfile = {
        id: 'user1',
        tags: ['cooking'],
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        requiredTags: ['gaming', 'tech'],
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.riskFlags).toContain('zero-tag-coverage');
    });

    it('should handle surveys with no required tags', () => {
      const user: UserProfile = {
        id: 'user1',
        tags: ['gaming'],
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        requiredTags: [],
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.reasons).toContain('no-required-tags');
    });

    it('should factor in high completion rate', () => {
      const user: UserProfile = {
        id: 'user1',
        completionRate: 90,
      };

      const survey: SurveyMeta = {
        id: 'survey1',
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.reasons).toContain('completion-rate');
      expect(result.riskFlags).not.toContain('low-completion-rate');
    });

    it('should flag low completion rate', () => {
      const user: UserProfile = {
        id: 'user1',
        completionRate: 30,
      };

      const survey: SurveyMeta = {
        id: 'survey1',
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.riskFlags).toContain('low-completion-rate');
    });

    it('should use default completion rate when not provided', () => {
      const user: UserProfile = {
        id: 'user1',
        // no completionRate
      };

      const survey: SurveyMeta = {
        id: 'survey1',
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.reasons).toContain('completion-rate');
      // Default is 50%, which should not trigger low-completion-rate flag
      expect(result.riskFlags).not.toContain('low-completion-rate');
    });

    it('should factor in high engagement', () => {
      const user: UserProfile = {
        id: 'user1',
        hoursActiveLast7d: 15,
      };

      const survey: SurveyMeta = {
        id: 'survey1',
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.reasons).toContain('recent-engagement');
      expect(result.riskFlags).not.toContain('low-engagement');
    });

    it('should flag low engagement', () => {
      const user: UserProfile = {
        id: 'user1',
        hoursActiveLast7d: 1,
      };

      const survey: SurveyMeta = {
        id: 'survey1',
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.riskFlags).toContain('low-engagement');
    });

    it('should cap engagement at 20 hours', () => {
      const user: UserProfile = {
        id: 'user1',
        hoursActiveLast7d: 100, // Very high
      };

      const survey: SurveyMeta = {
        id: 'survey1',
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.reasons).toContain('recent-engagement');
      // Score should still be reasonable, not overflow
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should flag high screen-out rate', () => {
      const user: UserProfile = {
        id: 'user1',
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        screenOutRate: 0.7,
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.riskFlags).toContain('high-screen-out');
      expect(result.reasons).toContain('screen-out-adjust');
    });

    it('should handle surveys with default screen-out rate', () => {
      const user: UserProfile = {
        id: 'user1',
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        // no screenOutRate
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.reasons).toContain('screen-out-adjust');
      // Default is 0.5, which should not trigger high-screen-out flag
      expect(result.riskFlags).not.toContain('high-screen-out');
    });

    it('should normalize score to 0-100 range', () => {
      const user: UserProfile = {
        id: 'user1',
        country: 'US',
        age: 30,
        tags: ['gaming', 'tech'],
        completionRate: 100,
        hoursActiveLast7d: 20,
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        country: 'US',
        minAge: 18,
        maxAge: 65,
        requiredTags: ['gaming', 'tech'],
        screenOutRate: 0.1, // Low screen-out
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should normalize probability to 0-1 range', () => {
      const user: UserProfile = {
        id: 'user1',
        country: 'US',
        age: 30,
        tags: ['gaming', 'tech'],
        completionRate: 100,
        hoursActiveLast7d: 20,
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        country: 'US',
        minAge: 18,
        maxAge: 65,
        requiredTags: ['gaming', 'tech'],
        screenOutRate: 0.1,
      };

      const result = predictSurveyMatch(user, survey);

      expect(result.probability).toBeGreaterThanOrEqual(0);
      expect(result.probability).toBeLessThanOrEqual(1);
    });
  });

  describe('routeSurveys', () => {
    it('should route multiple surveys for a user', () => {
      const user: UserProfile = {
        id: 'user1',
        country: 'US',
        age: 30,
        tags: ['gaming'],
        completionRate: 80,
        hoursActiveLast7d: 10,
      };

      const surveys: SurveyMeta[] = [
        {
          id: 'survey1',
          country: 'US',
          requiredTags: ['gaming'],
          screenOutRate: 0.2,
        },
        {
          id: 'survey2',
          country: 'UK',
          requiredTags: ['tech'],
          screenOutRate: 0.5,
        },
        {
          id: 'survey3',
          country: 'US',
          requiredTags: [],
          screenOutRate: 0.3,
        },
      ];

      const result = routeSurveys(user, surveys);

      expect(result.userId).toBe('user1');
      expect(result.generatedAt).toBeGreaterThan(0);
      expect(result.matches).toBeDefined();
      expect(Array.isArray(result.matches)).toBe(true);
    });

    it('should filter out low-scoring matches (below 30)', () => {
      const user: UserProfile = {
        id: 'user1',
        country: 'US',
        age: 70, // Too old for survey
        completionRate: 10, // Very low
        hoursActiveLast7d: 0, // No engagement
      };

      const surveys: SurveyMeta[] = [
        {
          id: 'survey1',
          country: 'UK', // Mismatch
          minAge: 18,
          maxAge: 65, // Age mismatch
          requiredTags: ['gaming', 'tech'], // No tag match
          screenOutRate: 0.9, // Very high screen-out
        },
      ];

      const result = routeSurveys(user, surveys);

      // This should have a very low score and be filtered out
      expect(result.matches.length).toBe(0);
    });

    it('should sort matches by score (highest first)', () => {
      const user: UserProfile = {
        id: 'user1',
        country: 'US',
        age: 30,
        tags: ['gaming', 'tech'],
        completionRate: 80,
        hoursActiveLast7d: 10,
      };

      const surveys: SurveyMeta[] = [
        {
          id: 'survey1',
          country: 'UK', // Lower match
          screenOutRate: 0.7,
        },
        {
          id: 'survey2',
          country: 'US', // Better match
          requiredTags: ['gaming'],
          screenOutRate: 0.2,
        },
        {
          id: 'survey3',
          country: 'US', // Best match
          requiredTags: ['gaming', 'tech'],
          screenOutRate: 0.1,
        },
      ];

      const result = routeSurveys(user, surveys);

      // Verify sorting
      for (let i = 0; i < result.matches.length - 1; i++) {
        expect(result.matches[i].score).toBeGreaterThanOrEqual(
          result.matches[i + 1].score
        );
      }
    });

    it('should handle empty survey list', () => {
      const user: UserProfile = {
        id: 'user1',
      };

      const result = routeSurveys(user, []);

      expect(result.matches).toHaveLength(0);
    });
  });

  describe('routeSurveysWithAI', () => {
    it('should fallback to heuristic routing when AI client is unavailable', async () => {
      const user: UserProfile = {
        id: 'user1',
        country: 'US',
        age: 30,
        tags: ['gaming'],
        completionRate: 80,
        hoursActiveLast7d: 10,
      };

      const surveys: SurveyMeta[] = [
        {
          id: 'survey1',
          country: 'US',
          requiredTags: ['gaming'],
          screenOutRate: 0.2,
        },
      ];

      const result = await routeSurveysWithAI(user, surveys);

      expect(result.userId).toBe('user1');
      expect(result.matches).toBeDefined();
      expect(result.matches.length).toBeGreaterThan(0);
      // Should not have AI enhancement when client is unavailable
      expect(result.aiNextBestAction).toBeUndefined();
    });

    it('should handle empty survey list with AI', async () => {
      const user: UserProfile = {
        id: 'user1',
      };

      const result = await routeSurveysWithAI(user, []);

      expect(result.matches).toHaveLength(0);
    });
  });

  describe('explainScreenOut', () => {
    it('should explain country mismatch', () => {
      const user: UserProfile = {
        id: 'user1',
        country: 'UK',
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        country: 'US',
      };

      const explanations = explainScreenOut(user, survey);

      expect(explanations).toContain('Country mismatch');
    });

    it('should explain age range issues', () => {
      const user: UserProfile = {
        id: 'user1',
        age: 16,
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        minAge: 18,
        maxAge: 65,
      };

      const explanations = explainScreenOut(user, survey);

      expect(explanations).toContain('Outside target age range');
    });

    it('should explain missing required tags', () => {
      const user: UserProfile = {
        id: 'user1',
        tags: ['cooking'],
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        requiredTags: ['gaming', 'tech'],
      };

      const explanations = explainScreenOut(user, survey);

      expect(explanations).toContain('Missing required experience/interests');
    });

    it('should explain low completion rate', () => {
      const user: UserProfile = {
        id: 'user1',
        completionRate: 20,
      };

      const survey: SurveyMeta = {
        id: 'survey1',
      };

      const explanations = explainScreenOut(user, survey);

      expect(explanations).toContain('Low historical completion rate');
    });

    it('should explain high screen-out rate', () => {
      const user: UserProfile = {
        id: 'user1',
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        screenOutRate: 0.8,
      };

      const explanations = explainScreenOut(user, survey);

      expect(explanations).toContain(
        'Survey historically screens out many participants'
      );
    });

    it('should provide "no major risk flags" when everything is good', () => {
      const user: UserProfile = {
        id: 'user1',
        country: 'US',
        age: 30,
        tags: ['gaming', 'tech'],
        completionRate: 80,
        hoursActiveLast7d: 10,
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        country: 'US',
        minAge: 18,
        maxAge: 65,
        requiredTags: ['gaming', 'tech'],
        screenOutRate: 0.3,
      };

      const explanations = explainScreenOut(user, survey);

      expect(explanations).toContain('No major risk flags detected');
    });

    it('should provide multiple explanations when multiple issues exist', () => {
      const user: UserProfile = {
        id: 'user1',
        country: 'UK',
        age: 16,
        tags: [],
        completionRate: 20,
      };

      const survey: SurveyMeta = {
        id: 'survey1',
        country: 'US',
        minAge: 18,
        requiredTags: ['gaming'],
        screenOutRate: 0.8,
      };

      const explanations = explainScreenOut(user, survey);

      expect(explanations.length).toBeGreaterThan(1);
      expect(explanations).toContain('Country mismatch');
      expect(explanations).toContain('Outside target age range');
      expect(explanations).toContain('Missing required experience/interests');
      expect(explanations).toContain('Low historical completion rate');
      expect(explanations).toContain(
        'Survey historically screens out many participants'
      );
    });
  });

  describe('Event Publisher Integration', () => {
    it('should attach and use event publisher for route results', () => {
      const publishedEvents: Array<{ type: string; payload: any }> = [];
      const mockPublisher: EventPublisher = {
        publish: (type: string, payload: any) => {
          publishedEvents.push({ type, payload });
        },
      };

      attachPublisher(mockPublisher);

      const user: UserProfile = {
        id: 'user1',
        country: 'US',
      };

      const result = routeSurveys(user, []);

      publishRouteResult(result);

      expect(publishedEvents).toHaveLength(1);
      expect(publishedEvents[0].type).toBe('survey.route.generated');
      expect(publishedEvents[0].payload.userId).toBe('user1');
    });

    it('should publish match predictions', () => {
      const publishedEvents: Array<{ type: string; payload: any }> = [];
      const mockPublisher: EventPublisher = {
        publish: (type: string, payload: any) => {
          publishedEvents.push({ type, payload });
        },
      };

      attachPublisher(mockPublisher);

      const user: UserProfile = {
        id: 'user1',
      };

      const survey: SurveyMeta = {
        id: 'survey1',
      };

      const match = predictSurveyMatch(user, survey);

      publishMatch(match);

      expect(publishedEvents).toHaveLength(1);
      expect(publishedEvents[0].type).toBe('survey.match.predicted');
      expect(publishedEvents[0].payload.surveyId).toBe('survey1');
      expect(publishedEvents[0].payload.userId).toBe('user1');
    });

    it('should handle publishing without attached publisher', () => {
      // Create a null publisher
      const nullPublisher: EventPublisher | null = null;

      const user: UserProfile = {
        id: 'user1',
      };

      const result = routeSurveys(user, []);

      // Should not throw error when publisher is not attached
      expect(() => publishRouteResult(result)).not.toThrow();
    });
  });
});
