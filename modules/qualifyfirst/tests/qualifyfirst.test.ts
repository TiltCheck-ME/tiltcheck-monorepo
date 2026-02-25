/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { QualifyFirstModule, qualifyFirst } from '../src/index.js';
import { eventRouter } from '@tiltcheck/event-router';

describe('QualifyFirst Module', () => {
  let module: QualifyFirstModule;

  beforeEach(() => {
    module = new QualifyFirstModule();
    eventRouter.clearHistory();
  });

  describe('User Profile Management', () => {
    it('should create a new user profile', async () => {
      const profile = await module.createProfile('user1', {
        hasPets: true,
        ownsCar: false,
        ageRange: '25-34',
      });

      expect(profile.userId).toBe('user1');
      expect(profile.traits.get('hasPets')).toBe(true);
      expect(profile.traits.get('ownsCar')).toBe(false);
      expect(profile.traits.get('ageRange')).toBe('25-34');
      expect(profile.completedSurveys).toEqual([]);
      expect(profile.failedScreeners).toEqual([]);

      // Check event was emitted
      const events = eventRouter.getHistory();
      expect(events.some((e: any) => e.type === 'survey.profile.created')).toBe(true);
    });

    it('should update existing user profile traits', async () => {
      await module.createProfile('user2', { hasPets: false });
      
      const updated = await module.updateUserTraits('user2', {
        hasPets: true,
        hasChildren: true,
      });

      expect(updated.traits.get('hasPets')).toBe(true);
      expect(updated.traits.get('hasChildren')).toBe(true);

      // Check event was emitted
      const events = eventRouter.getHistory();
      expect(events.some((e: any) => e.type === 'survey.profile.updated')).toBe(true);
    });

    it('should retrieve user profile', async () => {
      await module.createProfile('user3', { ageRange: '35-44' });
      
      const profile = module.getProfile('user3');
      expect(profile).toBeDefined();
      expect(profile?.userId).toBe('user3');
      expect(profile?.traits.get('ageRange')).toBe('35-44');
    });

    it('should return undefined for non-existent profile', () => {
      const profile = module.getProfile('nonexistent');
      expect(profile).toBeUndefined();
    });
  });

  describe('Survey Management', () => {
    it('should add a new survey', async () => {
      const survey = await module.addSurvey({
        title: 'Pet Owners Survey',
        description: 'Survey for pet owners',
        estimatedMinutes: 10,
        payoutUSD: 5.00,
        requiredTraits: { hasPets: true },
        excludedTraits: new Map(),
        source: 'partner',
      });

      expect(survey.id).toBeDefined();
      expect(survey.title).toBe('Pet Owners Survey');
      expect(survey.payoutUSD).toBe(5.00);
      expect(survey.requiredTraits.get('hasPets')).toBe(true);

      // Check event was emitted
      const events = eventRouter.getHistory();
      expect(events.some((e: any) => e.type === 'survey.added')).toBe(true);
    });
  });

  describe('Survey Matching', () => {
    beforeEach(async () => {
      // Create surveys
      await module.addSurvey({
        title: 'Pet Owners Survey',
        description: 'Survey for pet owners',
        estimatedMinutes: 10,
        payoutUSD: 5.00,
        requiredTraits: { hasPets: true },
        excludedTraits: new Map(),
        source: 'partner',
      });

      await module.addSurvey({
        title: 'Car Owners Survey',
        description: 'Survey for car owners',
        estimatedMinutes: 15,
        payoutUSD: 7.50,
        requiredTraits: { ownsCar: true },
        excludedTraits: { hasPets: true },
        source: 'affiliate',
      });

      await module.addSurvey({
        title: 'General Survey',
        description: 'Survey for everyone',
        estimatedMinutes: 5,
        payoutUSD: 2.00,
        requiredTraits: new Map(),
        excludedTraits: new Map(),
        source: 'user-submitted',
      });
    });

    it('should match surveys based on user profile - high match', async () => {
      await module.createProfile('user4', {
        hasPets: true,
        ownsCar: false,
      });

      const matches = await module.matchSurveys('user4');

      // Should match Pet Owners Survey with high probability
      const petSurvey = matches.find((m: any) => m.survey.title === 'Pet Owners Survey');
      expect(petSurvey).toBeDefined();
      expect(petSurvey?.matchLevel).toBe('high');
      expect(petSurvey?.matchProbability).toBe(100);

      // Should NOT match Car Owners Survey (excluded due to hasPets: true)
      const carSurvey = matches.find((m: any) => m.survey.title === 'Car Owners Survey');
      expect(carSurvey?.matchProbability).toBe(0);

      // Check event was emitted
      const events = eventRouter.getHistory();
      expect(events.some((e: any) => e.type === 'survey.matched')).toBe(true);
    });

    it('should sort matches by probability (highest first)', async () => {
      await module.createProfile('user5', {
        hasPets: true,
        ownsCar: false,
        ageRange: '25-34',
      });

      const matches = await module.matchSurveys('user5');

      // Matches should be sorted by probability
      for (let i = 0; i < matches.length - 1; i++) {
        expect(matches[i].matchProbability).toBeGreaterThanOrEqual(
          matches[i + 1].matchProbability
        );
      }
    });

    it('should throw error when matching surveys for non-existent profile', async () => {
      await expect(module.matchSurveys('nonexistent')).rejects.toThrow('User profile not found');
    });

    it('should account for previous screen-outs', async () => {
      const survey = await module.addSurvey({
        title: 'Medical Survey',
        description: 'Survey about medical topics',
        estimatedMinutes: 20,
        payoutUSD: 10.00,
        requiredTraits: { medicalComfort: true },
        excludedTraits: new Map(),
        source: 'partner',
      });

      await module.createProfile('user6', {
        medicalComfort: true,
      });

      // Record a screen-out for this survey
      await module.recordSurveyResult({
        surveyId: survey.id,
        userId: 'user6',
        status: 'screened-out',
        completedAt: Date.now(),
        screenOutReason: 'Did not meet age requirement',
      });

      // Match surveys - should reduce probability for previously failed survey
      const matches = await module.matchSurveys('user6');
      const medicalMatch = matches.find((m: any) => m.survey.id === survey.id);
      
      expect(medicalMatch?.matchProbability).toBeLessThan(100);
      expect(medicalMatch?.reasoning).toContain('⚠ Previously screened out of this survey');
    });
  });

  describe('Survey Results', () => {
    it('should record completed survey', async () => {
      const survey = await module.addSurvey({
        title: 'Test Survey',
        description: 'Test',
        estimatedMinutes: 10,
        payoutUSD: 5.00,
        requiredTraits: new Map(),
        excludedTraits: new Map(),
        source: 'partner',
      });

      await module.createProfile('user7');

      await module.recordSurveyResult({
        surveyId: survey.id,
        userId: 'user7',
        status: 'completed',
        completedAt: Date.now(),
        payout: 5.00,
      });

      const profile = module.getProfile('user7');
      expect(profile?.completedSurveys).toContain(survey.id);

      const stats = module.getUserStats('user7');
      expect(stats.totalCompleted).toBe(1);
      expect(stats.totalEarnings).toBe(5.00);
      expect(stats.completionRate).toBe(100);

      // Check event was emitted
      const events = eventRouter.getHistory();
      expect(events.some((e: any) => e.type === 'survey.result.recorded')).toBe(true);
    });

    it('should record screened-out survey', async () => {
      const survey = await module.addSurvey({
        title: 'Test Survey',
        description: 'Test',
        estimatedMinutes: 10,
        payoutUSD: 5.00,
        requiredTraits: new Map(),
        excludedTraits: new Map(),
        source: 'partner',
      });

      await module.createProfile('user8');

      await module.recordSurveyResult({
        surveyId: survey.id,
        userId: 'user8',
        status: 'screened-out',
        completedAt: Date.now(),
        screenOutReason: 'Age not in range',
      });

      const profile = module.getProfile('user8');
      expect(profile?.failedScreeners).toContain(survey.id);

      const stats = module.getUserStats('user8');
      expect(stats.totalScreenedOut).toBe(1);
      expect(stats.completionRate).toBe(0);
    });

    it('should calculate accurate user statistics', async () => {
      await module.createProfile('user9');

      // Add multiple survey results
      const survey1 = await module.addSurvey({
        title: 'Survey 1',
        description: 'Test 1',
        estimatedMinutes: 10,
        payoutUSD: 5.00,
        requiredTraits: new Map(),
        excludedTraits: new Map(),
        source: 'partner',
      });

      const survey2 = await module.addSurvey({
        title: 'Survey 2',
        description: 'Test 2',
        estimatedMinutes: 10,
        payoutUSD: 7.00,
        requiredTraits: new Map(),
        excludedTraits: new Map(),
        source: 'partner',
      });

      await module.recordSurveyResult({
        surveyId: survey1.id,
        userId: 'user9',
        status: 'completed',
        completedAt: Date.now(),
        payout: 5.00,
      });

      await module.recordSurveyResult({
        surveyId: survey2.id,
        userId: 'user9',
        status: 'completed',
        completedAt: Date.now(),
        payout: 7.00,
      });

      const stats = module.getUserStats('user9');
      expect(stats.totalCompleted).toBe(2);
      expect(stats.totalEarnings).toBe(12.00);
      expect(stats.completionRate).toBe(100);
    });
  });

  describe('Recommended Questions', () => {
    it('should return default questions for new users', () => {
      const questions = module.getRecommendedQuestions('newuser');
      
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.some((q: any) => q.includes('pets'))).toBe(true);
      expect(questions.some((q: any) => q.includes('car'))).toBe(true);
    });

    it('should only recommend questions for missing traits', async () => {
      await module.createProfile('user10', {
        hasPets: true,
        ownsCar: false,
      });

      const questions = module.getRecommendedQuestions('user10');
      
      // Should not recommend questions about pets or car
      expect(questions.some((q: any) => q.includes('pets'))).toBe(false);
      expect(questions.some((q: any) => q.includes('car'))).toBe(false);
      
      // Should recommend other questions
      expect(questions.some((q: any) => q.includes('children') || q.includes('age') || q.includes('medical'))).toBe(true);
    });
  });

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(qualifyFirst).toBeInstanceOf(QualifyFirstModule);
    });
  });
});
