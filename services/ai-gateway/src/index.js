/**
 * AI Gateway Service
 * 
 * Provides 7 AI-powered applications for TiltCheck ecosystem:
 * 1. Survey Matching Intelligence
 * 2. DA&D Card Generation
 * 3. Content Moderation
 * 4. Tilt Detection
 * 5. Natural Language Commands
 * 6. Personalized Recommendations
 * 7. User Support
 * 
 * Uses OpenAI API with fallback to mock responses when API key is not configured.
 */

import OpenAI from 'openai';

// Event router integration - import only when available
let eventRouter = null;

// Initialize eventRouter asynchronously
async function initEventRouter() {
  try {
    const eventRouterModule = await import('@tiltcheck/event-router');
    eventRouter = eventRouterModule.eventRouter;
    console.log('[AIGateway] Event router integration enabled');
  } catch (e) {
    console.log('[AIGateway] Event router not available, running standalone');
  }
}

/**
 * AI Gateway Service
 */
class AIGatewayService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 3600000; // 1 hour
    this.openai = null;
    this.useMock = true;
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    
    // Initialize OpenAI client if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      this.useMock = false;
      console.log('[AIGateway] OpenAI API configured, using model:', this.model);
    } else {
      console.log('[AIGateway] No OPENAI_API_KEY found, using mock responses');
    }
  }

  /**
   * Initialize the service (call after eventRouter is loaded)
   */
  init() {
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Only set up event listeners if eventRouter is available
    if (!eventRouter) {
      console.log('[AIGateway] Running without event router integration');
      return;
    }
    
    // Listen for AI requests from other modules
    eventRouter.subscribe(
      'ai.request',
      async (event) => {
        const request = event.data;
        const response = await this.process(request);
        await eventRouter.publish('ai.response', 'ai-gateway', response, event.userId);
      },
      'ai-gateway'
    );
  }

  /**
   * Call OpenAI API with structured output
   */
  async callOpenAI(systemPrompt, userPrompt, responseFormat = null, maxTokens = 1000) {
    if (this.useMock || !this.openai) {
      return null; // Fall back to mock
    }

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ];

      const options = {
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens
      };

      // Use JSON mode if response format is specified
      if (responseFormat) {
        options.response_format = { type: 'json_object' };
      }

      const completion = await this.openai.chat.completions.create(options);

      // Validate response structure
      if (!completion.choices || completion.choices.length === 0 || !completion.choices[0].message) {
        console.error('[AIGateway] Invalid OpenAI response: no choices returned');
        return null; // Fall back to mock
      }

      return {
        content: completion.choices[0].message.content,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0
        }
      };
    } catch (error) {
      console.error('[AIGateway] OpenAI API error:', error.message);
      return null; // Fall back to mock
    }
  }

  /**
   * Main AI processing entry point
   */
  async process(request) {
    // Check cache first
    const cacheKey = this.getCacheKey(request);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return { ...cached.response, cached: true };
    }

    // Route to appropriate application
    let response;
    
    switch (request.application) {
      case 'survey-matching':
        response = await this.surveyMatching(request);
        break;
      case 'card-generation':
        response = await this.cardGeneration(request);
        break;
      case 'moderation':
        response = await this.moderation(request);
        break;
      case 'tilt-detection':
        response = await this.tiltDetection(request);
        break;
      case 'nl-commands':
        response = await this.naturalLanguageCommands(request);
        break;
      case 'recommendations':
        response = await this.recommendations(request);
        break;
      case 'support':
        response = await this.support(request);
        break;
      default:
        response = {
          success: false,
          error: `Unknown application: ${request.application}`
        };
    }

    // Cache successful responses
    if (response.success) {
      this.cache.set(cacheKey, { response, timestamp: Date.now() });
    }

    return response;
  }

  /**
   * Application 1: Survey Matching Intelligence
   * Analyzes user profile vs survey requirements for better matching
   */
  async surveyMatching(request) {
    const { context } = request;
    
    const systemPrompt = `You are a survey matching AI. Analyze user profiles against survey requirements and provide match analysis. 
Always respond with valid JSON containing: matchConfidence (0-1), matchLevel (low/medium/high), reasoning (array of strings), 
recommendedActions (array of strings), estimatedCompletionTime (minutes), screenOutRisk (low/medium/high).`;

    const userPrompt = `Analyze this user profile for survey matching:
User Profile: ${JSON.stringify(context?.userProfile || {})}
Survey Requirements: ${JSON.stringify(context?.survey || {})}

Provide a detailed match analysis.`;

    const aiResponse = await this.callOpenAI(systemPrompt, userPrompt, true);

    if (aiResponse) {
      try {
        const data = JSON.parse(aiResponse.content);
        return {
          success: true,
          data,
          usage: aiResponse.usage,
          source: 'openai'
        };
      } catch (e) {
        console.error('[AIGateway] Failed to parse survey-matching response:', e.message);
      }
    }

    // Mock fallback
    return {
      success: true,
      data: {
        matchConfidence: 0.85,
        matchLevel: 'high',
        reasoning: [
          'Age range matches survey requirements (25-34)',
          'Pet ownership aligns with target demographic',
          'Previous completion rate for similar surveys: 78%',
          'No recent screen-outs in this category'
        ],
        recommendedActions: [
          'Answer medical comfort question to improve future matches',
          'Update employment status for better targeting'
        ],
        estimatedCompletionTime: 12,
        screenOutRisk: 'low'
      },
      usage: { promptTokens: 150, completionTokens: 100, totalTokens: 250 },
      source: 'mock'
    };
  }

  /**
   * Application 2: DA&D Card Generation
   * Generates contextual cards for Cards Against Humanity-style gameplay
   */
  async cardGeneration(request) {
    const { context } = request;
    const theme = context?.theme || 'degen-casino';
    const cardType = context?.cardType || 'both';
    const count = context?.count || 10;

    const systemPrompt = `You are a card game content generator for "Degens Against Decency" - a Cards Against Humanity style game for crypto/gambling communities.
Generate edgy, funny cards appropriate for adult degen culture. White cards are answers/nouns, black cards are prompts with blanks (_____).
Always respond with valid JSON containing: whiteCards (array), blackCards (array), theme (string), generatedAt (timestamp).`;

    const userPrompt = `Generate ${count} cards for theme: "${theme}"
Card type requested: ${cardType} (white = answers, black = prompts, both = mix)
Make them funny, edgy, and relevant to crypto/gambling culture.`;

    // Use higher token limit for card generation
    const aiResponse = await this.callOpenAI(systemPrompt, userPrompt, true, 1500);

    if (aiResponse) {
      try {
        const data = JSON.parse(aiResponse.content);
        data.generatedAt = Date.now();
        return {
          success: true,
          data,
          usage: aiResponse.usage,
          source: 'openai'
        };
      } catch (e) {
        console.error('[AIGateway] Failed to parse card-generation response:', e.message);
      }
    }

    // Mock fallback
    return {
      success: true,
      data: {
        whiteCards: cardType !== 'black' ? [
          'A rugpull at 3am',
          'Losing everything on leverage',
          'FOMO buying at the top',
          'Diamond hands turning into dust',
          'Telling your spouse about your losses',
          'Refreshing the chart every 5 seconds',
          'Calling customer support while tilted',
          'Blaming the dealer for bad variance',
          'Buying the dip that keeps dipping',
          'Explaining crypto to your boomer parents'
        ] : [],
        blackCards: cardType !== 'white' ? [
          'What caused the massive liquidation cascade? _____',
          'The secret to profitable gambling: _____ and _____',
          'When asked about my portfolio, I show them _____',
          'My strategy for avoiding tilt: _____',
          'The worst thing about bear markets: _____'
        ] : [],
        theme,
        generatedAt: Date.now()
      },
      usage: { promptTokens: 200, completionTokens: 300, totalTokens: 500 },
      source: 'mock'
    };
  }

  /**
   * Application 3: Content Moderation
   * Auto-moderate user submissions (links, promos, messages)
   */
  async moderation(request) {
    const { prompt, context } = request;
    
    const systemPrompt = `You are a content moderation AI for a crypto/gambling community. Analyze content for scams, spam, toxicity, and malicious intent.
Always respond with valid JSON containing: isSafe (boolean), isScam (boolean), isSpam (boolean), toxicityScore (0-1), 
categories (object with scam/spam/inappropriate/malicious scores 0-1), confidence (0-1), reasoning (string), 
recommendation (approve/review/reject), flaggedTerms (array), suggestedAction (auto-approve/manual-review/auto-reject).`;

    const userPrompt = `Moderate this content:
Content: "${prompt || context?.content || ''}"
URL: ${context?.url || 'none'}
Content Type: ${context?.contentType || 'message'}

Analyze for scams, spam, and inappropriate content.`;

    const aiResponse = await this.callOpenAI(systemPrompt, userPrompt, true);

    if (aiResponse) {
      try {
        const data = JSON.parse(aiResponse.content);
        return {
          success: true,
          data,
          usage: aiResponse.usage,
          source: 'openai'
        };
      } catch (e) {
        console.error('[AIGateway] Failed to parse moderation response:', e.message);
      }
    }

    // Mock fallback
    return {
      success: true,
      data: {
        isSafe: true,
        isScam: false,
        isSpam: false,
        toxicityScore: 0.05,
        categories: { scam: 0.02, spam: 0.03, inappropriate: 0.01, malicious: 0.00 },
        confidence: 0.95,
        reasoning: 'Content appears legitimate. No scam indicators detected. Normal promotional language.',
        recommendation: 'approve',
        flaggedTerms: [],
        suggestedAction: 'auto-approve'
      },
      usage: { promptTokens: 100, completionTokens: 80, totalTokens: 180 },
      source: 'mock'
    };
  }

  /**
   * Application 4: Tilt Detection
   * Analyzes gambling behavior patterns for tilt risk
   */
  async tiltDetection(request) {
    const { context } = request;
    
    const systemPrompt = `You are a responsible gambling AI that detects tilt (emotional gambling) patterns. Analyze betting behavior and emotional indicators.
Always respond with valid JSON containing: tiltScore (0-100), riskLevel (low/moderate/high/critical), indicators (array of strings),
patterns (object with chasingLosses/increasingStakes/timeSpentGambling/emotionalState), interventionSuggestions (array),
cooldownRecommended (boolean), cooldownDuration (seconds).`;

    const userPrompt = `Analyze this gambling session for tilt indicators:
Recent Bets: ${JSON.stringify(context?.recentBets || [])}
Session Duration: ${context?.sessionDuration || 0} minutes
Total Losses: $${context?.losses || 0}
Recent Messages: ${JSON.stringify(context?.recentMessages || [])}

Assess tilt risk and suggest interventions.`;

    const aiResponse = await this.callOpenAI(systemPrompt, userPrompt, true);

    if (aiResponse) {
      try {
        const data = JSON.parse(aiResponse.content);
        return {
          success: true,
          data,
          usage: aiResponse.usage,
          source: 'openai'
        };
      } catch (e) {
        console.error('[AIGateway] Failed to parse tilt-detection response:', e.message);
      }
    }

    // Mock fallback
    return {
      success: true,
      data: {
        tiltScore: 35,
        riskLevel: 'moderate',
        indicators: [
          'Bet size increased 3x in last hour',
          'Loss recovery attempts detected',
          'Emotional language in recent messages'
        ],
        patterns: {
          chasingLosses: true,
          increasingStakes: true,
          timeSpentGambling: 'elevated',
          emotionalState: 'frustrated'
        },
        interventionSuggestions: [
          'Suggest taking a 30-minute break',
          'Display current session stats',
          'Remind of daily loss limit',
          'Offer tilt-reduction resources'
        ],
        cooldownRecommended: true,
        cooldownDuration: 1800
      },
      usage: { promptTokens: 250, completionTokens: 150, totalTokens: 400 },
      source: 'mock'
    };
  }

  /**
   * Application 5: Natural Language Commands
   * Parse natural language into bot commands
   */
  async naturalLanguageCommands(request) {
    const { prompt } = request;
    
    const systemPrompt = `You are a natural language command parser for a Discord bot. Parse user messages into executable commands.
Available commands: /justthetip (tip users), /scan (check links), /qualify (survey matching), /trust (check trust scores), /play (games).
Always respond with valid JSON containing: intent (string), confidence (0-1), command (string starting with /), 
parameters (object), originalText (string), explanation (string), executable (boolean).`;

    const userPrompt = `Parse this natural language message into a bot command:
"${prompt}"

Identify the intent and extract parameters.`;

    const aiResponse = await this.callOpenAI(systemPrompt, userPrompt, true);

    if (aiResponse) {
      try {
        const data = JSON.parse(aiResponse.content);
        data.originalText = prompt;
        return {
          success: true,
          data,
          usage: aiResponse.usage,
          source: 'openai'
        };
      } catch (e) {
        console.error('[AIGateway] Failed to parse nl-commands response:', e.message);
      }
    }

    // Mock fallback
    return {
      success: true,
      data: {
        intent: 'tip_user',
        confidence: 0.92,
        command: '/justthetip',
        parameters: { user: '@degenking', amount: 5, currency: 'USD' },
        originalText: prompt,
        explanation: 'User wants to tip another user $5',
        executable: true
      },
      usage: { promptTokens: 50, completionTokens: 40, totalTokens: 90 },
      source: 'mock'
    };
  }

  /**
   * Application 6: Personalized Recommendations
   * Suggest surveys, games, promos based on user profile
   */
  async recommendations(request) {
    const { context } = request;
    
    const systemPrompt = `You are a personalization AI for a crypto/gambling community. Recommend surveys, games, and promotions based on user profiles.
Always respond with valid JSON containing: surveys (array with id/title/match/reasoning/estimatedPayout/estimatedMinutes),
promos (array with id/casino/type/relevance/reasoning), games (array with game/reason/confidence), nextBestAction (string).`;

    const userPrompt = `Generate personalized recommendations for this user:
User ID: ${context?.userId || 'unknown'}
Profile: ${JSON.stringify(context?.profile || {})}
Activity History: ${JSON.stringify(context?.activityHistory || [])}
Preferences: ${JSON.stringify(context?.preferences || {})}

Suggest relevant surveys, promos, and games.`;

    const aiResponse = await this.callOpenAI(systemPrompt, userPrompt, true);

    if (aiResponse) {
      try {
        const data = JSON.parse(aiResponse.content);
        return {
          success: true,
          data,
          usage: aiResponse.usage,
          source: 'openai'
        };
      } catch (e) {
        console.error('[AIGateway] Failed to parse recommendations response:', e.message);
      }
    }

    // Mock fallback
    return {
      success: true,
      data: {
        surveys: [
          { id: 'survey-123', title: 'Pet Owner Shopping Habits', match: 0.89, reasoning: 'High match based on pet ownership and age', estimatedPayout: 3.50, estimatedMinutes: 8 },
          { id: 'survey-456', title: 'Online Gaming Preferences', match: 0.76, reasoning: 'Matches gaming interest and demographic', estimatedPayout: 2.25, estimatedMinutes: 5 }
        ],
        promos: [
          { id: 'promo-789', casino: 'Stake', type: 'deposit-match', relevance: 0.82, reasoning: 'Active gambler, no recent Stake activity' }
        ],
        games: [
          { game: 'dad', reason: 'You enjoyed poker, might like this card game', confidence: 0.71 }
        ],
        nextBestAction: 'Complete high-match survey (Pet Owner Shopping) for $3.50'
      },
      usage: { promptTokens: 300, completionTokens: 200, totalTokens: 500 },
      source: 'mock'
    };
  }

  /**
   * Application 7: User Support
   * AI-powered help and support responses
   */
  async support(request) {
    const { prompt, context } = request;
    
    const systemPrompt = `You are a helpful support AI for TiltCheck, a crypto/gambling community platform. Answer user questions about:
- Survey earnings and withdrawals (via QualifyFirst)
- Tipping (via JustTheTip) 
- Trust scores and safety features
- Games (DA&D, Poker)
- Wallet setup (Phantom, Solflare, x402)

Always respond with valid JSON containing: answer (string), confidence (0-1), category (string), 
relatedArticles (array with title/url), suggestedFollowUps (array of strings), escalateToHuman (boolean).`;

    const userPrompt = `User question: "${prompt}"
Context: ${JSON.stringify(context || {})}

Provide a helpful, accurate response.`;

    const aiResponse = await this.callOpenAI(systemPrompt, userPrompt, true);

    if (aiResponse) {
      try {
        const data = JSON.parse(aiResponse.content);
        return {
          success: true,
          data,
          text: data.answer,
          usage: aiResponse.usage,
          source: 'openai'
        };
      } catch (e) {
        console.error('[AIGateway] Failed to parse support response:', e.message);
      }
    }

    // Mock fallback
    return {
      success: true,
      data: {
        answer: 'To withdraw your survey earnings, you need to have at least $5 in your balance. Use the `/withdraw` command in the QualifyFirst PWA to request a withdrawal. Your earnings will be sent directly to your registered wallet (Phantom, Solflare, or x402). The process usually takes 1-2 minutes.',
        confidence: 0.88,
        category: 'withdrawal',
        relatedArticles: [
          { title: 'How to Withdraw Earnings', url: '/docs/withdrawals' },
          { title: 'Wallet Setup Guide', url: '/docs/wallets' }
        ],
        suggestedFollowUps: [
          'What wallets are supported?',
          'What is the minimum withdrawal amount?',
          'How long do withdrawals take?'
        ],
        escalateToHuman: false
      },
      text: 'To withdraw your survey earnings, you need to have at least $5 in your balance. Use the `/withdraw` command in the QualifyFirst PWA to request a withdrawal.',
      usage: { promptTokens: 120, completionTokens: 100, totalTokens: 220 },
      source: 'mock'
    };
  }

  /**
   * Generate cache key for request
   */
  getCacheKey(request) {
    return `${request.application}:${request.prompt}:${JSON.stringify(request.context || {})}`;
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      hitRate: 0
    };
  }

  /**
   * Check if using OpenAI or mock
   */
  getStatus() {
    return {
      mode: this.useMock ? 'mock' : 'openai',
      model: this.model,
      cacheSize: this.cache.size
    };
  }
}

// Create and initialize the service
const aiGateway = new AIGatewayService();

// Initialize event router and then the service
initEventRouter()
  .then(() => {
    aiGateway.init();
    const status = aiGateway.getStatus();
    console.log(`[AIGateway] Service initialized with 7 applications (mode: ${status.mode})`);
  })
  .catch((err) => {
    console.error('[AIGateway] Initialization failed:', err.message);
    console.log('[AIGateway] Service running in standalone mode');
  });

// Export singleton instance
export { AIGatewayService, aiGateway };
