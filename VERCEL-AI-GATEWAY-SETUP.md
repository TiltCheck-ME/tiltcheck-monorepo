# Vercel AI Gateway Configuration

**Status:** ✅ Configured  
**API Key:** `vck_4gzb6XZkr8xlKoPR7YxX8oktezoCaePWG0gWT2CAfczOCyZfVp3a8bR7`  
**Environment:** `.env.local` (local development)  
**Deployment:** Ready for Railway production

---

## What is Vercel AI Gateway?

Vercel AI Gateway is a **managed routing layer** for LLM APIs with built-in features:

- **Multi-provider support** (OpenAI, Anthropic, Google, Mistral, etc.)
- **Automatic load balancing** across providers
- **Built-in caching** to reduce costs
- **Rate limiting & quota management**
- **Request/response logging & analytics**
- **Cost tracking per model/endpoint**

---

## Configuration

### Local Development (Configured)
```
VERCEL_AI_GATEWAY_API_KEY=vck_4gzb6XZkr8xlKoPR7YxX8oktezoCaePWG0gWT2CAfczOCyZfVp3a8bR7
```

This key is set in `.env.local` for local development and testing.

### Production Deployment

To enable in Railway production:

```bash
# Via Railway CLI
railway variables set VERCEL_AI_GATEWAY_API_KEY=vck_4gzb6XZkr8xlKoPR7YxX8oktezoCaePWG0gWT2CAfczOCyZfVp3a8bR7

# Or via Railway Dashboard:
# 1. Go to Variables tab
# 2. Add: VERCEL_AI_GATEWAY_API_KEY = vck_4gzb...
# 3. Redeploy services
```

---

## Usage

### Option 1: Direct OpenAI (Current - Simpler)
```bash
OPENAI_API_KEY=sk-proj-...
```
- Direct connection to OpenAI
- Simple, cost-effective
- No routing layer needed

### Option 2: Vercel AI Gateway (Enhanced)
```bash
VERCEL_AI_GATEWAY_API_KEY=vck_...
AI_GATEWAY_URL=https://api.vercel.ai/v1
```
- Uses Vercel's managed routing
- Built-in caching & analytics
- Multi-provider failover
- Better monitoring

---

## Use Cases

### When to Use Vercel AI Gateway:
✅ **Multi-provider setup** - Want to switch between OpenAI, Claude, Mistral  
✅ **Cost optimization** - Leverage caching to reduce token usage  
✅ **Production monitoring** - Built-in logging and cost tracking  
✅ **High availability** - Automatic failover between providers  
✅ **Rate limiting** - Need fine-grained quota management  

### When to Use Direct OpenAI:
✅ **Simple setup** - Just need OpenAI, no multi-provider needs  
✅ **Fast iteration** - Direct API with fewer moving parts  
✅ **Lower complexity** - Fewer configuration options  

---

## Current Setup

TiltCheck is using **Direct OpenAI** for simplicity:

```
Services/AI-Gateway
├── OPENAI_API_KEY (primary)
├── OPENAI_MODEL (gpt-4o-mini)
└── Fallback to mock mode if key not set
```

### To Migrate to Vercel AI Gateway:

1. **Keep existing setup** - Direct OpenAI works fine
2. **Optional: Add Vercel route** - For advanced use cases
3. **Monitor costs** - Both track usage

---

## Features Enabled

With either OpenAI or Vercel AI Gateway:

✅ **AI Trivia Generation** - Infinite questions for TriviaDrops  
✅ **Tilt Detection** - Sentiment/emotion analysis from chat  
✅ **Survey Matching** - Profile-survey compatibility scoring  
✅ **Card Generation** - DA&D custom cards  
✅ **Content Moderation** - Scam/spam detection  
✅ **Casino Analysis** - Trustworthiness assessment  

---

## Cost Comparison

### Direct OpenAI
- **Model:** gpt-4o-mini at $0.15/1M tokens
- **Monthly estimate:** $10-20
- **Caching:** No built-in caching

### Vercel AI Gateway (with Caching)
- **Same token cost** + gateway fee (~5-10%)
- **Reduced tokens** due to caching (20-40% savings)
- **Net result:** Similar or slightly cheaper after caching benefits
- **Added value:** Analytics, monitoring, multi-provider support

---

## Monitoring & Analytics

### OpenAI Dashboard
- https://platform.openai.com/account/usage/overview
- Real-time token usage
- Cost tracking by model

### Vercel AI Gateway Dashboard
- https://vercel.com/dashboard/settings
- Request analytics
- Cache hit rates
- Provider failover events
- Cost breakdown by provider

---

## Switching Between Providers

Both configurations can coexist. The AI Gateway service checks in this order:

```javascript
1. VERCEL_AI_GATEWAY_API_KEY → Use Vercel AI Gateway
2. OPENAI_API_KEY → Use Direct OpenAI
3. Neither set → Use mock responses
```

To switch:
```bash
# Add to Railway (don't remove OpenAI key, just add Vercel key)
railway variables set VERCEL_AI_GATEWAY_API_KEY=vck_...

# Service will automatically use Vercel Gateway
# Fallback to OpenAI if Vercel fails
# Fallback to mock if both fail
```

---

## Next Steps

### If Using Direct OpenAI (Current Recommendation)
- ✅ Already working
- Set OPENAI_API_KEY in Railway
- Monitor costs at OpenAI dashboard

### If Using Vercel AI Gateway (Optional)
- Set VERCEL_AI_GATEWAY_API_KEY in Railway
- Configure provider routing in Vercel dashboard
- Monitor analytics in Vercel dashboard

### For Both (Maximum Reliability)
- Set both keys in Railway
- Service automatically routes to Vercel, falls back to OpenAI
- Best of both worlds with cost optimization

---

## Security Notes

- ⚠️ **Never commit** API keys to GitHub
- ✅ **Use Railway secrets** for production
- ✅ **Rotate keys** every 3-6 months
- ✅ **Set spending limits** on both OpenAI and Vercel
- ✅ **Monitor logs** for unusual activity

---

## Verification

### Local Testing
```bash
cd services/ai-gateway
pnpm dev

# Should show:
# [AI] OpenAI client initialized
# OR
# [AI] Vercel AI Gateway initialized
```

### Production Testing
```bash
railway shell
curl http://localhost:3002/health

# Response should show:
# {"status":"ok","ai":{"openai":"ready"}}
# OR
# {"status":"ok","ai":{"vercel":"ready"}}
```

---

## Troubleshooting

### "Vercel API key invalid"
- Verify key starts with `vck_`
- Check key hasn't expired in Vercel console
- Ensure correct environment set in Railway

### "Falling back to OpenAI"
- Vercel key may be invalid, using OpenAI fallback
- Check Railway logs for specific error
- Both working = redundancy is good

### "Mock mode active"
- Neither Vercel nor OpenAI key is set
- Set at least one in Railway variables

---

## Reference

- **Vercel AI Gateway Docs:** https://sdk.vercel.ai/docs/ai-gateway
- **OpenAI API Reference:** https://platform.openai.com/docs
- **AI Gateway Implementation:** [services/ai-gateway/](./services/ai-gateway/)
- **Environment Guide:** [SPACESHIP-DEPLOYMENT-ENV.md](./SPACESHIP-DEPLOYMENT-ENV.md)

---

**Status:** ✅ Ready to Deploy  
**Configured In:** `.env.local`  
**Deployment Target:** Railway (when ready)  
**Recommendation:** Keep Direct OpenAI for now, Vercel optional for advanced use
