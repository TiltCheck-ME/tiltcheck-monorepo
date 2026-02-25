/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * TiltCheck AI Gateway Client
 * 
 * Shared client for making requests to the AI Gateway service.
 * Provides unified access to all 7 AI applications:
 * 1. Survey Matching Intelligence
 * 2. DA&D Card Generation
 * 3. Content Moderation
 * 4. Tilt Detection
 * 5. Natural Language Commands
 * 6. Personalized Recommendations
 * 7. User Support
 */

export type AIApplication = 
  | 'survey-matching'
  | 'card-generation'
  | 'moderation'
  | 'tilt-detection'
  | 'nl-commands'
  | 'recommendations'
  | 'support';

export interface AIRequest {
  application: AIApplication;
  prompt?: string;
  context?: Record<string, unknown>;
}

export interface AIResponse<T = unknown> {
  success: boolean;
  data?: T;
  text?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  source?: 'openai' | 'mock';
  cached?: boolean;
  error?: string;
}

// Type-safe response types for each application
export interface SurveyMatchingData {
  matchConfidence: number;
  matchLevel: 'low' | 'medium' | 'high';
  reasoning: string[];
  recommendedActions: string[];
  estimatedCompletionTime: number;
  screenOutRisk: 'low' | 'medium' | 'high';
}

export interface CardGenerationData {
  whiteCards: string[];
  blackCards: string[];
  theme: string;
  generatedAt: number;
}

export interface ModerationData {
  isSafe: boolean;
  isScam: boolean;
  isSpam: boolean;
  toxicityScore: number;
  categories: {
    scam: number;
    spam: number;
    inappropriate: number;
    malicious: number;
  };
  confidence: number;
  reasoning: string;
  recommendation: 'approve' | 'review' | 'reject';
  flaggedTerms: string[];
  suggestedAction: 'auto-approve' | 'manual-review' | 'auto-reject';
}

export interface TiltDetectionData {
  tiltScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  indicators: string[];
  patterns: {
    chasingLosses: boolean;
    increasingStakes: boolean;
    timeSpentGambling: string;
    emotionalState: string;
  };
  interventionSuggestions: string[];
  cooldownRecommended: boolean;
  cooldownDuration: number;
}

export interface NLCommandsData {
  intent: string;
  confidence: number;
  command: string;
  parameters: Record<string, unknown>;
  originalText: string;
  explanation: string;
  executable: boolean;
}

export interface RecommendationsData {
  surveys: Array<{
    id: string;
    title: string;
    match: number;
    reasoning: string;
    estimatedPayout: number;
    estimatedMinutes: number;
  }>;
  promos: Array<{
    id: string;
    casino: string;
    type: string;
    relevance: number;
    reasoning: string;
  }>;
  games: Array<{
    game: string;
    reason: string;
    confidence: number;
  }>;
  nextBestAction: string;
}

export interface SupportData {
  answer: string;
  confidence: number;
  category: string;
  relatedArticles: Array<{
    title: string;
    url: string;
  }>;
  suggestedFollowUps: string[];
  escalateToHuman: boolean;
}

export interface AIClientConfig {
  baseUrl?: string;
  timeout?: number;
  authToken?: string;
  retries?: number;
}

const DEFAULT_CONFIG: Required<AIClientConfig> = {
  baseUrl: process.env.AI_GATEWAY_URL || 'https://ai-gateway.tiltcheck.me',
  timeout: 30000,
  authToken: '',
  retries: 2,
};

/**
 * AI Gateway Client
 */
export class AIClient {
  private config: Required<AIClientConfig>;
  private cache: Map<string, { response: AIResponse; timestamp: number }> = new Map();
  private cacheTimeout = 300000; // 5 minutes

  constructor(config?: AIClientConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Make a request to the AI Gateway
   */
  async request<T = unknown>(request: AIRequest): Promise<AIResponse<T>> {
    // Check cache first
    const cacheKey = this.getCacheKey(request);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return { ...cached.response, cached: true } as AIResponse<T>;
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const response = await this.makeRequest<T>(request);
        
        // Cache successful responses
        if (response.success) {
          this.cache.set(cacheKey, { response: response as AIResponse, timestamp: Date.now() });
        }
        
        return response;
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.config.retries) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Request failed after retries',
    };
  }

  private async makeRequest<T>(request: AIRequest): Promise<AIResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.config.authToken) {
        headers['Authorization'] = `Bearer ${this.config.authToken}`;
      }

      const response = await fetch(`${this.config.baseUrl}/api/ai`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI Gateway returned ${response.status}`);
      }

      return await response.json() as AIResponse<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if ((error as Error).name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Convenience method for survey matching
   */
  async surveyMatching(userProfile: unknown, survey: unknown): Promise<AIResponse<SurveyMatchingData>> {
    return this.request<SurveyMatchingData>({
      application: 'survey-matching',
      context: { userProfile, survey },
    });
  }

  /**
   * Convenience method for card generation
   */
  async generateCards(options: {
    theme?: string;
    cardType?: 'white' | 'black' | 'both';
    count?: number;
  } = {}): Promise<AIResponse<CardGenerationData>> {
    return this.request<CardGenerationData>({
      application: 'card-generation',
      context: {
        theme: options.theme || 'degen-casino',
        cardType: options.cardType || 'both',
        count: options.count || 10,
      },
    });
  }

  /**
   * Convenience method for content moderation
   */
  async moderate(content: string, options?: {
    url?: string;
    contentType?: string;
  }): Promise<AIResponse<ModerationData>> {
    return this.request<ModerationData>({
      application: 'moderation',
      prompt: content,
      context: options,
    });
  }

  /**
   * Convenience method for tilt detection
   */
  async detectTilt(context: {
    recentBets?: Array<{ amount: number; won: boolean; timestamp: number }>;
    sessionDuration?: number;
    losses?: number;
    recentMessages?: string[];
  }): Promise<AIResponse<TiltDetectionData>> {
    return this.request<TiltDetectionData>({
      application: 'tilt-detection',
      context,
    });
  }

  /**
   * Convenience method for natural language command parsing
   */
  async parseCommand(message: string): Promise<AIResponse<NLCommandsData>> {
    return this.request<NLCommandsData>({
      application: 'nl-commands',
      prompt: message,
    });
  }

  /**
   * Convenience method for personalized recommendations
   */
  async getRecommendations(context: {
    userId?: string;
    profile?: unknown;
    activityHistory?: unknown[];
    preferences?: unknown;
  }): Promise<AIResponse<RecommendationsData>> {
    return this.request<RecommendationsData>({
      application: 'recommendations',
      context,
    });
  }

  /**
   * Convenience method for user support
   */
  async getSupport(question: string, context?: unknown): Promise<AIResponse<SupportData>> {
    return this.request<SupportData>({
      application: 'support',
      prompt: question,
      context: context as Record<string, unknown>,
    });
  }

  /**
   * Clear the response cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update auth token
   */
  setAuthToken(token: string): void {
    this.config.authToken = token;
  }

  private getCacheKey(request: AIRequest): string {
    return `${request.application}:${request.prompt || ''}:${JSON.stringify(request.context || {})}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Default singleton instance
export const aiClient = new AIClient();

// Export for direct use
export default aiClient;
