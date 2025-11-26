# AI Gateway Service

AI-powered intelligence for TiltCheck ecosystem with 7 core applications.

## Quick Start

### 1. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

### 2. Environment Variables
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | **Yes** | - | Your OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model to use (gpt-4o, gpt-4o-mini, gpt-3.5-turbo) |
| `AI_GATEWAY_PORT` | No | `3002` | HTTP server port |

### 3. Run the Service
```bash
# Development
pnpm dev

# Production
pnpm start
```

### 4. Fallback Mode
If `OPENAI_API_KEY` is not set, the service runs in **mock mode** with predefined responses. This is useful for development and testing without API costs.

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

The AI Gateway is **production-ready** with OpenAI integration:

1. Set `OPENAI_API_KEY` environment variable
2. Optionally set `OPENAI_MODEL` (default: `gpt-4o-mini` for cost efficiency)
3. Deploy to any Node.js host (Render, Railway, Fly.io, etc.)

### Response Format
All responses include a `source` field indicating whether the response came from:
- `openai` - Real OpenAI API response
- `mock` - Fallback mock response (when API unavailable)

```javascript
{
  success: true,
  data: { ... },
  usage: { promptTokens: 150, completionTokens: 100, totalTokens: 250 },
  source: 'openai'  // or 'mock'
}
```

### Cost Estimates (gpt-4o-mini)
| Application | ~Tokens/Request | ~Cost/1000 Requests |
|-------------|-----------------|---------------------|
| Survey Matching | 250 | $0.04 |
| Card Generation | 500 | $0.08 |
| Moderation | 180 | $0.03 |
| Tilt Detection | 400 | $0.06 |
| NL Commands | 90 | $0.01 |
| Recommendations | 500 | $0.08 |
| Support | 220 | $0.04 |

## Fly.io Deployment

### 1. Install Fly CLI
```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 2. Login & Create App
```bash
cd services/ai-gateway
fly auth login
fly launch --no-deploy
```

### 3. Set Secrets
```bash
# Required: OpenAI API Key
fly secrets set OPENAI_API_KEY=sk-your-api-key-here

# Optional: Model selection (default: gpt-4o-mini)
fly secrets set OPENAI_MODEL=gpt-4o-mini
```

### 4. Deploy
```bash
fly deploy
```

### 5. Verify Deployment
```bash
# Check status
fly status

# View logs
fly logs

# Test health endpoint
curl https://tiltcheck-ai-gateway.fly.dev/health
```

### 6. Test API Endpoints
```bash
# Test moderation
curl -X POST https://tiltcheck-ai-gateway.fly.dev/api/moderation \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Check this link!", "context": {"url": "https://example.com"}}'

# Test support
curl -X POST https://tiltcheck-ai-gateway.fly.dev/api/support \
  -H "Content-Type: application/json" \
  -d '{"prompt": "How do I withdraw my earnings?"}'
```

### Fly.io Free Tier
- 3 shared-cpu-1x VMs with 256MB RAM
- 160GB outbound data transfer
- Perfect for AI Gateway (low memory, burst CPU)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check with status |
| GET | `/status` | Service status and available applications |
| POST | `/api/process` | Generic AI processing (specify `application` in body) |
| POST | `/api/survey-matching` | Survey matching intelligence |
| POST | `/api/card-generation` | DA&D card generation |
| POST | `/api/moderation` | Content moderation |
| POST | `/api/tilt-detection` | Tilt/gambling behavior analysis |
| POST | `/api/nl-commands` | Natural language command parsing |
| POST | `/api/recommendations` | Personalized recommendations |
| POST | `/api/support` | AI-powered user support |
| GET | `/api/cache/stats` | Cache statistics |
| POST | `/api/cache/clear` | Clear expired cache |

## Testing

Run tests:
```bash
pnpm test services/ai-gateway
```

All 7 applications are tested with comprehensive test suites.
