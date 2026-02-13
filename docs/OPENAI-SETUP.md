# OpenAI API Key Configuration Guide

**Status:** Ready to activate  
**Service:** AI Gateway (services/ai-gateway/)  
**Cost Model:** Pay-as-you-go (starting at $0.15/1M tokens for gpt-4o-mini)  
**Estimated Monthly:** $10-50 depending on usage

---

## 📋 Prerequisites

1. **OpenAI Account** - https://platform.openai.com
2. **API Key** - Generate at https://platform.openai.com/api/keys
3. **Active Billing** - Ensure payment method is on file
4. **Railway Dashboard Access** - https://railway.app

---

## 🚀 Step-by-Step Setup

### Step 1: Get OpenAI API Key

1. Go to https://platform.openai.com/account/api-keys
2. Sign in with your OpenAI account (create one if needed)
3. Click **"Create new secret key"**
4. Name it: `tiltcheck-prod`
5. Copy the key (starts with `sk-`)
6. ⚠️ **Save it somewhere safe** - you won't see it again

**Example key format:** `sk-proj-abc123xyz...`

### Step 2: Configure in Railway

#### Option A: Railway CLI (Recommended)

```bash
# Login to Railway
railway login

# Link to TiltCheck project
railway link

# Set the OpenAI API key
railway variables set OPENAI_API_KEY=sk-proj-your-key-here

# Verify it was set
railway variables
```

#### Option B: Railway Dashboard Web UI

1. Go to https://railway.app/dashboard
2. Select **TiltCheck project**
3. Go to **Variables** tab
4. Click **"+ New Variable"**
5. **Name:** `OPENAI_API_KEY`
6. **Value:** `sk-proj-your-key-here` (paste from step 1)
7. Click **Save**

### Step 3: Configure Model (Optional)

The default model is `gpt-4o-mini` (most cost-effective at ~$0.15/1M tokens).

```bash
# Via CLI
railway variables set OPENAI_MODEL=gpt-4o-mini

# Or web UI - same process as above with:
# Name: OPENAI_MODEL
# Value: gpt-4o-mini
```

**Available Models:**
| Model | Cost | Speed | Quality | Recommended For |
|-------|------|-------|---------|-----------------|
| `gpt-4o-mini` | $0.15/1M tokens | ⚡ Fast | ✅ Good | **DEFAULT** - Most users |
| `gpt-3.5-turbo` | $0.50/1M tokens | ⚡⚡ Fastest | ⚠️ Basic | Budget-constrained |
| `gpt-4o` | $2.50/1M tokens | 🐢 Slower | ✅✅ Best | Premium features |

### Step 4: Verify Configuration

```bash
# Check if Railway recognizes the key
railway variables

# Output should show:
# OPENAI_API_KEY=sk-proj-...
# OPENAI_MODEL=gpt-4o-mini (or your chosen model)
```

### Step 5: Restart Services

The AI Gateway will automatically pick up the new environment variables on next deployment.

```bash
# Trigger a deployment
railway up

# Or redeploy from web dashboard:
# 1. Go to Deployments tab
# 2. Click "Redeploy" on latest commit
```

### Step 6: Test the Connection

```bash
# SSH into Railway container
railway shell

# Test the API Gateway is running
curl http://localhost:3002/health

# Expected response:
# {"status":"ok","ai":{"openai":"ready"},"source":"openai"}
```

---

## ✅ Verification Checklist

After configuration:

- [ ] API key set in Railway variables
- [ ] No errors in Railway logs
- [ ] Health check responds with `"source":"openai"`
- [ ] AI features accessible in Discord bot
- [ ] Trivia Drops generating AI questions
- [ ] TiltCheck Core analysis using AI

### View Logs in Railway

```bash
# Stream logs
railway logs --tail

# Look for:
# ✅ "[AI] OpenAI client initialized"
# ✅ "[AI] Model: gpt-4o-mini"
# ⚠️  If you see "[AI] Mock mode", key is not set
```

---

## 💡 What Gets Enabled

Once the OpenAI API key is configured, these features activate:

### 1. **Trivia Drops** (Discord Bot)
- Infinite AI-generated questions
- Category-based trivia
- Difficulty scaling
- Custom themes

**How to test:**
```
/triviadrop start
# Questions will be AI-generated instead of from static bank
```

### 2. **Tilt Detection** (TiltCheck Core)
- Sentiment analysis of chat
- Emotion detection from messages
- Tilt risk scoring
- Intervention recommendations

### 3. **Survey Matching** (QualifyFirst)
- Profile-survey matching analysis
- Match confidence scoring
- Screen-out risk assessment
- Improvement recommendations

### 4. **DA&D Card Generation** (Dad Bot)
- AI-generated custom cards
- Theme-based humor
- Community-specific content

### 5. **Content Moderation** (Everywhere)
- Scam detection on links
- Spam filtering
- Toxicity scoring

### 6. **Message Analysis** (Discord)
- Smart replies
- Context understanding
- Intent classification

### 7. **Casino Trust Analysis**
- AI review of casino behavior
- Trustworthiness scoring
- Risk assessment

---

## 📊 Monitoring Costs

### OpenAI Cost Tracking

1. **Monitor in OpenAI Dashboard:**
   - https://platform.openai.com/account/usage/overview
   - Shows real-time usage and costs

2. **Set Spending Limit (Recommended):**
   - https://platform.openai.com/account/billing/limits
   - Set to `$20/month` for safety

3. **Expected Usage:**
   - Trivia questions: ~100 tokens each (~$0.000015)
   - Trust analysis: ~200 tokens each (~$0.00003)
   - Message analysis: ~50 tokens each (~$0.0000075)
   - **Estimated:** $5-15/month for typical usage

### Example Costs
```
1,000 trivia questions = ~$0.15
500 trust analyses = ~$0.15
10,000 message analyses = ~$0.10
Monthly base estimate: ~$10-20
```

---

## 🔐 Security Best Practices

1. **Never commit the API key** to GitHub
2. **Use Railway secrets** for production
3. **Rotate keys regularly** (every 3-6 months)
4. **Set spending limits** on OpenAI account
5. **Monitor for unusual activity** in logs

### Rotating the Key

If you suspect key compromise:

1. Go to https://platform.openai.com/account/api-keys
2. Delete the old key
3. Create a new key
4. Update Railway variables: `railway variables set OPENAI_API_KEY=sk-new-key`
5. Restart services

---

## 🐛 Troubleshooting

### "Invalid API Key" Error
- Check key starts with `sk-`
- Verify key in Railway matches OpenAI exactly (no spaces)
- Ensure key hasn't been revoked in OpenAI dashboard

### "Quota exceeded" Error
- Check OpenAI usage dashboard
- May need to upgrade to paid account
- Set spending limits to prevent runaway costs

### "Connection timeout" Error
- Railway service not running
- OpenAI API temporarily down (rare)
- Check Railway logs: `railway logs --tail`

### AI Gateway Still in Mock Mode
- Verify variable is set: `railway variables | grep OPENAI`
- Restart service: `railway up`
- Check logs for `"source":"mock"` vs `"source":"openai"`

---

## 📝 .env File (Local Development)

For local testing before deploying to Railway:

```bash
# Copy example
cp services/ai-gateway/.env.example services/ai-gateway/.env

# Edit .env
OPENAI_API_KEY=sk-proj-your-local-key
OPENAI_MODEL=gpt-4o-mini
AI_GATEWAY_PORT=3002
```

Then run locally:
```bash
cd services/ai-gateway
pnpm dev
```

---

## 🎯 Next Steps

1. **Create/get OpenAI API key** (5 min)
2. **Set in Railway via CLI or web UI** (2 min)
3. **Verify in logs** (1 min)
4. **Test Discord bot commands** (5 min)

**Total setup time: ~15 minutes**

---

## 📚 Reference

- **OpenAI Documentation:** https://platform.openai.com/docs
- **Railway Variables:** https://docs.railway.app/develop/variables
- **AI Gateway README:** [services/ai-gateway/README.md](./services/ai-gateway/README.md)
- **Environment Variables:** [SPACESHIP-DEPLOYMENT-ENV.md](./SPACESHIP-DEPLOYMENT-ENV.md)

---

## 🚨 Important Notes

- **First-time OpenAI users:** May need to wait 5-10 minutes for API access to activate
- **Free trial accounts:** Limited to `$5/month` - requires credit card for higher limits
- **Rate limits:** gpt-4o-mini has 10,000 requests/minute (no concerns for typical TiltCheck usage)
- **Fallback mode:** If key not set, service defaults to mock responses (0 cost, limited functionality)

---

**Status:** Ready to configure  
**Deployment Target:** Railway  
**Activation Time:** 5-15 minutes  
**Monthly Cost:** $10-50 (depends on usage)
