// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-04
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
  | 'support'
  | 'onboarding';

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
  source?: 'openai' | 'ollama' | 'vertex' | 'mock';
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

export interface OnboardingData {
  interviewQuestions: Array<{
    id: string;
    question: string;
    options?: string[]; // If predefined options
    expectedType: 'text' | 'choice' | 'boolean';
    purpose: string; // What this question helps personalize
  }>;
  personalizedTutorialPaths: Array<{
    moduleId: string;
    title: string;
    description: string;
    relevanceScore: number;
    estimatedMinutes: number;
  }>;
  gamingPersona: string;
  recommendedRiskLevel: 'conservative' | 'moderate' | 'degen';
}

export interface AIClientConfig {
  baseUrl?: string;
  timeout?: number;
  authToken?: string;
  retries?: number;
  provider?: 'gateway' | 'ollama' | 'vertex';
  ollamaModel?: string;
  vertexApiKey?: string;
  vertexModel?: string;
}

const DEFAULT_CONFIG: Required<AIClientConfig> = {
  baseUrl:
    process.env.AI_PROVIDER === 'ollama'
      ? (process.env.OLLAMA_URL || 'http://localhost:11434/v1')
      : (process.env.AI_GATEWAY_URL || 'https://ai-gateway.tiltcheck.me'),
  timeout: 30000,
  authToken: '',
  retries: 2,
  provider: (process.env.AI_PROVIDER as any) || 'gateway',
  ollamaModel: process.env.AI_MODEL || process.env.OLLAMA_MODEL || 'llama3.2:1b',
  vertexApiKey: process.env.GEMINI_API_KEY || '',
  vertexModel: process.env.VERTEX_MODEL || 'gemini-2.5-flash-lite',
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
      if (this.config.provider === 'ollama') {
        return await this.makeOllamaRequest<T>(request, controller.signal);
      }

      if (this.config.provider === 'vertex') {
        return await this.makeVertexRequest<T>(request, controller.signal);
      }

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

  private async makeVertexRequest<T>(request: AIRequest, signal: AbortSignal): Promise<AIResponse<T>> {   
    // Uses direct Gemini REST API (no GCP/Vertex AI required).
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.vertexModel}:generateContent?key=${this.config.vertexApiKey}`;

    const prompt = request.prompt || `Task: ${request.application}\nContext: ${JSON.stringify(request.context || {})}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: this.buildOllamaSystemPrompt(request.application) + "\n\nUser Input: " + prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      }),
      signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Gemini API returned ${response.status}: ${body.slice(0, 180)}`);
    }

    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };

    const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!fullText) {
      return { success: false, source: 'vertex' as any, error: 'Empty Gemini response' };
    }

    const parsed = this.extractJson(fullText);
    return {
      success: true,
      source: 'vertex' as any, 
      text: typeof parsed?.text === 'string' ? (parsed.text as string) : fullText,
      data: (parsed?.data ?? parsed) as T,
    };
  }

  private async makeOllamaRequest<T>(request: AIRequest, signal: AbortSignal): Promise<AIResponse<T>> {   
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ollama',
      },
      body: JSON.stringify({
        model: this.config.ollamaModel,
        temperature: 0.25,
        max_tokens: 900,
        messages: [
          { role: 'system', content: this.buildOllamaSystemPrompt(request.application) },
          { role: 'user', content: this.buildOllamaUserPrompt(request) },
        ],
      }),
      signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Ollama returned ${response.status}: ${body.slice(0, 180)}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };        
    const content = data?.choices?.[0]?.message?.content?.trim() || '';
    if (!content) {
      return { success: false, source: 'ollama', error: 'Empty Ollama response' };
    }

    const parsed = this.extractJson(content);
    if (!parsed) {
      return { success: true, source: 'ollama', text: content };
    }

    return {
      success: true,
      source: 'ollama',
      text: typeof parsed.text === 'string' ? parsed.text : undefined,
      data: (parsed.data ?? parsed) as T,
    };
  }

  private buildOllamaSystemPrompt(application: AIApplication): string {
    const appGuidance: Record<AIApplication, string> = {
      'survey-matching': 'Return matchConfidence, matchLevel, reasoning[], recommendedActions[], estimatedCompletionTime, screenOutRisk.',
      'card-generation': 'Return whiteCards[] and blackCards[] with concise, non-harmful humor.',
      moderation: 'Return isSafe, isScam, isSpam, toxicityScore, categories, confidence, reasoning, recommendation, flaggedTerms[], suggestedAction.',
      'tilt-detection': 'Return tiltScore (0-100), riskLevel, indicators[], patterns{}, interventionSuggestions[], cooldownRecommended, cooldownDuration.',
      'nl-commands': 'Return intent, confidence, command, parameters, originalText, explanation, executable.',
      recommendations: 'Return surveys[], promos[], games[], nextBestAction.',
      support: 'Return answer, confidence, category, relatedArticles[], suggestedFollowUps[], escalateToHuman.',
      onboarding: 'Return interviewQuestions[], personalizedTutorialPaths[], gamingPersona, recommendedRiskLevel.',
    };

    return `You are the TiltCheck AI engine for application "${application}". ${appGuidance[application]} 
Return strict JSON only with shape: {"text":"optional short summary","data":{...}}.
Never include markdown fences.`;
  }

  private buildOllamaUserPrompt(request: AIRequest): string {
    return JSON.stringify({
      application: request.application,
      prompt: request.prompt || '',
      context: request.context || {},
    });
  }

  private extractJson(content: string): Record<string, unknown> | null {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
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
   * Convenience method for generating a tailored onboarding interview and tutorial path
   */
  async generateOnboardingInterview(userProfile?: {
    walletAge?: number;
    previousExperience?: string;
    platform?: 'web' | 'discord';
  }): Promise<AIResponse<OnboardingData>> {
    return this.request<OnboardingData>({
      application: 'onboarding',
      context: userProfile as Record<string, unknown>,
    });
  }

  /**
   * Submit feedback for an AI response to improve future performance
   */
  async submitFeedback(options: {
    application: AIApplication;
    originalRequest: AIRequest;
    actualOutcome: unknown;
    userCorrected?: boolean;
    rating?: number; // 1-5
    comments?: string;
  }): Promise<AIResponse<{ feedbackId: string }>> {
    return this.request<{ feedbackId: string }>({
      application: options.application,
      context: {
        feedback: true,
        ...options,
      },
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
