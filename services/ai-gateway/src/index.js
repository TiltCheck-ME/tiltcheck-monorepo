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
 */

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
    
    // Mock AI response - in production would call OpenAI API
    const mockAnalysis = {
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
    };

    return {
      success: true,
      data: mockAnalysis,
      usage: {
        promptTokens: 150,
        completionTokens: 100,
        totalTokens: 250
      }
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

    // Mock AI-generated cards
    const mockCards = {
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
    };

    return {
      success: true,
      data: mockCards,
      usage: {
        promptTokens: 200,
        completionTokens: 300,
        totalTokens: 500
      }
    };
  }

  /**
   * Application 3: Content Moderation
   * Auto-moderate user submissions (links, promos, messages)
   */
  async moderation(request) {
    const { context } = request;
    
    // Mock moderation analysis
    const mockModeration = {
      isSafe: true,
      isScam: false,
      isSpam: false,
      toxicityScore: 0.05,
      categories: {
        scam: 0.02,
        spam: 0.03,
        inappropriate: 0.01,
        malicious: 0.00
      },
      confidence: 0.95,
      reasoning: 'Content appears legitimate. No scam indicators detected. Normal promotional language.',
      recommendation: 'approve',
      flaggedTerms: [],
      suggestedAction: 'auto-approve'
    };

    return {
      success: true,
      data: mockModeration,
      usage: {
        promptTokens: 100,
        completionTokens: 80,
        totalTokens: 180
      }
    };
  }

  /**
   * Application 4: Tilt Detection
   * Analyzes gambling behavior patterns for tilt risk
   */
  async tiltDetection(request) {
    const { context } = request;
    
    // Mock tilt analysis
    const mockAnalysis = {
      tiltScore: 35, // 0-100
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
      cooldownDuration: 1800 // 30 minutes
    };

    return {
      success: true,
      data: mockAnalysis,
      usage: {
        promptTokens: 250,
        completionTokens: 150,
        totalTokens: 400
      }
    };
  }

  /**
   * Application 5: Natural Language Commands
   * Parse natural language into bot commands
   */
  async naturalLanguageCommands(request) {
    const { prompt } = request;
    
    // Mock NL parsing
    const mockParsing = {
      intent: 'tip_user',
      confidence: 0.92,
      command: '/justthetip',
      parameters: {
        user: '@degenking',
        amount: 5,
        currency: 'USD'
      },
      originalText: prompt,
      explanation: 'User wants to tip another user $5',
      executable: true
    };

    return {
      success: true,
      data: mockParsing,
      usage: {
        promptTokens: 50,
        completionTokens: 40,
        totalTokens: 90
      }
    };
  }

  /**
   * Application 6: Personalized Recommendations
   * Suggest surveys, games, promos based on user profile
   */
  async recommendations(request) {
    const { context } = request;
    
    // Mock recommendations
    const mockRecommendations = {
      surveys: [
        {
          id: 'survey-123',
          title: 'Pet Owner Shopping Habits',
          match: 0.89,
          reasoning: 'High match based on pet ownership and age',
          estimatedPayout: 3.50,
          estimatedMinutes: 8
        },
        {
          id: 'survey-456',
          title: 'Online Gaming Preferences',
          match: 0.76,
          reasoning: 'Matches gaming interest and demographic',
          estimatedPayout: 2.25,
          estimatedMinutes: 5
        }
      ],
      promos: [
        {
          id: 'promo-789',
          casino: 'Stake',
          type: 'deposit-match',
          relevance: 0.82,
          reasoning: 'Active gambler, no recent Stake activity'
        }
      ],
      games: [
        {
          game: 'dad',
          reason: 'You enjoyed poker, might like this card game',
          confidence: 0.71
        }
      ],
      nextBestAction: 'Complete high-match survey (Pet Owner Shopping) for $3.50'
    };

    return {
      success: true,
      data: mockRecommendations,
      usage: {
        promptTokens: 300,
        completionTokens: 200,
        totalTokens: 500
      }
    };
  }

  /**
   * Application 7: User Support
   * AI-powered help and support responses
   */
  async support(request) {
    const { prompt, context } = request;
    
    // Mock support response
    const mockSupport = {
      answer: 'To withdraw your survey earnings, you need to have at least $5 in your balance. Use the `/withdraw` command in the QualifyFirst PWA to request a withdrawal. Your earnings will be sent directly to your registered wallet (Phantom, Solflare, or x402). The process usually takes 1-2 minutes.',
      confidence: 0.88,
      category: 'withdrawal',
      relatedArticles: [
        {
          title: 'How to Withdraw Earnings',
          url: '/docs/withdrawals'
        },
        {
          title: 'Wallet Setup Guide',
          url: '/docs/wallets'
        }
      ],
      suggestedFollowUps: [
        'What wallets are supported?',
        'What is the minimum withdrawal amount?',
        'How long do withdrawals take?'
      ],
      escalateToHuman: false
    };

    return {
      success: true,
      data: mockSupport,
      text: mockSupport.answer,
      usage: {
        promptTokens: 120,
        completionTokens: 100,
        totalTokens: 220
      }
    };
  }

  /**
   * Generate cache key for request
   * @param {Object} request - The AI request
   * @returns {string} Cache key
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
      hitRate: 0 // Would track in production
    };
  }
}

// Create and initialize the service
const aiGateway = new AIGatewayService();

// Initialize event router and then the service
initEventRouter()
  .then(() => {
    aiGateway.init();
    console.log('[AIGateway] Service initialized with 7 applications');
  })
  .catch((err) => {
    console.error('[AIGateway] Initialization failed:', err.message);
    console.log('[AIGateway] Service running in standalone mode');
  });

// Export singleton instance
module.exports = { AIGatewayService, aiGateway };
