/**
 * QualifyFirst Module
 * AI-powered survey routing and screen-out avoidance
 * 
 * Features:
 * - User profile modeling based on behavior and demographics
 * - Survey matching algorithm to predict qualification likelihood
 * - Screen-out tracking and avoidance
 * - Quick popup questions for targeted matching
 * - Integration with survey platforms via events
 */

import { eventRouter } from '@tiltcheck/event-router';
import { randomUUID } from 'crypto';
import type { TiltCheckEvent } from '@tiltcheck/types';

// User profile traits (opt-in data)
export interface UserProfile {
  userId: string;
  traits: Map<string, string | number | boolean>;
  completedSurveys: string[];
  failedScreeners: string[];
  earningsUSD: number; // Total earnings from completed surveys
  createdAt: number;
  updatedAt: number;
}

// Survey definition
export interface Survey {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  payoutUSD: number;
  requiredTraits: Map<string, string | number | boolean> | Record<string, string | number | boolean>;
  excludedTraits: Map<string, string | number | boolean> | Record<string, string | number | boolean>;
  source: string; // 'affiliate' | 'partner' | 'user-submitted'
  createdAt: number;
}

// Survey match result
export interface SurveyMatch {
  survey: Survey;
  matchProbability: number; // 0-100
  matchLevel: 'high' | 'medium' | 'low';
  reasoning: string[];
}

// Survey completion result
export interface SurveyResult {
  surveyId: string;
  userId: string;
  status: 'completed' | 'screened-out' | 'abandoned';
  completedAt: number;
  payout?: number;
  screenOutReason?: string;
}

export class QualifyFirstModule {
  private profiles: Map<string, UserProfile> = new Map();
  private surveys: Map<string, Survey> = new Map();
  private surveyResults: Map<string, SurveyResult[]> = new Map();

  constructor() {
    // Subscribe to relevant events
    this.setupEventSubscriptions();
  }

  private setupEventSubscriptions(): void {
    // Listen for user profile updates from other modules
    eventRouter.subscribe(
      'user.profile.updated',
      async (event: TiltCheckEvent) => {
        const { userId, traits } = event.data as any;
        await this.updateUserTraits(userId, traits);
      },
      'qualifyfirst'
    );

    // Listen for survey completions
    eventRouter.subscribe(
      'survey.completed',
      async (event: TiltCheckEvent) => {
        const result = event.data as SurveyResult;
        await this.recordSurveyResult(result);
      },
      'qualifyfirst'
    );

    // Phase 1: Wire survey results to JustTheTip payouts
    eventRouter.subscribe(
      'survey.result.recorded',
      async (event: TiltCheckEvent) => {
        const { userId, status, payout } = event.data as any;
        
        // Only trigger payout for completed surveys with a positive payout
        if (status === 'completed' && payout && payout > 0) {
          await eventRouter.publish('tip.requested', 'qualifyfirst', {
            senderId: 'TREASURY', // Use dedicated treasury identity
            recipientId: userId,
            amount: payout,
            currency: 'USD',
            metadata: {
              source: 'qualifyfirst',
              surveyId: event.data.surveyId,
              type: 'payout'
            }
          }, userId);
          
          console.log(`[QualifyFirst] Triggered payout tip for user ${userId}: $${payout}`);
        }
      },
      'qualifyfirst'
    );
  }

  /**
   * Create or update user profile
   */
  async createProfile(userId: string, initialTraits?: Record<string, any>): Promise<UserProfile> {
    let profile = this.profiles.get(userId);
    
    if (!profile) {
      profile = {
        userId,
        traits: new Map(Object.entries(initialTraits || {})),
        completedSurveys: [],
        failedScreeners: [],
        earningsUSD: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.profiles.set(userId, profile);

      // Emit profile created event
      await eventRouter.publish('survey.profile.created', 'qualifyfirst', {
        userId,
        traits: Object.fromEntries(profile.traits),
      }, userId);
    } else {
      // Update existing profile
      if (initialTraits) {
        for (const [key, value] of Object.entries(initialTraits)) {
          profile.traits.set(key, value);
        }
        profile.updatedAt = Date.now();
      }
    }

    return profile;
  }

  /**
   * Update user traits
   */
  async updateUserTraits(userId: string, traits: Record<string, any>): Promise<UserProfile> {
    let profile = this.profiles.get(userId);
    
    if (!profile) {
      profile = await this.createProfile(userId, traits);
    } else {
      for (const [key, value] of Object.entries(traits)) {
        profile.traits.set(key, value);
      }
      profile.updatedAt = Date.now();

      // Emit profile updated event
      await eventRouter.publish('survey.profile.updated', 'qualifyfirst', {
        userId,
        traits: Object.fromEntries(profile.traits),
      }, userId);
    }

    return profile;
  }

  /**
   * Get user profile
   */
  getProfile(userId: string): UserProfile | undefined {
    return this.profiles.get(userId);
  }

  /**
   * Add a survey to the available pool
   */
  async addSurvey(survey: Omit<Survey, 'id' | 'createdAt'>): Promise<Survey> {
    const newSurvey: Survey = {
      ...survey,
      id: randomUUID(),
      createdAt: Date.now(),
      requiredTraits: new Map(Object.entries(survey.requiredTraits || {})),
      excludedTraits: new Map(Object.entries(survey.excludedTraits || {})),
    };

    this.surveys.set(newSurvey.id, newSurvey);

    // Emit survey added event
    await eventRouter.publish('survey.added', 'qualifyfirst', {
      surveyId: newSurvey.id,
      title: newSurvey.title,
      payout: newSurvey.payoutUSD,
    });

    return newSurvey;
  }

  /**
   * Match surveys to a user based on their profile
   */
  async matchSurveys(userId: string): Promise<SurveyMatch[]> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    const matches: SurveyMatch[] = [];

    for (const survey of this.surveys.values()) {
      const matchResult = this.calculateMatch(profile, survey);
      matches.push(matchResult);
    }

    // Sort by match probability (highest first)
    matches.sort((a, b) => b.matchProbability - a.matchProbability);

    // Emit survey matched event
    await eventRouter.publish('survey.matched', 'qualifyfirst', {
      userId,
      matchCount: matches.length,
      highMatches: matches.filter(m => m.matchLevel === 'high').length,
    }, userId);

    return matches;
  }

  /**
   * Calculate match probability between user profile and survey
   */
  private calculateMatch(profile: UserProfile, survey: Survey): SurveyMatch {
    let matchScore = 50; // Start at neutral
    const reasoning: string[] = [];

    // Normalize traits to Maps if they're Records
    const requiredTraits = survey.requiredTraits instanceof Map 
      ? survey.requiredTraits 
      : new Map(Object.entries(survey.requiredTraits));
    const excludedTraits = survey.excludedTraits instanceof Map 
      ? survey.excludedTraits 
      : new Map(Object.entries(survey.excludedTraits));

    // Check required traits
    let requiredMatches = 0;
    const requiredTotal = requiredTraits.size;

    for (const [key, value] of requiredTraits) {
      const userValue = profile.traits.get(key);
      if (userValue === value) {
        requiredMatches++;
        reasoning.push(`✓ Matches required trait: ${key}`);
      } else if (userValue === undefined) {
        reasoning.push(`? Missing trait: ${key}`);
      } else {
        reasoning.push(`✗ Does not match required trait: ${key}`);
      }
    }

    if (requiredTotal > 0) {
      matchScore = (requiredMatches / requiredTotal) * 100;
    }

    // Check excluded traits (disqualifiers)
    for (const [key, value] of excludedTraits) {
      const userValue = profile.traits.get(key);
      if (userValue === value) {
        matchScore = 0;
        reasoning.push(`✗ Excluded by trait: ${key}`);
        break;
      }
    }

    // Check historical screen-outs for similar surveys
    if (profile.failedScreeners.includes(survey.id)) {
      matchScore *= 0.5;
      reasoning.push(`⚠ Previously screened out of this survey`);
    }

    // Determine match level
    let matchLevel: 'high' | 'medium' | 'low';
    if (matchScore >= 75) {
      matchLevel = 'high';
    } else if (matchScore >= 40) {
      matchLevel = 'medium';
    } else {
      matchLevel = 'low';
    }

    return {
      survey,
      matchProbability: matchScore,
      matchLevel,
      reasoning,
    };
  }

  /**
   * Record survey result (completion or screen-out)
   */
  async recordSurveyResult(result: SurveyResult): Promise<void> {
    const profile = this.profiles.get(result.userId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    // Store result
    const userResults = this.surveyResults.get(result.userId) || [];
    userResults.push(result);
    this.surveyResults.set(result.userId, userResults);

    // Update profile based on result
    if (result.status === 'completed') {
      profile.completedSurveys.push(result.surveyId);
      // Add earnings to user's balance
      if (result.payout) {
        profile.earningsUSD += result.payout;
      }
    } else if (result.status === 'screened-out') {
      profile.failedScreeners.push(result.surveyId);
    }

    profile.updatedAt = Date.now();

    // Emit result recorded event
    await eventRouter.publish('survey.result.recorded', 'qualifyfirst', {
      userId: result.userId,
      surveyId: result.surveyId,
      status: result.status,
      payout: result.payout,
    }, result.userId);
  }

  /**
   * Get survey completion statistics for a user
   */
  getUserStats(userId: string): {
    totalCompleted: number;
    totalScreenedOut: number;
    totalAbandoned: number;
    totalEarnings: number;
    completionRate: number;
  } {
    const results = this.surveyResults.get(userId) || [];
    
    const totalCompleted = results.filter(r => r.status === 'completed').length;
    const totalScreenedOut = results.filter(r => r.status === 'screened-out').length;
    const totalAbandoned = results.filter(r => r.status === 'abandoned').length;
    const totalEarnings = results
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + (r.payout || 0), 0);
    
    const totalAttempts = results.length;
    const completionRate = totalAttempts > 0 ? (totalCompleted / totalAttempts) * 100 : 0;

    return {
      totalCompleted,
      totalScreenedOut,
      totalAbandoned,
      totalEarnings,
      completionRate,
    };
  }

  /**
   * Get recommended questions to improve profile matching
   */
  getRecommendedQuestions(userId: string): string[] {
    const profile = this.profiles.get(userId);
    if (!profile) {
      return [
        'Do you have pets?',
        'Do you own a car?',
        'Are you comfortable with medical surveys?',
        'What is your age range? (18-24, 25-34, 35-44, 45-54, 55+)',
        'Do you have children?',
      ];
    }

    const questions: string[] = [];
    
    // Suggest questions for commonly required traits that user hasn't answered
    const commonTraits = ['hasPets', 'ownsCar', 'hasChildren', 'ageRange', 'medicalComfort'];
    
    for (const trait of commonTraits) {
      if (!profile.traits.has(trait)) {
        switch (trait) {
          case 'hasPets':
            questions.push('Do you have pets?');
            break;
          case 'ownsCar':
            questions.push('Do you own a car?');
            break;
          case 'hasChildren':
            questions.push('Do you have children?');
            break;
          case 'ageRange':
            questions.push('What is your age range? (18-24, 25-34, 35-44, 45-54, 55+)');
            break;
          case 'medicalComfort':
            questions.push('Are you comfortable with medical surveys?');
            break;
        }
      }
    }

    return questions;
  }

  /**
   * Request withdrawal of earnings via JustTheTip
   * This emits an event that JustTheTip can handle
   */
  async requestWithdrawal(userId: string, amountUSD: number): Promise<{ success: boolean; message: string }> {
    const profile = this.profiles.get(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    if (amountUSD > profile.earningsUSD) {
      return {
        success: false,
        message: `Insufficient balance. You have $${profile.earningsUSD.toFixed(2)} available.`
      };
    }

    if (amountUSD < 5.00) {
      return {
        success: false,
        message: 'Minimum withdrawal amount is $5.00'
      };
    }

    // Emit withdrawal request event for JustTheTip to handle
    await eventRouter.publish('survey.withdrawal.requested', 'qualifyfirst', {
      userId,
      amountUSD,
      currentBalance: profile.earningsUSD,
    }, userId);

    // Deduct from earnings (pending until JustTheTip processes)
    profile.earningsUSD -= amountUSD;
    profile.updatedAt = Date.now();

    return {
      success: true,
      message: `Withdrawal request for $${amountUSD.toFixed(2)} submitted. Use /justthetip to complete the payout.`
    };
  }

  /**
   * Get user's current earnings balance
   */
  getEarnings(userId: string): number {
    const profile = this.profiles.get(userId);
    return profile?.earningsUSD || 0;
  }
}

// Export singleton instance
export const qualifyFirst = new QualifyFirstModule();

console.log('[QualifyFirst] Module loaded - Survey matching ready');
