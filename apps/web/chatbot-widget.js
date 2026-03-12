/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * TiltCheck AI Chatbot Widget
 * Global floating chatbot available on all pages
 * Integrates with AI gateway/Ollama-compatible chat endpoints
 */

(function() {
  // Only load once
  if (window.TiltCheckChatbotLoaded) return;
  window.TiltCheckChatbotLoaded = true;

  const CHATBOT_ID = 'tiltcheck-chatbot-widget';
  const STORAGE_KEY = 'tiltcheck-chat-history';
  const ANALYTICS_KEY = 'tiltcheck-chatbot-analytics';
  const API_ENDPOINT =
    process.env.OLLAMA_URL ||
    process.env.AI_CHAT_ENDPOINT ||
    process.env.VERCEL_AI_GATEWAY_API_URL ||
    'https://api.vercel.ai';
  const API_KEY = process.env.VERCEL_AI_GATEWAY_API_KEY || process.env.AI_CHAT_API_KEY || '';
  const CHAT_MODEL = process.env.AI_MODEL || process.env.OLLAMA_MODEL || 'llama3.2:1b';
  const IS_OLLAMA_ENDPOINT = /localhost:11434|\/v1$/i.test(API_ENDPOINT) || !!process.env.OLLAMA_URL;
  const ENABLE_AI_GATEWAY = IS_OLLAMA_ENDPOINT || !!API_KEY;

  // Knowledge base for quick responses
  const KNOWLEDGE_BASE = {
    'casino trust': {
      keywords: /casino trust|trust score|casino score/i,
      answer: `Casino Trust Scores are calculated based on 5 key metrics:\n\n📊 **Fairness (20%)** - RTP verification, license check, payout rates\n💬 **Support (20%)** - Response time, ratings, complaint resolution\n💰 **Payouts (20%)** - Speed, completion rate, withdrawal disputes\n⚖️ **Compliance (20%)** - Jurisdiction, licensing, reputation\n🎁 **Bonus Quality (20%)** - Terms fairness, wagering limits\n\nScores range from 0-100, updated every 6 hours. Currently monitoring 10 major casinos. Visit https://tiltcheck.me/casinos to see all scores and vote for the next casino to analyze!`
    },
    'discord commands': {
      keywords: /discord|command|bot|\/|slash/i,
      answer: `Popular TiltCheck Discord Bot Commands:\n\n/scan <url> - Scan a URL with SusLink\n/trust casino <name> - Check casino trust score\n/trust user <@user> - Check degen trust score\n/triviadrop start - Play trivia with rewards\n/justthetip - Send non-custodial crypto tips\n/tiltcheck status - Check your tilt status\n/help - Show all commands\n\nJoin our Discord: https://discord.gg/s6NNfPHxMS`
    },
    'tilt detection': {
      keywords: /tilt|tilt detection|emotion|risky|cooldown/i,
      answer: `Tilt Detection uses AI to analyze your gameplay behavior:\n\n🎮 **Real-time Monitoring** - Tracks your chat, bet patterns, and session duration\n😤 **Emotion Analysis** - Detects frustration, tilt, or risky behavior\n⏸️ **Smart Interventions** - Cooldowns, session limits, vault locks\n📊 **Analytics** - Personal tilt score, risk patterns, improvement tracking\n🔐 **Vault** - Auto-lock funds when tilt is detected\n\nUse the TiltCheck Chrome Extension on supported casinos to activate real-time protection. Download: https://tiltcheck.me/extension`
    },
    'justthetip': {
      keywords: /justthetip|tipping|crypto tip|send tip|tip friend/i,
      answer: `JustTheTip is TiltCheck's non-custodial crypto tipping system:\n\n💸 **Send Tips** - Send SOL, USDC, or other tokens to friends\n🔐 **Non-Custodial** - You control your wallet, we never hold funds\n⚡ **Instant** - Tips settle on Solana blockchain in seconds\n🎁 **Rewards** - Earn trust score boosts by sending tips\n💰 **Track Tips** - View all tips sent/received in your dashboard\n🤝 **Community** - Support friends and community members\n\nUse /justthetip in Discord to get started!`
    },
    'suslink': {
      keywords: /suslink|link scan|scan url|phishing|malware|scam/i,
      answer: `SusLink is your personal link scanner for casino safety:\n\n🔍 **URL Analysis** - Detects phishing, malware, scams\n⚠️ **Risk Scoring** - 0-100 risk level for any casino link\n🌐 **Domain Verification** - Checks domain age, SSL, reputation\n📱 **Real-time Alerts** - Warns you before you click suspicious links\n✅ **Community Reports** - Crowdsourced risk data from users\n🚨 **Phishing DB** - Updated hourly with latest threats\n\nUse /scan <url> in Discord or visit https://tiltcheck.me/extension`
    },
    'extension': {
      keywords: /extension|chrome|install|sidebar|download/i,
      answer: `TiltCheck Chrome Extension Features:\n\n📌 **Sidebar UI** - Injected on casino sites for easy access\n👤 **Quick Auth** - Login with Discord or guest account\n💰 **Session Stats** - Real-time P/L, balance, session time\n😤 **Tilt Score** - Live tilt detection and warnings\n🔐 **Vault Controls** - Lock funds when tilt detected\n🎮 **Game Info** - RTP, paylines, bonus info per game\n🔍 **Link Protection** - SusLink integration for safe browsing\n⚡ **Instant Tips** - Send JustTheTip directly from extension\n\nDownload: https://tiltcheck.me/extension`
    },
    'dashboard': {
      keywords: /dashboard|account|profile|stats|analytics|session/i,
      answer: `Your TiltCheck Dashboard provides:\n\n📊 **Session Analytics** - Detailed P/L tracking and trends\n🏆 **Trust Scores** - Your personal trust score and rank\n💰 **Wallet Integration** - SOL and token balance tracking\n🎮 **Game History** - All sessions with AI-detected patterns\n😤 **Tilt Analysis** - Identify your tilt triggers and patterns\n🔐 **Security** - API keys, connected accounts, privacy settings\n📈 **Leaderboards** - Compare with community members\n⚙️ **Settings** - Customize alerts, themes, and preferences\n\nVisit: https://tiltcheck.me/dashboard`
    },
    'getting started': {
      keywords: /start|begin|how do i|tutorial|beginner|new/i,
      answer: `Getting Started with TiltCheck:\n\n1. **Join Discord** - https://discord.gg/s6NNfPHxMS\n2. **Install Extension** - Get TiltCheck Chrome Extension\n3. **Set Up Dashboard** - Visit https://tiltcheck.me/dashboard\n4. **Explore Tools** - Try SusLink, Trust Scores, Trivia\n5. **Enable Tilt Detection** - Activate on supported casinos\n6. **Connect Wallet** - For JustTheTip tipping features\n7. **Check FAQ** - https://tiltcheck.me/faq\n\nEverything is FREE! No paywalls, no catches. Community-first approach.`
    },
    'trivia': {
      keywords: /trivia|triviadrop|game|quiz|earn/i,
      answer: `TriviaDrop is our free trivia game with crypto rewards:\n\n🎮 **Daily Quizzes** - Answer questions about crypto, casinos, sports\n🏆 **Earn Rewards** - Win SOL tokens for correct answers\n📈 **Leaderboards** - Compete with other players\n💰 **Streaks** - Build winning streaks for bonus multipliers\n🎁 **Weekly Prizes** - Top players get special rewards\n⏱️ **Timed Challenges** - Speed bonus for quick correct answers\n\nUse /triviadrop start in Discord or visit https://tiltcheck.me/trivia`
    },
    'premium': {
      keywords: /premium|paid|subscription|upgrade|cost|price/i,
      answer: `TiltCheck is completely FREE! All core features are available at no cost:\n\n✅ Casino trust scores\n✅ SusLink URL scanning\n✅ Discord bot (all commands)\n✅ JustTheTip tipping\n✅ Tilt detection\n✅ Chrome extension\n✅ Analytics dashboard\n✅ Trivia games\n✅ Community features\n\nWe believe in making degenerate safety accessible to everyone. Future premium features (if any) will be optional add-ons.`
    },
    'voting': {
      keywords: /vote|voting|nominate|next casino|which casino/i,
      answer: `Casino Trust Score Voting:\n\n🗳️ **Vote for Next Casino** - Nominate which casino should be analyzed next\n📊 **See Rankings** - View top nominated casinos in real-time\n💬 **Community Driven** - Your vote directly influences our roadmap\n🎯 **One Vote Per Casino** - Vote multiple times to increase priority\n⏱️ **Fresh Weekly** - Results reset weekly to keep it fair\n\nVisit https://tiltcheck.me/casinos to vote now! Currently monitoring stake.com, shuffle.com, stake.us, shuffle.us, luckybird.io, crowncoins.com, chanced.com, lonestar.com, myprize.us, and gamba.com.`
    }
  };

  const SYSTEM_PROMPT = `You are TiltCheck's helpful AI assistant. TiltCheck is an ecosystem of tools for responsible casino gaming and crypto community features. 

Core Features:
- Casino Trust Scores (0-100 based on fairness, support, payouts, compliance, bonuses)
- SusLink: URL/link scanner detecting phishing and malware
- Tilt Detection: AI emotional analysis to prevent problem gambling
- JustTheTip: Non-custodial crypto tipping on Solana
- TriviaDrop: Free daily trivia games with SOL rewards
- Discord Bot: 50+ commands for casino data, trust scores, commands
- Chrome Extension: Real-time tilt detection and casino sidebar UI
- Degen Trust System: Community trust scoring
- Dashboard: Analytics, wallet integration, session tracking

Be friendly, concise, and factual. Help users with questions about any TiltCheck feature. Provide links when relevant. Prioritize safety and responsible gaming.`;

  // Create floating button
  function createFloatingButton() {
    const button = document.createElement('button');
    button.id = `${CHATBOT_ID}-button`;
    button.className = 'tiltcheck-chatbot-button';
    button.innerHTML = '💬';
    button.title = 'TiltCheck AI Help';
    button.onclick = toggleChatbot;
    return button;
  }

  // Create chatbot modal
  function createChatbotModal() {
    const modal = document.createElement('div');
    modal.id = `${CHATBOT_ID}-modal`;
    modal.className = 'tiltcheck-chatbot-modal hidden';
    modal.innerHTML = `
      <div class="tiltcheck-chatbot-header">
        <h3>🤖 TiltCheck AI Help</h3>
        <button class="tiltcheck-close-btn" onclick="window.TiltCheckChatbot.toggle()">✕</button>
      </div>
      <div class="tiltcheck-messages" id="${CHATBOT_ID}-messages"></div>
      <div class="tiltcheck-input-area">
        <input 
          type="text" 
          id="${CHATBOT_ID}-input" 
          class="tiltcheck-input" 
          placeholder="Ask anything about TiltCheck..."
          onkeypress="if(event.key==='Enter') window.TiltCheckChatbot.send()"
        >
        <button class="tiltcheck-send-btn" onclick="window.TiltCheckChatbot.send()">Send</button>
      </div>
    `;
    return modal;
  }

  // Add styles
  function injectStyles() {
    if (document.getElementById('tiltcheck-chatbot-styles')) return;

    const style = document.createElement('style');
    style.id = 'tiltcheck-chatbot-styles';
    style.textContent = `
      .tiltcheck-chatbot-button {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #00d4aa 0%, #0099ff 100%);
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 212, 170, 0.3);
        transition: all 0.3s ease;
        z-index: 9998;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .tiltcheck-chatbot-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 20px rgba(0, 212, 170, 0.4);
      }

      .tiltcheck-chatbot-button:active {
        transform: scale(0.95);
      }

      .tiltcheck-chatbot-modal {
        position: fixed;
        bottom: 6rem;
        right: 2rem;
        width: 400px;
        height: 500px;
        background: linear-gradient(to bottom, #1a1a2e 0%, #16213e 100%);
        border: 1px solid rgba(0, 212, 170, 0.2);
        border-radius: 1rem;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        z-index: 9999;
        transition: all 0.3s ease;
      }

      .tiltcheck-chatbot-modal.hidden {
        opacity: 0;
        pointer-events: none;
        transform: translateY(20px);
      }

      .tiltcheck-chatbot-header {
        padding: 1rem;
        border-bottom: 1px solid rgba(0, 212, 170, 0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: rgba(0, 212, 170, 0.05);
      }

      .tiltcheck-chatbot-header h3 {
        margin: 0;
        color: white;
        font-size: 0.95rem;
      }

      .tiltcheck-close-btn {
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        font-size: 1.25rem;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .tiltcheck-close-btn:hover {
        color: white;
      }

      .tiltcheck-messages {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .tiltcheck-message {
        display: flex;
        gap: 0.5rem;
        animation: slideIn 0.3s ease;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .tiltcheck-message.user {
        justify-content: flex-end;
      }

      .tiltcheck-message-content {
        max-width: 80%;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        line-height: 1.4;
        font-size: 0.9rem;
        word-wrap: break-word;
      }

      .tiltcheck-message.assistant .tiltcheck-message-content {
        background: rgba(0, 212, 170, 0.1);
        border: 1px solid rgba(0, 212, 170, 0.3);
        color: #e0e0e0;
      }

      .tiltcheck-message.user .tiltcheck-message-content {
        background: #00d4aa;
        color: #1a1a2e;
        font-weight: 500;
      }

      .tiltcheck-typing {
        display: flex;
        gap: 0.3rem;
        padding: 0.75rem 1rem;
        background: rgba(0, 212, 170, 0.1);
        border-radius: 0.5rem;
      }

      .tiltcheck-dot {
        width: 0.35rem;
        height: 0.35rem;
        background: rgba(0, 212, 170, 0.6);
        border-radius: 50%;
        animation: typing 1.4s infinite;
      }

      .tiltcheck-dot:nth-child(2) { animation-delay: 0.2s; }
      .tiltcheck-dot:nth-child(3) { animation-delay: 0.4s; }

      @keyframes typing {
        0%, 60%, 100% { opacity: 0.3; }
        30% { opacity: 1; }
      }

      .tiltcheck-input-area {
        display: flex;
        gap: 0.5rem;
        padding: 1rem;
        border-top: 1px solid rgba(0, 212, 170, 0.2);
      }

      .tiltcheck-input {
        flex: 1;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(0, 212, 170, 0.2);
        color: white;
        padding: 0.5rem 0.75rem;
        border-radius: 0.35rem;
        font-size: 0.85rem;
        transition: all 0.3s ease;
      }

      .tiltcheck-input:focus {
        outline: none;
        border-color: #00d4aa;
        background: rgba(255, 255, 255, 0.08);
      }

      .tiltcheck-input::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }

      .tiltcheck-send-btn {
        background: #00d4aa;
        color: #1a1a2e;
        border: none;
        border-radius: 0.35rem;
        padding: 0.5rem 1rem;
        font-weight: 600;
        font-size: 0.85rem;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .tiltcheck-send-btn:hover {
        background: #00a8ff;
        transform: translateY(-2px);
      }

      .tiltcheck-send-btn:active {
        transform: translateY(0);
      }

      @media (max-width: 600px) {
        .tiltcheck-chatbot-modal {
          width: 100vw;
          height: 100vh;
          bottom: 0;
          right: 0;
          border-radius: 0;
          max-width: none;
        }

        .tiltcheck-chatbot-button {
          bottom: 1.5rem;
          right: 1.5rem;
        }

        .tiltcheck-message-content {
          max-width: 90%;
        }
      }

      .tiltcheck-messages::-webkit-scrollbar {
        width: 6px;
      }

      .tiltcheck-messages::-webkit-scrollbar-track {
        background: rgba(0, 212, 170, 0.05);
      }

      .tiltcheck-messages::-webkit-scrollbar-thumb {
        background: rgba(0, 212, 170, 0.2);
        border-radius: 3px;
      }

      .tiltcheck-messages::-webkit-scrollbar-thumb:hover {
        background: rgba(0, 212, 170, 0.3);
      }
    `;

    document.head.appendChild(style);
  }

  // Find answer from knowledge base
  function findKnowledgeAnswer(message) {
    for (const key in KNOWLEDGE_BASE) {
      if (KNOWLEDGE_BASE[key].keywords.test(message)) {
        return KNOWLEDGE_BASE[key].answer;
      }
    }
    return null;
  }

  // Chatbot class
  class TiltCheckChatbot {
    constructor() {
      this.messages = this.loadHistory();
      this.isOpen = false;
      this.isLoading = false;
      this.currentPage = this.detectCurrentPage();
      this.analytics = this.loadAnalytics();
      this.feedback = {};  // Store feedback for current session
    }

    // Detect current page for context-aware responses
    detectCurrentPage() {
      const path = window.location.pathname;
      const host = window.location.host;
      
      if (path.includes('/casinos')) return 'casinos';
      if (path.includes('/degen-trust')) return 'degen-trust';
      if (path.includes('/dashboard')) return 'dashboard';
      if (path.includes('/faq')) return 'faq';
      if (path.includes('/about')) return 'about';
      if (path.includes('/extension') || host.includes('chrome')) return 'extension';
      if (path === '/' || path === '/index.html') return 'home';
      return 'general';
    }

    // Analytics tracking
    trackQuestion(question, source = 'knowledge-base') {
      const timestamp = new Date().toISOString();
      this.analytics.questions = this.analytics.questions || [];
      
      this.analytics.questions.push({
        timestamp,
        question: question.substring(0, 100),
        page: this.currentPage,
        source  // 'knowledge-base' or 'ai-gateway'
      });
      
      // Keep last 100 questions
      if (this.analytics.questions.length > 100) {
        this.analytics.questions = this.analytics.questions.slice(-100);
      }
      
      this.saveAnalytics();
    }

    // Track feedback (was this helpful?)
    trackFeedback(messageId, helpful) {
      this.analytics.feedback = this.analytics.feedback || [];
      
      this.analytics.feedback.push({
        timestamp: new Date().toISOString(),
        messageId,
        helpful,  // true/false
        page: this.currentPage
      });
      
      this.saveAnalytics();
      
      // Send to server if available
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/chatbot/feedback', JSON.stringify({
          helpful,
          page: this.currentPage,
          timestamp: new Date().toISOString()
        }));
      }
    }

    loadAnalytics() {
      try {
        const saved = localStorage.getItem(ANALYTICS_KEY);
        return saved ? JSON.parse(saved) : { questions: [], feedback: [], sessions: 0 };
      } catch {
        return { questions: [], feedback: [], sessions: 0 };
      }
    }

    saveAnalytics() {
      try {
        localStorage.setItem(ANALYTICS_KEY, JSON.stringify(this.analytics));
      } catch (e) {
        console.warn('Could not save analytics:', e);
      }
    }

    loadHistory() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [{
          role: 'assistant',
          content: 'Welcome to TiltCheck AI Help! 👋 Ask me anything about casino trust scores, tilt detection, SusLink, JustTheTip, or any TiltCheck feature. What would you like to know?'
        }];
      } catch {
        return [{
          role: 'assistant',
          content: 'Welcome to TiltCheck AI Help! 👋 Ask me anything about casino trust scores, tilt detection, SusLink, JustTheTip, or any TiltCheck feature. What would you like to know?'
        }];
      }
    }

    saveHistory() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.messages));
      } catch (e) {
        console.warn('Could not save chat history:', e);
      }
    }

    toggle() {
      this.isOpen ? this.close() : this.open();
    }

    open() {
      const modal = document.getElementById(`${CHATBOT_ID}-modal`);
      if (modal) {
        modal.classList.remove('hidden');
        this.isOpen = true;
        setTimeout(() => {
          const input = document.getElementById(`${CHATBOT_ID}-input`);
          if (input) input.focus();
        }, 100);
      }
    }

    close() {
      const modal = document.getElementById(`${CHATBOT_ID}-modal`);
      if (modal) {
        modal.classList.add('hidden');
        this.isOpen = false;
      }
    }

    send(message) {
      const input = document.getElementById(`${CHATBOT_ID}-input`);
      const text = message || (input ? input.value.trim() : '');

      if (!text || this.isLoading) return;

      // Track question for analytics
      this.trackQuestion(text);

      // Add user message
      this.messages.push({ role: 'user', content: text });
      this.renderMessage('user', text);
      if (input) input.value = '';

      this.isLoading = true;
      this.showTyping();

      // Check knowledge base first (fast path)
      const knowledgeAnswer = findKnowledgeAnswer(text);
      if (knowledgeAnswer) {
        setTimeout(() => {
          removeTyping();
          const messageId = `kb_${Date.now()}`;
          this.messages.push({ role: 'assistant', content: knowledgeAnswer, id: messageId });
          this.renderMessage('assistant', knowledgeAnswer, messageId);
          this.isLoading = false;
          this.saveHistory();
        }, 300);
      } else if (ENABLE_AI_GATEWAY) {
        // Use configured AI endpoint for smart responses
        this.callAIGateway(text);
      } else {
        // Fallback to suggestions
        this.showFallback();
      }
    }

    showFallback() {
      setTimeout(() => {
        this.removeTyping();
        const fallbackAnswer = `I'm not sure about that specific question. I can help with:\n\n📊 Casino trust scores\n💬 Discord bot commands\n🎮 Tilt detection\n💸 JustTheTip tipping\n🔍 SusLink scanning\n📱 Extension features\n📈 Dashboard\n✅ Getting started\n\nWant to ask about one of these topics?`;
        
        const messageId = `fb_${Date.now()}`;
        this.messages.push({ role: 'assistant', content: fallbackAnswer, id: messageId });
        this.renderMessage('assistant', fallbackAnswer, messageId, true);
        this.isLoading = false;
        this.saveHistory();
      }, 300);
    }

    renderMessage(role, content, messageId, showFeedback = false) {
      const messagesEl = document.getElementById(`${CHATBOT_ID}-messages`);
      if (!messagesEl) return;

      const messageEl = document.createElement('div');
      messageEl.className = `tiltcheck-message ${role}`;
      messageEl.id = messageId || `msg_${Date.now()}`;

      const contentEl = document.createElement('div');
      contentEl.className = 'tiltcheck-message-content';
      contentEl.textContent = content;

      messageEl.appendChild(contentEl);

      // Add feedback buttons for assistant messages
      if (role === 'assistant' && showFeedback !== false) {
        const feedbackEl = document.createElement('div');
        feedbackEl.className = 'tiltcheck-feedback';
        feedbackEl.style.cssText = 'margin-top:8px;display:flex;gap:8px;font-size:0.8rem;';
        feedbackEl.innerHTML = `
          <button class="tiltcheck-feedback-btn" onclick="window.TiltCheckChatbot.trackFeedback('${messageEl.id}', true)" style="background:rgba(0,212,170,0.2);border:1px solid rgba(0,212,170,0.4);color:#00d4aa;padding:4px 8px;border-radius:4px;cursor:pointer;">👍 Helpful</button>
          <button class="tiltcheck-feedback-btn" onclick="window.TiltCheckChatbot.trackFeedback('${messageEl.id}', false)" style="background:rgba(255,107,107,0.2);border:1px solid rgba(255,107,107,0.4);color:#ff6b6b;padding:4px 8px;border-radius:4px;cursor:pointer;">👎 Not helpful</button>
        `;
        messageEl.appendChild(feedbackEl);
      }

      messagesEl.appendChild(messageEl);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    callAIGateway(userMessage) {
      // Context-aware system prompt based on current page
      const contextPrompt = this.getContextPrompt();
      
      const normalizedBase = API_ENDPOINT.replace(/\/$/, '').replace(/\/v1$/i, '');
      const endpoint = `${normalizedBase}/v1/chat/completions`;
      const headers = {
        'Content-Type': 'application/json'
      };
      if (IS_OLLAMA_ENDPOINT) {
        headers['Authorization'] = 'Bearer ollama';
      } else if (API_KEY) {
        headers['Authorization'] = `Bearer ${API_KEY}`;
      }

      fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: CHAT_MODEL,
          messages: [
            { role: 'system', content: contextPrompt },
            ...this.messages.slice(-10).map(m => ({ role: m.role, content: m.content }))  // Last 10 messages for context
          ],
          temperature: 0.7,
          max_tokens: 500,
          stream: false
        })
      })
      .then(response => {
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return response.json();
      })
      .then(data => {
        this.removeTyping();
        const answer = data.choices[0].message.content;
        const messageId = `ai_${Date.now()}`;
        
        this.messages.push({ 
          role: 'assistant', 
          content: answer, 
          id: messageId,
          source: 'ai-gateway'
        });
        
        this.renderMessage('assistant', answer, messageId, true);
        this.isLoading = false;
        this.saveHistory();
        this.trackQuestion(userMessage, 'ai-gateway');
      })
      .catch(error => {
        console.error('AI chat endpoint error:', error);
        this.removeTyping();
        this.showFallback();
      });
    }

    getContextPrompt() {
      const basePrompt = `You are TiltCheck's helpful AI assistant. TiltCheck is an ecosystem of tools for responsible casino gaming and crypto community features.

Core Features:
- Casino Trust Scores (0-100 based on fairness, support, payouts, compliance, bonuses)
- SusLink: URL/link scanner detecting phishing and malware
- Tilt Detection: AI emotional analysis to prevent problem gambling
- JustTheTip: Non-custodial crypto tipping on Solana
- TriviaDrop: Free daily trivia games with SOL rewards
- Discord Bot: 50+ commands for casino data, trust scores, commands
- Chrome Extension: Real-time tilt detection and casino sidebar UI
- Degen Trust System: Community trust scoring
- Dashboard: Analytics, wallet integration, session tracking

Be friendly, concise, and factual. Help users with questions about any TiltCheck feature. Provide links when relevant. Prioritize safety and responsible gaming.`;

      switch (this.currentPage) {
        case 'casinos':
          return basePrompt + `\n\nUser is on the Casino Trust Scores page. Focus on explaining how trust scores work (5-category breakdown: Fairness, Support, Payouts, Compliance, Bonuses), help them understand specific casino scores, and mention the voting feature for next casinos.`;
        
        case 'dashboard':
          return basePrompt + `\n\nUser is on the Dashboard. Focus on dashboard-specific features: session analytics, trust scores, wallet integration, game history, personal tilt analysis, security settings, leaderboards.`;
        
        case 'extension':
          return basePrompt + `\n\nUser is asking about the Chrome Extension. Focus on extension-specific features: sidebar UI, real-time tilt detection, live session stats, game info lookup, vault controls, SusLink link protection.`;
        
        case 'degen-trust':
          return basePrompt + `\n\nUser is on the Degen Trust page. Focus on community trust scoring: how personal trust scores are calculated, trust signals, reputation system, how to improve trust.`;
        
        case 'faq':
          return basePrompt + `\n\nUser is on the FAQ page. Provide clear, concise, structured answers. Link to relevant pages when helpful.`;
        
        default:
          return basePrompt;
      }
    }

    showTyping() {
      const messagesEl = document.getElementById(`${CHATBOT_ID}-messages`);
      if (!messagesEl) return;

      const typingEl = document.createElement('div');
      typingEl.id = `${CHATBOT_ID}-typing`;
      typingEl.className = 'tiltcheck-message assistant';
      typingEl.innerHTML = `
        <div class="tiltcheck-typing">
          <div class="tiltcheck-dot"></div>
          <div class="tiltcheck-dot"></div>
          <div class="tiltcheck-dot"></div>
        </div>
      `;
      messagesEl.appendChild(typingEl);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    removeTyping() {
      const typing = document.getElementById(`${CHATBOT_ID}-typing`);
      if (typing) typing.remove();
    }
  }

  // Initialize when DOM is ready
  function init() {
    injectStyles();

    // Create elements
    const button = createFloatingButton();
    const modal = createChatbotModal();

    document.body.appendChild(button);
    document.body.appendChild(modal);

    // Create global instance
    const chatbot = new TiltCheckChatbot();
    window.TiltCheckChatbot = chatbot;

    // Render initial messages
    const messagesEl = document.getElementById(`${CHATBOT_ID}-messages`);
    if (messagesEl) {
      chatbot.messages.forEach(msg => {
        chatbot.renderMessage(msg.role, msg.content);
      });
    }
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
