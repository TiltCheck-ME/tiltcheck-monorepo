# AI Gateway Service

AI-powered intelligence for TiltCheck ecosystem with 7 core applications.

## Applications

### 1. Survey Matching Intelligence
Analyzes user profiles against survey requirements for better matching.

**Features**:
- Match confidence scoring (0-100%)
- Contextual reasoning for matches
- Screen-out risk assessment
- Profile improvement recommendations
- Estimated completion time

**Usage**:
```javascript
const response = await aiGateway.surveyMatching({
  application: 'survey-matching',
  prompt: 'Analyze match',
  context: {
    userProfile: { hasPets: true, ageRange: '25-34' },
    survey: { requirements: { hasPets: true } }
  }
});
```

### 2. DA&D Card Generation
Generates contextual cards for Cards Against Humanity-style gameplay.

**Features**:
- Theme-based card generation
- White cards (answers) and Black cards (prompts)
- Community-specific humor
- Event-based cards (bull run, bear market)

**Usage**:
```javascript
const response = await aiGateway.cardGeneration({
  application: 'card-generation',
  prompt: 'Generate cards',
  context: {
    theme: 'crypto-degen',
    cardType: 'both',
    count: 10
  }
});
```

### 3. Content Moderation
Auto-moderates user submissions (links, promos, messages).

**Features**:
- Scam detection
- Spam filtering
- Toxicity scoring
- Category-based analysis
- Auto-approve/reject recommendations

**Usage**:
```javascript
const response = await aiGateway.moderation({
  application: 'moderation',
  prompt: 'Check out this bonus!',
  context: {
    contentType: 'promo',
    url: 'https://example.com'
  }
});
```

### 4. Tilt Detection
Analyzes gambling behavior patterns for tilt risk.

**Features**:
- Tilt score (0-100)
- Risk level assessment
- Pattern detection (chasing losses, increasing stakes)
- Intervention suggestions
- Cooldown recommendations

**Usage**:
```javascript
const response = await aiGateway.tiltDetection({
  application: 'tilt-detection',
  prompt: 'Analyze behavior',
  context: {
    recentBets: [10, 20, 40, 80],
    sessionDuration: 120,
    losses: 150
  }
});
```

### 5. Natural Language Commands
Parses natural language into bot commands.

**Features**:
- Intent classification
- Parameter extraction
- Confidence scoring
- Multi-language support
- Command explanation

**Usage**:
```javascript
const response = await aiGateway.naturalLanguageCommands({
  application: 'nl-commands',
  prompt: 'send $5 to @degenking',
  context: {}
});
```

### 6. Personalized Recommendations
Suggests surveys, games, promos based on user profile.

**Features**:
- Survey recommendations with match scores
- Promo relevance scoring
- Game suggestions
- Next best action
- Reasoning for each recommendation

**Usage**:
```javascript
const response = await aiGateway.recommendations({
  application: 'recommendations',
  prompt: 'Get recommendations',
  context: {
    userId: 'user123',
    profile: { hasPets: true, interests: ['gaming'] }
  }
});
```

### 7. User Support
AI-powered help and support responses.

**Features**:
- Natural language question answering
- Confidence scoring
- Related articles
- Follow-up suggestions
- Escalation to human when needed

**Usage**:
```javascript
const response = await aiGateway.support({
  application: 'support',
  prompt: 'How do I withdraw my earnings?',
  context: {}
});
```

## Caching

The AI Gateway includes intelligent caching to reduce costs and improve response times:

- 1-hour cache timeout
- Automatic cache key generation
- Cache statistics tracking
- Expired entry cleanup

## Event Integration

The service listens for `ai.request` events and publishes `ai.response` events, enabling seamless integration with other TiltCheck modules.

## Cost Optimization

- Smart caching reduces repeated API calls
- Model selection (gpt-4o-mini for most tasks)
- Batch processing support
- Rate limiting built-in
- Token usage tracking

## Production Deployment

Replace mock responses with actual AI API calls (OpenAI, Anthropic, etc.):

```javascript
// Example: Replace mock with OpenAI API
async surveyMatching(request) {
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: request.prompt }],
    response_format: { type: 'json_object' }
  });
  
  return {
    success: true,
    data: JSON.parse(completion.choices[0].message.content),
    usage: completion.usage
  };
}
```

## Testing

Run tests:
```bash
pnpm test services/ai-gateway
```

All 7 applications are tested with comprehensive test suites.
