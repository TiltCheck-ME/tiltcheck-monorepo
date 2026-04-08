// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-08
/**
 * TiltCheck AI Gateway Client
 *
 * Smart multi-provider routing: each AI application is routed to the best
 * provider based on accuracy requirements and cost efficiency, with automatic
 * fallback if the primary provider is unavailable.
 *
 * Provider priority by application:
 *   Accuracy-critical (tilt-detection, moderation, survey-matching,
 *     recommendations, onboarding) → Vertex AI → Groq → Ollama → Mock
 *   Speed/cost-critical (nl-commands, support, card-generation)
 *     → Groq → Vertex AI → Ollama → Mock
 *
 * Auth: Vertex AI uses a GCP service account key (GOOGLE_SERVICE_ACCOUNT_JSON)
 * to obtain short-lived OAuth2 Bearer tokens, cached for 55 minutes.
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

export type AIProvider = 'vertex' | 'groq' | 'ollama' | 'openai' | 'mock';

/**
 * Per-application provider priority list.
 * First available/configured provider in the list wins.
 * Falls back automatically on error.
 */
const PROVIDER_ROUTES: Record<AIApplication, AIProvider[]> = {
  // Accuracy-critical: complex reasoning, behavioral analysis, safety
  'tilt-detection':  ['vertex', 'groq', 'ollama', 'mock'],
  'moderation':      ['vertex', 'groq', 'ollama', 'mock'],
  'survey-matching': ['vertex', 'groq', 'ollama', 'mock'],
  'recommendations': ['vertex', 'groq', 'ollama', 'mock'],
  'onboarding':      ['vertex', 'groq', 'ollama', 'mock'],
  // Speed/cost-critical: real-time UX, creative, high-volume
  'nl-commands':     ['groq', 'vertex', 'ollama', 'mock'],
  'support':         ['groq', 'vertex', 'ollama', 'mock'],
  'card-generation': ['groq', 'ollama', 'vertex', 'mock'],
};

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
  source?: AIProvider;
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
  /** Force a specific provider for all requests (overrides PROVIDER_ROUTES). */
  forceProvider?: AIProvider;
  // Vertex AI
  vertexProject?: string;
  vertexLocation?: string;
  vertexModel?: string;
  // Groq
  groqApiKey?: string;
  groqModel?: string;
  groqFastModel?: string;
  // Ollama
  ollamaUrl?: string;
  ollamaModel?: string;
}

const DEFAULT_CONFIG: Required<AIClientConfig> = {
  baseUrl: process.env.AI_GATEWAY_URL || 'https://ai-gateway.tiltcheck.me',
  timeout: 30000,
  authToken: '',
  retries: 2,
  forceProvider: (process.env.AI_PROVIDER as AIProvider | undefined) as unknown as AIProvider,
  // Vertex AI (uses Gemini on Vertex — applies $1k credits)
  vertexProject: process.env.GOOGLE_CLOUD_PROJECT || '',
  vertexLocation: process.env.VERTEX_LOCATION || 'us-central1',
  vertexModel: process.env.VERTEX_MODEL || 'gemini-2.5-flash',
  // Groq — fast, cheap, OpenAI-compatible
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  groqFastModel: process.env.GROQ_FAST_MODEL || 'llama-3.1-8b-instant',
  // Ollama — local/self-hosted fallback
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434/v1',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.2:1b',
};

/** Vertex AI OAuth2 token cache */
interface TokenCache {
  token: string;
  expiresAt: number;
}
let vertexTokenCache: TokenCache | null = null;

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
      // Determine provider chain: forced override or route table
      const chain: AIProvider[] = this.config.forceProvider
        ? [this.config.forceProvider, 'mock']
        : PROVIDER_ROUTES[request.application] ?? ['groq', 'vertex', 'ollama', 'mock'];

      let lastError = '';
      for (const provider of chain) {
        if (!this.isProviderConfigured(provider)) continue;
        try {
          const result = await this.callProvider<T>(provider, request, controller.signal);
          clearTimeout(timeoutId);
          return result;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          console.warn(`[AIClient] ${provider} failed for ${request.application}: ${lastError}`);
        }
      }

      clearTimeout(timeoutId);
      return { success: false, error: `All providers failed. Last: ${lastError}` };
    } catch (error) {
      clearTimeout(timeoutId);
      if ((error as Error).name === 'AbortError') throw new Error('Request timeout');
      throw error;
    }
  }

  private isProviderConfigured(provider: AIProvider): boolean {
    switch (provider) {
      case 'vertex':
        return !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON && this.config.vertexProject);
      case 'groq':
        return !!this.config.groqApiKey;
      case 'ollama':
        return !!(this.config.ollamaUrl && this.config.ollamaUrl !== 'http://localhost:11434/v1')
          || process.env.NODE_ENV === 'development';
      case 'openai':
        return !!process.env.OPENAI_API_KEY;
      case 'mock':
        return true;
      default:
        return false;
    }
  }

  private async callProvider<T>(
    provider: AIProvider,
    request: AIRequest,
    signal: AbortSignal,
  ): Promise<AIResponse<T>> {
    switch (provider) {
      case 'vertex': return this.callVertex<T>(request, signal);
      case 'groq':   return this.callGroq<T>(request, signal);
      case 'ollama': return this.callOllama<T>(request, signal);
      case 'openai': return this.callOpenAICompat<T>(request, signal, 'https://api.openai.com/v1', process.env.OPENAI_API_KEY || '', process.env.OPENAI_MODEL || 'gpt-4o-mini');
      case 'mock':   return this.callMock<T>(request);
      default:       throw new Error(`Unknown provider: ${provider}`);
    }
  }

  // ── Vertex AI (Gemini on Vertex — uses GCP credits) ──────────────────────

  private async getVertexToken(): Promise<string> {
    const now = Date.now();
    if (vertexTokenCache && vertexTokenCache.expiresAt > now + 60_000) {
      return vertexTokenCache.token;
    }

    const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
    const sa = JSON.parse(raw) as {
      client_email: string;
      private_key: string;
    };

    const iat = Math.floor(now / 1000);
    const exp = iat + 3600;

    const header = this.base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = this.base64url(JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat,
      exp,
    }));

    const signingInput = `${header}.${payload}`;

    // Import PKCS#8 private key (Google SA keys are PKCS#8 "BEGIN PRIVATE KEY")
    const pemBody = sa.private_key
      .replace(/-----BEGIN PRIVATE KEY-----/g, '')
      .replace(/-----END PRIVATE KEY-----/g, '')
      .replace(/\n/g, '');

    const keyData = Uint8Array.from(Buffer.from(pemBody, 'base64'));
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      'pkcs8',
      keyData,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign'],
    );

    const sigBytes = await globalThis.crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(signingInput),
    );
    const sig = this.base64url(Buffer.from(sigBytes).toString('binary'), true);
    const jwt = `${signingInput}.${sig}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Vertex token exchange failed ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json() as { access_token: string; expires_in: number };
    vertexTokenCache = {
      token: data.access_token,
      expiresAt: now + (data.expires_in ?? 3600) * 1000,
    };
    return vertexTokenCache.token;
  }

  private base64url(input: string, isBinary = false): string {
    const b64 = isBinary ? Buffer.from(input, 'binary').toString('base64') : Buffer.from(input).toString('base64');
    return b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  private async callVertex<T>(request: AIRequest, signal: AbortSignal): Promise<AIResponse<T>> {
    const token = await this.getVertexToken();
    const { vertexProject, vertexLocation, vertexModel } = this.config;
    const url = `https://${vertexLocation}-aiplatform.googleapis.com/v1/projects/${vertexProject}/locations/${vertexLocation}/publishers/google/models/${vertexModel}:generateContent`;

    const prompt = request.prompt || `Task: ${request.application}\nContext: ${JSON.stringify(request.context || {})}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: this.buildSystemPrompt(request.application) + '\n\nUser Input: ' + prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 1200 },
      }),
      signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Vertex returned ${response.status}: ${body.slice(0, 200)}`);
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
    if (!fullText) throw new Error('Empty Vertex response');

    const parsed = this.extractJson(fullText);
    return {
      success: true,
      source: 'vertex',
      text: typeof parsed?.text === 'string' ? parsed.text : fullText,
      data: (parsed?.data ?? parsed) as T,
    };
  }

  // ── Groq (speed/cost-optimised OpenAI-compat) ────────────────────────────

  private async callGroq<T>(request: AIRequest, signal: AbortSignal): Promise<AIResponse<T>> {
    // Use fast model for real-time UX tasks, standard model for others
    const fastApps: AIApplication[] = ['nl-commands', 'support'];
    const model = fastApps.includes(request.application)
      ? this.config.groqFastModel
      : this.config.groqModel;

    return this.callOpenAICompat<T>(
      request, signal,
      'https://api.groq.com/openai/v1',
      this.config.groqApiKey,
      model,
      'groq',
    );
  }

  // ── Ollama (local/self-hosted) ────────────────────────────────────────────

  private async callOllama<T>(request: AIRequest, signal: AbortSignal): Promise<AIResponse<T>> {
    return this.callOpenAICompat<T>(
      request, signal,
      this.config.ollamaUrl,
      'ollama',
      this.config.ollamaModel,
      'ollama',
    );
  }

  // ── Shared OpenAI-compatible path (Groq, Ollama, OpenAI) ─────────────────

  private async callOpenAICompat<T>(
    request: AIRequest,
    signal: AbortSignal,
    baseUrl: string,
    apiKey: string,
    model: string,
    source: AIProvider = 'openai',
  ): Promise<AIResponse<T>> {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.25,
        max_tokens: 900,
        messages: [
          { role: 'system', content: this.buildSystemPrompt(request.application) },
          { role: 'user', content: this.buildUserPrompt(request) },
        ],
      }),
      signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`${source} returned ${response.status}: ${body.slice(0, 180)}`);
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data?.choices?.[0]?.message?.content?.trim() ?? '';
    if (!content) throw new Error(`Empty ${source} response`);

    const parsed = this.extractJson(content);
    return {
      success: true,
      source,
      text: typeof parsed?.text === 'string' ? parsed.text : (parsed ? undefined : content),
      data: (parsed?.data ?? parsed) as T,
    };
  }

  // ── Mock (testing / offline fallback) ────────────────────────────────────

  private callMock<T>(request: AIRequest): AIResponse<T> {
    console.warn(`[AIClient] Using mock provider for ${request.application}`);
    return {
      success: true,
      source: 'mock',
      text: `Mock response for ${request.application}`,
      data: {} as T,
    };
  }

  // ── Shared prompt builders ────────────────────────────────────────────────

  private buildSystemPrompt(application: AIApplication): string {
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

  private buildUserPrompt(request: AIRequest): string {
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
