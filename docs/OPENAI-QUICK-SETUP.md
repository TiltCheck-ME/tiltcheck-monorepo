# 🤖 Quick OpenAI Setup (2 Minutes)

## Get API Key
```
1. Go to https://platform.openai.com/api/keys
2. Click "Create new secret key"
3. Copy the key (starts with sk-)
```

## Set in Railway
```bash
railway login
railway link
railway variables set OPENAI_API_KEY=sk-proj-your-key
railway variables set OPENAI_MODEL=gpt-4o-mini
```

## Verify
```bash
railway variables
railway logs --tail
# Look for: "source":"openai" in health check response
```

## Cost
- **Model:** gpt-4o-mini (default, cheapest)
- **Cost:** $0.15 per 1M tokens
- **Estimate:** $10-20/month typical usage
- **Set limit:** https://platform.openai.com/account/billing/limits → $20/month

## What Activates
✅ AI trivia questions  
✅ Tilt detection  
✅ Survey matching  
✅ Card generation  
✅ Content moderation  
✅ Casino trust analysis  

## Troubleshoot
```bash
# Check if set
railway variables | grep OPENAI

# Restart service
railway up

# View detailed logs
railway logs --tail
```

---

**That's it! Service auto-restarts with new key.**
