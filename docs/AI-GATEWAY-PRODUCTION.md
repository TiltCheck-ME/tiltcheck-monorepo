# AI Gateway Production Configuration Guide

**Last Updated:** December 6, 2025  
**Status:** Production Ready ✅

## Overview

The AI Gateway provides intelligent AI-powered features for TiltCheck using OpenAI's GPT models. It automatically falls back to mock responses when API keys are not configured, making it safe for development and testing.

## Features

The AI Gateway powers 7 core AI applications:

1. **Survey Matching** - Match user preferences to casino recommendations
2. **Card Generation** - Generate dynamic help cards and guides
3. **Moderation** - AI-assisted content moderation
4. **Tilt Detection** - Advanced behavioral analysis for gambling tilt
5. **Natural Language Commands** - Process conversational bot commands
6. **Recommendations** - Personalized casino and game suggestions
7. **Support** - Automated support responses

## Architecture

```
┌─────────────────┐
│  Discord Bot    │
│  DA&D Module    │
│  TiltCheck Core │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│   AI Gateway Service    │
│  ┌──────────────────┐   │
│  │  Response Cache  │   │
│  │  (1 hour TTL)    │   │
│  └──────────────────┘   │
│  ┌──────────────────┐   │
│  │  OpenAI Client   │   │
│  │  (when configured)│  │
│  └──────────────────┘   │
│  ┌──────────────────┐   │
│  │  Mock Responses  │   │
│  │  (fallback)      │   │
│  └──────────────────┘   │
└─────────────────────────┘
```

## Configuration Modes

### Development Mode (Default)

No API key required - uses intelligent mock responses:

```env
# .env.local or leave empty
# OPENAI_API_KEY not set
```

**Behavior:**
- ✅ All features functional with mock data
- ✅ Zero API costs
- ✅ Fast responses (no network calls)
- ✅ Deterministic testing
- ✅ No rate limits

**Use Cases:**
- Local development
- CI/CD pipelines
- Integration testing
- Cost-free demos

### Production Mode

Real OpenAI API integration:

```env
# .env or Railway variables
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

**Behavior:**
- ✅ Real AI responses
- ✅ High-quality content generation
- ✅ Contextual understanding
- ✅ Response caching (cost optimization)
- ⚠️ API costs apply
- ⚠️ Rate limits apply

**Use Cases:**
- Production deployments
- User-facing features
- Quality content generation
- Advanced AI capabilities

## Getting Started

### Step 1: Obtain OpenAI API Key

1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to API Keys: https://platform.openai.com/api-keys
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)
6. Store securely - you won't be able to see it again

### Step 2: Configure Environment

#### For Local Development

Create `.env.local`:
```env
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

#### For Railway Deployment

```bash
railway variables set OPENAI_API_KEY="sk-your-api-key-here"
railway variables set OPENAI_MODEL="gpt-4o-mini"
```

#### For Docker Deployment

Add to `docker-compose.yml` or `.env.docker`:
```env
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

### Step 3: Verify Configuration

```bash
# Test AI Gateway locally
cd services/ai-gateway
node -e "import('./dist/index.js').then(m => console.log(m.isProductionMode() ? 'Production' : 'Mock'))"
```

Expected output:
- `Production` - Using OpenAI API
- `Mock` - Using mock responses

## Model Selection

Choose the right model for your use case:

### gpt-4o-mini (Recommended)

**Best for:** Production deployments, cost efficiency

**Pricing:**
- Input: $0.150 per 1M tokens
- Output: $0.600 per 1M tokens

**Characteristics:**
- ✅ Excellent quality for most tasks
- ✅ Very cost-efficient
- ✅ Fast response times
- ✅ Good for high-volume use
- 128K context window

**Monthly Cost Estimate:**
- Light usage (1000 requests): ~$5-10
- Medium usage (10000 requests): ~$20-50
- Heavy usage (50000+ requests): ~$100-200

### gpt-4o

**Best for:** Premium features, complex reasoning

**Pricing:**
- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens

**Characteristics:**
- ✅ Highest quality responses
- ✅ Best reasoning capabilities
- ✅ Superior context understanding
- ⚠️ ~17x more expensive than mini
- 128K context window

**Use when:**
- Maximum quality required
- Complex decision making
- Critical content generation
- Budget allows premium pricing

### gpt-4-turbo

**Best for:** Legacy support

**Pricing:**
- Input: $10.00 per 1M tokens
- Output: $30.00 per 1M tokens

**Note:** Generally superseded by gpt-4o. Use gpt-4o or gpt-4o-mini instead.

## Cost Optimization

### 1. Response Caching

AI Gateway automatically caches responses for 1 hour:

```typescript
// Automatic caching for identical requests
const response1 = await aiGateway.generate('survey-matching', prompt);
const response2 = await aiGateway.generate('survey-matching', prompt);
// response2 served from cache - no API call
```

**Savings:** Up to 80% reduction in API calls for repeated queries

### 2. Use Appropriate Models

```env
# Cost-effective for most features
OPENAI_MODEL=gpt-4o-mini

# Only use gpt-4o for premium features
# OPENAI_MODEL=gpt-4o
```

**Savings:** ~17x cost reduction vs gpt-4o

### 3. Optimize Prompts

Keep prompts concise but clear:

```typescript
// ❌ Expensive - verbose prompt
const verbose = "Please analyze this in great detail with many examples...";

// ✅ Cost-effective - concise prompt
const concise = "Analyze this casino for trust signals";
```

**Savings:** 20-40% token reduction

### 4. Monitor Usage

Track token usage with built-in metrics:

```typescript
import { getAIGateway } from '@tiltcheck/ai-gateway';

const gateway = getAIGateway();
const stats = gateway.getUsageStats();

console.log('Total tokens:', stats.totalTokens);
console.log('Total cost:', stats.estimatedCost);
```

### 5. Set Budget Limits

In OpenAI dashboard (https://platform.openai.com/usage):
1. Go to "Usage limits"
2. Set monthly hard limit
3. Enable email notifications
4. Monitor usage daily

## Production Deployment Checklist

### Pre-Deployment

- [ ] Obtain OpenAI API key
- [ ] Choose appropriate model (gpt-4o-mini recommended)
- [ ] Set usage limits in OpenAI dashboard
- [ ] Configure environment variables
- [ ] Test with small requests first

### Configuration

```bash
# Essential
railway variables set OPENAI_API_KEY="sk-your-key"
railway variables set OPENAI_MODEL="gpt-4o-mini"

# Optional monitoring
railway variables set AI_GATEWAY_LOG_LEVEL="info"
railway variables set AI_GATEWAY_CACHE_TTL="3600"
```

### Post-Deployment

- [ ] Verify API key is active
- [ ] Test each AI application
- [ ] Monitor initial usage
- [ ] Review response quality
- [ ] Adjust cache TTL if needed
- [ ] Set up cost alerts

## Monitoring and Maintenance

### Monitor API Usage

**OpenAI Dashboard:**
1. Visit https://platform.openai.com/usage
2. Review daily/monthly usage
3. Check cost trends
4. Download usage reports

**TiltCheck Logs:**
```bash
# Railway
railway logs --service=discord-bot | grep "AI Gateway"

# Docker
docker logs tiltcheck-bot | grep "AI Gateway"
```

### Common Metrics

Monitor these key indicators:

| Metric | Healthy Range | Action if Outside |
|--------|---------------|-------------------|
| Cache hit rate | >60% | Optimize prompts for reuse |
| Average tokens/request | <500 | Shorten prompts |
| Response time | <2s | Check API status |
| Error rate | <1% | Review error logs |
| Daily cost | As budgeted | Adjust usage or model |

### Cost Alerts

Set up alerts in OpenAI dashboard:

1. **Soft Limit:** 80% of monthly budget
2. **Hard Limit:** 100% of monthly budget
3. **Email Notifications:** Daily usage reports

Example budget settings:
```
Monthly Budget: $50
Soft Limit: $40 (80%)
Hard Limit: $50 (100%)
Daily Notification: Yes
```

## Troubleshooting

### API Key Not Working

**Symptoms:**
- "Invalid API key" errors
- Authentication failures

**Solutions:**
1. Verify key starts with `sk-`
2. Check key has not expired
3. Ensure key is from correct organization
4. Test with curl:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Rate Limit Errors

**Symptoms:**
- "Rate limit exceeded" errors
- 429 HTTP responses

**Solutions:**
1. Upgrade OpenAI tier
2. Implement request queuing
3. Increase cache TTL
4. Reduce concurrent requests

### High Costs

**Symptoms:**
- Unexpected API charges
- Budget alerts triggered

**Solutions:**
1. Review usage in OpenAI dashboard
2. Check for prompt inefficiencies
3. Verify cache is working
4. Consider switching to gpt-4o-mini
5. Implement stricter rate limiting

### Poor Response Quality

**Symptoms:**
- Generic or unhelpful responses
- Missing context
- Incorrect information

**Solutions:**
1. Improve prompt engineering
2. Add more context to prompts
3. Consider upgrading to gpt-4o
4. Review system prompts
5. Add examples to prompts

## API Response Examples

### Survey Matching

**Input:**
```typescript
const result = await aiGateway.generate('survey-matching', {
  preferences: ['high RTP', 'low volatility', 'crypto friendly'],
  budget: 'medium'
});
```

**Output:**
```json
{
  "matches": [
    {
      "casino": "Stake.com",
      "score": 95,
      "reasons": ["Crypto-native", "Proven fair", "High RTP slots"]
    }
  ],
  "reasoning": "Based on your preferences...",
  "confidence": 0.92
}
```

### Tilt Detection

**Input:**
```typescript
const result = await aiGateway.generate('tilt-detection', {
  messages: ["I need my money back", "This is rigged", "One more spin"],
  timeframe: '5m'
});
```

**Output:**
```json
{
  "tiltLevel": "high",
  "signals": ["loss-chasing", "emotional-language", "rigid-thinking"],
  "recommendation": "immediate-cooldown",
  "reasoning": "Multiple tilt indicators present..."
}
```

## Advanced Features

### Custom System Prompts

Override default behavior:

```typescript
import { getAIGateway } from '@tiltcheck/ai-gateway';

const gateway = getAIGateway();
gateway.setSystemPrompt('moderation', `
  You are a casino community moderator focused on responsible gambling.
  Be empathetic but firm. Prioritize user safety.
`);
```

### Token Usage Tracking

```typescript
const result = await gateway.generate('support', prompt);

console.log('Tokens used:', result.usage);
// { promptTokens: 120, completionTokens: 85, totalTokens: 205 }

console.log('Estimated cost:', result.cost);
// $0.0003 (for gpt-4o-mini)
```

### Error Handling

```typescript
try {
  const result = await gateway.generate('recommendations', prompt);
} catch (error) {
  if (error.code === 'rate_limit_exceeded') {
    // Retry with exponential backoff
  } else if (error.code === 'invalid_api_key') {
    // Fall back to mock responses
  } else {
    // Log and alert
  }
}
```

## Security Best Practices

### API Key Security

- ✅ Never commit API keys to git
- ✅ Use environment variables
- ✅ Rotate keys quarterly
- ✅ Use separate keys for dev/prod
- ✅ Monitor for unauthorized usage
- ✅ Enable organization-level controls

### Input Validation

```typescript
// Validate and sanitize all user inputs
const sanitized = sanitizeInput(userMessage);
const result = await gateway.generate('moderation', sanitized);
```

### Output Validation

```typescript
// Verify AI responses before showing to users
if (result.confidence < 0.7) {
  // Use fallback response
  return getMockResponse();
}
```

## Migration from Mock to Production

### Step 1: Test in Staging

```bash
# Deploy to staging with real API key
railway variables set OPENAI_API_KEY="sk-test-key" --environment=staging

# Monitor for 24-48 hours
railway logs --environment=staging | grep "AI Gateway"
```

### Step 2: Gradual Rollout

```typescript
// Feature flag for gradual rollout
const useRealAI = Math.random() < 0.1; // 10% of requests

if (useRealAI && isProductionMode()) {
  return await openaiGateway.generate(app, prompt);
} else {
  return getMockResponse(app, prompt);
}
```

### Step 3: Full Production

```bash
# Deploy to production
railway variables set OPENAI_API_KEY="sk-prod-key" --environment=production

# Monitor closely
railway logs --environment=production --follow
```

## Support and Resources

### Documentation
- [OpenAI API Docs](https://platform.openai.com/docs)
- [OpenAI Pricing](https://openai.com/pricing)
- [OpenAI Rate Limits](https://platform.openai.com/docs/guides/rate-limits)
- [Best Practices](https://platform.openai.com/docs/guides/production-best-practices)

### TiltCheck Resources
- AI Gateway Source: `services/ai-gateway/src/`
- Tests: `services/ai-gateway/tests/`
- Examples: `services/ai-gateway/examples/`

### Getting Help

1. Check troubleshooting section above
2. Review OpenAI status: https://status.openai.com/
3. Check TiltCheck logs
4. Open GitHub issue with sanitized logs

---

**AI Gateway Ready for Production!** 🤖✨
