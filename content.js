"use strict";
(() => {
  // src/extractor.ts
  var CASINO_SELECTORS = [
    {
      casinoId: "stake",
      domain: "stake.com",
      selectors: {
        betAmount: '[data-test="bet-amount"], .bet-amount',
        winAmount: '[data-test="win-amount"], .win-amount',
        balance: '[data-test="balance"], .balance',
        symbols: ".reel-symbol, [data-symbol]",
        bonusIndicator: '.free-spins-active, [data-bonus="true"]',
        freeSpinsCounter: ".free-spins-count",
        gameTitle: ".game-title, [data-game-name]"
      }
    },
    {
      casinoId: "roobet",
      domain: "roobet.com",
      selectors: {
        betAmount: '.bet-input input, [name="bet"]',
        winAmount: ".win-display, .payout-amount",
        balance: ".user-balance",
        symbols: ".slot-symbol",
        bonusIndicator: ".bonus-round-active"
      }
    },
    {
      casinoId: "bc-game",
      domain: "bc.game",
      selectors: {
        betAmount: '[class*="betAmount"]',
        winAmount: '[class*="winAmount"]',
        balance: '[class*="balance"]',
        symbols: '[class*="symbol"]'
      }
    },
    {
      casinoId: "duelbits",
      domain: "duelbits.com",
      selectors: {
        betAmount: ".bet-value",
        winAmount: ".win-value",
        symbols: "[data-reel] img, .reel-symbol"
      }
    },
    {
      casinoId: "generic",
      domain: "*",
      selectors: {
        betAmount: '[data-bet], .bet, .bet-amount, input[name="bet"]',
        winAmount: "[data-win], .win, .win-amount, .payout",
        balance: "[data-balance], .balance, .user-balance",
        symbols: '[data-symbol], .symbol, .reel-symbol, [class*="symbol"]'
      }
    }
  ];
  var CasinoDataExtractor = class {
    // Don't capture spins faster than 1/sec
    constructor(casinoDomain) {
      this.casinoConfig = null;
      this.previousBalance = null;
      this.lastSpinTime = 0;
      this.spinDebounceMs = 1e3;
      this.detectCasino(casinoDomain);
    }
    /**
     * Detect which casino we're on
     */
    detectCasino(domain) {
      const currentDomain = domain || window.location.hostname;
      this.casinoConfig = CASINO_SELECTORS.find(
        (config) => currentDomain.includes(config.domain) || config.domain === "*"
      ) || CASINO_SELECTORS.find((c) => c.casinoId === "generic");
      console.log("[TiltCheck] Detected casino:", this.casinoConfig.casinoId);
    }
    /**
     * Extract text content from element
     */
    extractText(selector, doc = document) {
      const element = doc.querySelector(selector);
      if (!element) return null;
      const value = element.getAttribute("data-value") || element.getAttribute("value") || element.textContent;
      return value?.trim() || null;
    }
    /**
     * Parse numeric value from text (handles $, commas, etc.)
     */
    parseNumeric(text) {
      if (!text) return null;
      const cleaned = text.replace(/[$,\s]/g, "");
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    }
    /**
     * Extract bet amount
     */
    extractBet(doc = document) {
      if (!this.casinoConfig) return null;
      if (this.casinoConfig.extractors?.extractBet) {
        return this.casinoConfig.extractors.extractBet(doc);
      }
      const selector = this.casinoConfig.selectors.betAmount;
      if (!selector) return null;
      const text = this.extractText(selector, doc);
      return this.parseNumeric(text);
    }
    /**
     * Extract win amount
     */
    extractWin(doc = document) {
      if (!this.casinoConfig) return null;
      if (this.casinoConfig.extractors?.extractWin) {
        return this.casinoConfig.extractors.extractWin(doc);
      }
      const selector = this.casinoConfig.selectors.winAmount;
      if (!selector) return null;
      const text = this.extractText(selector, doc);
      return this.parseNumeric(text);
    }
    /**
     * Extract balance
     */
    extractBalance(doc = document) {
      if (!this.casinoConfig) return null;
      const selector = this.casinoConfig.selectors.balance;
      if (!selector) return null;
      const text = this.extractText(selector, doc);
      return this.parseNumeric(text);
    }
    /**
     * Extract symbols from reels
     */
    extractSymbols(doc = document) {
      if (!this.casinoConfig) return null;
      if (this.casinoConfig.extractors?.extractSymbols) {
        return this.casinoConfig.extractors.extractSymbols(doc);
      }
      const selector = this.casinoConfig.selectors.symbols;
      if (!selector) return null;
      const elements = Array.from(doc.querySelectorAll(selector));
      if (elements.length === 0) return null;
      return elements.map((el) => {
        const dataSymbol = el.getAttribute("data-symbol");
        if (dataSymbol) return dataSymbol;
        const alt = el.getAttribute("alt");
        if (alt) return alt;
        const src = el.getAttribute("src");
        if (src) {
          const filename = src.split("/").pop()?.split(".")[0];
          if (filename) return filename;
        }
        return el.textContent?.trim() || "unknown";
      });
    }
    /**
     * Check if bonus round is active
     */
    isBonusActive(doc = document) {
      if (!this.casinoConfig) return false;
      const selector = this.casinoConfig.selectors.bonusIndicator;
      if (!selector) return false;
      return doc.querySelector(selector) !== null;
    }
    /**
     * Extract free spins count
     */
    extractFreeSpinsCount(doc = document) {
      if (!this.casinoConfig) return null;
      const selector = this.casinoConfig.selectors.freeSpinsCounter;
      if (!selector) return null;
      const text = this.extractText(selector, doc);
      return this.parseNumeric(text);
    }
    /**
     * Extract game title
     */
    extractGameTitle(doc = document) {
      if (!this.casinoConfig) return null;
      const selector = this.casinoConfig.selectors.gameTitle;
      if (!selector) return null;
      return this.extractText(selector, doc);
    }
    /**
     * Attempt to extract a complete spin event
     */
    extractSpinEvent(doc = document) {
      const now = Date.now();
      if (now - this.lastSpinTime < this.spinDebounceMs) {
        return null;
      }
      const bet = this.extractBet(doc);
      const win = this.extractWin(doc);
      const balance = this.extractBalance(doc);
      if (bet === null && win === null) {
        return null;
      }
      const symbols = this.extractSymbols(doc);
      const bonusActive = this.isBonusActive(doc);
      const freeSpins = this.extractFreeSpinsCount(doc);
      const gameTitle = this.extractGameTitle(doc);
      if (balance !== null && this.previousBalance !== null) {
        const balanceChange = balance - this.previousBalance;
        if (Math.abs(balanceChange) > 0.01) {
          this.lastSpinTime = now;
          this.previousBalance = balance;
          return {
            bet: bet !== null ? bet : Math.abs(balanceChange) - (win || 0),
            win: win !== null ? win : 0,
            balance,
            symbols,
            bonusActive,
            freeSpins,
            gameTitle,
            timestamp: now
          };
        }
      } else if (balance !== null) {
        this.previousBalance = balance;
      }
      return null;
    }
    /**
     * Start observing the DOM for gameplay
     */
    startObserving(callback) {
      console.log("[TiltCheck] Starting DOM observation...");
      const pollInterval = setInterval(() => {
        const spinData = this.extractSpinEvent();
        if (spinData) {
          callback(spinData);
        }
      }, 500);
      const observer = new MutationObserver(() => {
        const spinData = this.extractSpinEvent();
        if (spinData) {
          callback(spinData);
        }
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-value", "value", "class"]
      });
      return () => {
        clearInterval(pollInterval);
        observer.disconnect();
        console.log("[TiltCheck] Stopped DOM observation");
      };
    }
  };
  var AnalyzerClient = class {
    constructor(wsUrl) {
      this.wsUrl = wsUrl;
      this.ws = null;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;
      this.reconnectDelay = 2e3;
    }
    /**
     * Connect to analyzer backend
     */
    connect() {
      return new Promise((resolve, reject) => {
        console.log("[TiltCheck] Connecting to analyzer...", this.wsUrl);
        this.ws = new WebSocket(this.wsUrl);
        this.ws.onopen = () => {
          console.log("[TiltCheck] Connected to analyzer");
          this.reconnectAttempts = 0;
          resolve();
        };
        this.ws.onerror = (error) => {
          console.error("[TiltCheck] WebSocket error:", error);
          reject(error);
        };
        this.ws.onclose = () => {
          console.log("[TiltCheck] Disconnected from analyzer");
          this.attemptReconnect();
        };
      });
    }
    /**
     * Attempt to reconnect
     */
    attemptReconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error("[TiltCheck] Max reconnect attempts reached");
        return;
      }
      this.reconnectAttempts++;
      console.log(`[TiltCheck] Reconnecting in ${this.reconnectDelay}ms... (attempt ${this.reconnectAttempts})`);
      setTimeout(() => {
        this.connect().catch((err) => {
          console.error("[TiltCheck] Reconnect failed:", err);
        });
      }, this.reconnectDelay);
    }
    /**
     * Send spin data to analyzer
     */
    sendSpin(data) {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.warn("[TiltCheck] WebSocket not connected, buffering spin data");
        return;
      }
      this.ws.send(JSON.stringify({
        type: "spin",
        data
      }));
    }
    /**
     * Request fairness report
     */
    requestReport(sessionId2) {
      return new Promise((resolve, reject) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          reject(new Error("WebSocket not connected"));
          return;
        }
        const messageHandler = (event) => {
          const message = JSON.parse(event.data);
          if (message.type === "report" && message.sessionId === sessionId2) {
            this.ws.removeEventListener("message", messageHandler);
            resolve(message.data);
          }
        };
        this.ws.addEventListener("message", messageHandler);
        this.ws.send(JSON.stringify({
          type: "request_report",
          sessionId: sessionId2
        }));
        setTimeout(() => {
          this.ws.removeEventListener("message", messageHandler);
          reject(new Error("Report request timeout"));
        }, 5e3);
      });
    }
    /**
     * Close connection
     */
    disconnect() {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    }
  };

  // src/tilt-detector.ts
  var TiltDetector = class {
    constructor(initialBalance) {
      this.bets = [];
      this.clicks = [];
      // Timestamps of clicks
      this.sessionStartTime = Date.now();
      this.baselineAvgBet = 0;
      this.consecutiveLosses = 0;
      this.totalWagered = 0;
      this.currentBalance = 0;
      this.initialBalance = 0;
      // Configuration
      this.config = {
        // Rage betting thresholds
        fastBetThreshold: 2e3,
        // ms between bets
        rageBetCount: 5,
        // consecutive fast bets
        // Chasing losses
        betIncreaseMultiplier: 2.5,
        // 2.5x increase after loss
        chasingPattern: 3,
        // consecutive increasing bets after losses
        // Fast clicks
        clickThreshold: 5,
        // clicks in window
        clickWindow: 3e3,
        // ms
        // Session duration
        warningDuration: 60 * 60 * 1e3,
        // 1 hour
        criticalDuration: 2 * 60 * 60 * 1e3,
        // 2 hours
        // Vault recommendations
        vaultThreshold: 5,
        // 5x initial balance
        profitVaultPercent: 0.5,
        // Vault 50% of profits
        // Stop loss
        stopLossPercent: 0.5,
        // Stop at 50% loss
        // Real-world comparisons (common items people forget to buy)
        realWorldItems: [
          { item: "trash bags", avgCost: 15 },
          { item: "toilet paper", avgCost: 20 },
          { item: "groceries", avgCost: 100 },
          { item: "gas", avgCost: 50 },
          { item: "phone bill", avgCost: 80 },
          { item: "utilities", avgCost: 150 },
          { item: "rent", avgCost: 1500 }
        ]
      };
      this.currentBalance = initialBalance;
      this.initialBalance = initialBalance;
    }
    /**
     * Record a bet event
     */
    recordBet(bet, payout) {
      const now = Date.now();
      const result = payout > 0 ? "win" : "loss";
      this.bets.push({
        amount: bet,
        timestamp: now,
        result,
        payout
      });
      this.totalWagered += bet;
      this.currentBalance = this.currentBalance - bet + payout;
      if (result === "loss") {
        this.consecutiveLosses++;
      } else {
        this.consecutiveLosses = 0;
      }
      if (this.bets.length <= 10) {
        this.baselineAvgBet = this.bets.reduce((sum, b) => sum + b.amount, 0) / this.bets.length;
      }
    }
    /**
     * Record a click event (for erratic clicking detection)
     */
    recordClick() {
      const now = Date.now();
      this.clicks.push(now);
      this.clicks = this.clicks.filter((t) => now - t < this.config.clickWindow);
    }
    /**
     * Detect rage betting (fast consecutive bets)
     */
    detectRageBetting() {
      if (this.bets.length < this.config.rageBetCount) return null;
      const recentBets = this.bets.slice(-this.config.rageBetCount);
      const intervals = [];
      for (let i = 1; i < recentBets.length; i++) {
        intervals.push(recentBets[i].timestamp - recentBets[i - 1].timestamp);
      }
      const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length;
      if (avgInterval < this.config.fastBetThreshold) {
        const severity = avgInterval < 1e3 ? "critical" : avgInterval < 1500 ? "high" : "medium";
        return {
          type: "rage_betting",
          severity,
          confidence: Math.min(1, this.config.fastBetThreshold / avgInterval - 1),
          description: `Betting very quickly (${(avgInterval / 1e3).toFixed(1)}s between bets)`,
          evidence: {
            avgInterval,
            recentBets: recentBets.length,
            threshold: this.config.fastBetThreshold
          },
          triggeredAt: Date.now()
        };
      }
      return null;
    }
    /**
     * Detect chasing losses (increasing bets after losses)
     */
    detectChasingLosses() {
      if (this.bets.length < this.config.chasingPattern + 1) return null;
      if (this.consecutiveLosses < this.config.chasingPattern) return null;
      const recentBets = this.bets.slice(-this.config.chasingPattern - 1);
      const isChasing = recentBets.every((bet, i) => {
        if (i === 0) return true;
        return bet.amount > recentBets[i - 1].amount * this.config.betIncreaseMultiplier;
      });
      if (isChasing) {
        const increase = recentBets[recentBets.length - 1].amount / recentBets[0].amount;
        const severity = increase > 10 ? "critical" : increase > 5 ? "high" : increase > 3 ? "medium" : "low";
        return {
          type: "chasing_losses",
          severity,
          confidence: Math.min(1, increase / 10),
          description: `Bet size increased ${increase.toFixed(1)}x after ${this.consecutiveLosses} losses`,
          evidence: {
            consecutiveLosses: this.consecutiveLosses,
            betIncrease: increase,
            startBet: recentBets[0].amount,
            currentBet: recentBets[recentBets.length - 1].amount
          },
          triggeredAt: Date.now()
        };
      }
      return null;
    }
    /**
     * Detect fast/erratic clicking
     */
    detectFastClicks() {
      if (this.clicks.length < this.config.clickThreshold) return null;
      const recentClicks = this.clicks.filter(
        (t) => Date.now() - t < this.config.clickWindow
      );
      if (recentClicks.length >= this.config.clickThreshold) {
        const severity = recentClicks.length > 10 ? "high" : "medium";
        return {
          type: "fast_clicks",
          severity,
          confidence: Math.min(1, recentClicks.length / 10),
          description: `${recentClicks.length} clicks in ${this.config.clickWindow / 1e3} seconds`,
          evidence: {
            clickCount: recentClicks.length,
            window: this.config.clickWindow
          },
          triggeredAt: Date.now()
        };
      }
      return null;
    }
    /**
     * Detect bet escalation (beyond baseline)
     */
    detectBetEscalation() {
      if (this.bets.length < 10) return null;
      const recentBet = this.bets[this.bets.length - 1];
      const escalationFactor = recentBet.amount / this.baselineAvgBet;
      if (escalationFactor > 5) {
        const severity = escalationFactor > 20 ? "critical" : escalationFactor > 10 ? "high" : "medium";
        return {
          type: "bet_escalation",
          severity,
          confidence: Math.min(1, escalationFactor / 20),
          description: `Bet ${escalationFactor.toFixed(1)}x larger than your average`,
          evidence: {
            currentBet: recentBet.amount,
            baselineAvg: this.baselineAvgBet,
            escalationFactor
          },
          triggeredAt: Date.now()
        };
      }
      return null;
    }
    /**
     * Detect session duration warnings
     */
    detectDurationWarning() {
      const duration = Date.now() - this.sessionStartTime;
      if (duration > this.config.criticalDuration) {
        return {
          type: "duration_warning",
          severity: "critical",
          confidence: 1,
          description: `You've been playing for ${(duration / 36e5).toFixed(1)} hours`,
          evidence: {
            duration,
            hours: duration / 36e5
          },
          triggeredAt: Date.now()
        };
      } else if (duration > this.config.warningDuration) {
        return {
          type: "duration_warning",
          severity: "medium",
          confidence: 0.8,
          description: `Session duration: ${(duration / 6e4).toFixed(0)} minutes`,
          evidence: {
            duration,
            minutes: duration / 6e4
          },
          triggeredAt: Date.now()
        };
      }
      return null;
    }
    /**
     * Detect all tilt indicators
     */
    detectAllTiltSigns() {
      const indicators = [];
      const rageBetting = this.detectRageBetting();
      if (rageBetting) indicators.push(rageBetting);
      const chasing = this.detectChasingLosses();
      if (chasing) indicators.push(chasing);
      const fastClicks = this.detectFastClicks();
      if (fastClicks) indicators.push(fastClicks);
      const escalation = this.detectBetEscalation();
      if (escalation) indicators.push(escalation);
      const duration = this.detectDurationWarning();
      if (duration) indicators.push(duration);
      return indicators;
    }
    /**
     * Generate vault recommendation
     */
    generateVaultRecommendation() {
      const profit = this.currentBalance - this.initialBalance;
      const profitMultiple = this.currentBalance / this.initialBalance;
      if (profitMultiple >= this.config.vaultThreshold) {
        const suggestedAmount = profit * this.config.profitVaultPercent;
        const comparison = this.findRealWorldComparison(suggestedAmount);
        return {
          reason: `Your balance is ${profitMultiple.toFixed(1)}x your starting amount`,
          suggestedAmount,
          urgency: profitMultiple > 10 ? "critical" : profitMultiple > 7 ? "high" : "medium",
          realWorldComparison: comparison
        };
      }
      const lossPercent = (this.initialBalance - this.currentBalance) / this.initialBalance;
      if (lossPercent >= this.config.stopLossPercent) {
        return {
          reason: `You've lost ${(lossPercent * 100).toFixed(0)}% of your starting balance`,
          suggestedAmount: this.currentBalance,
          // Vault everything
          urgency: "critical",
          realWorldComparison: void 0
        };
      }
      return null;
    }
    /**
     * Find real-world item comparison
     */
    findRealWorldComparison(amount) {
      const affordableItems = this.config.realWorldItems.filter(
        (item2) => amount >= item2.avgCost
      );
      if (affordableItems.length === 0) return void 0;
      const item = affordableItems[Math.floor(Math.random() * affordableItems.length)];
      const quantity = Math.floor(amount / item.avgCost);
      return {
        item: item.item,
        cost: item.avgCost,
        quantity,
        message: `Hey, you mentioned needing ${item.item}. Your balance is ${quantity}x what they cost - maybe pull $${item.avgCost} and grab them now?`
      };
    }
    /**
     * Generate intervention recommendations
     */
    generateInterventions() {
      const interventions = [];
      const tiltSigns = this.detectAllTiltSigns();
      const vaultRec = this.generateVaultRecommendation();
      const criticalSigns = tiltSigns.filter((t) => t.severity === "critical");
      if (criticalSigns.length > 0) {
        interventions.push({
          type: "cooldown",
          message: `\u{1F6D1} TILT DETECTED: ${criticalSigns.map((t) => t.description).join(", ")}. Take a 5-minute break.`,
          actionRequired: true,
          data: { duration: 5 * 60 * 1e3, tiltSigns: criticalSigns }
        });
      }
      const highSigns = tiltSigns.filter((t) => t.severity === "high" || t.severity === "critical");
      if (highSigns.length >= 2) {
        interventions.push({
          type: "phone_friend",
          message: "\u{1F4DE} Multiple tilt indicators detected. Maybe call someone before continuing?",
          actionRequired: false,
          data: { tiltSigns: highSigns }
        });
      }
      if (vaultRec) {
        if (vaultRec.urgency === "critical") {
          interventions.push({
            type: "stop_loss_triggered",
            message: `\u26A0\uFE0F STOP LOSS: ${vaultRec.reason}. Strongly recommend vaulting your remaining balance.`,
            actionRequired: true,
            data: vaultRec
          });
        } else if (vaultRec.realWorldComparison) {
          interventions.push({
            type: "spending_reminder",
            message: vaultRec.realWorldComparison.message,
            actionRequired: false,
            data: vaultRec
          });
        } else {
          interventions.push({
            type: "vault_balance",
            message: `\u{1F4B0} ${vaultRec.reason}. Consider vaulting $${vaultRec.suggestedAmount.toFixed(2)}.`,
            actionRequired: false,
            data: vaultRec
          });
        }
      }
      const durationWarning = tiltSigns.find((t) => t.type === "duration_warning");
      if (durationWarning && durationWarning.severity === "critical") {
        interventions.push({
          type: "session_break",
          message: `\u23F0 ${durationWarning.description}. Time for a break?`,
          actionRequired: false,
          data: durationWarning
        });
      }
      return interventions;
    }
    /**
     * Get current tilt risk score (0-100)
     */
    getTiltRiskScore() {
      const tiltSigns = this.detectAllTiltSigns();
      const weights = {
        rage_betting: 25,
        chasing_losses: 30,
        fast_clicks: 15,
        bet_escalation: 20,
        duration_warning: 10,
        emotional_pattern: 20,
        fatigue: 15
      };
      const severityMultipliers = {
        low: 0.5,
        medium: 1,
        high: 1.5,
        critical: 2
      };
      let score = 0;
      for (const sign of tiltSigns) {
        const weight = weights[sign.type] || 10;
        const multiplier = severityMultipliers[sign.severity];
        score += weight * multiplier * sign.confidence;
      }
      return Math.min(100, Math.round(score));
    }
    /**
     * Get session summary
     */
    getSessionSummary() {
      const duration = Date.now() - this.sessionStartTime;
      const netProfit = this.currentBalance - this.initialBalance;
      const roi = netProfit / this.initialBalance * 100;
      return {
        duration: duration / 6e4,
        // minutes
        totalBets: this.bets.length,
        totalWagered: this.totalWagered,
        netProfit,
        roi,
        currentBalance: this.currentBalance,
        initialBalance: this.initialBalance,
        avgBetSize: this.bets.length > 0 ? this.totalWagered / this.bets.length : 0,
        consecutiveLosses: this.consecutiveLosses,
        tiltRisk: this.getTiltRiskScore()
      };
    }
  };

  // src/license-verifier.ts
  var LEGITIMATE_AUTHORITIES = [
    // Tier 1 (Strictest)
    { name: "UK Gambling Commission", pattern: /UKGC|UK\s*Gambling|39\d{3}/i, jurisdiction: "United Kingdom" },
    { name: "Malta Gaming Authority", pattern: /MGA|Malta\s*Gaming|MGA\/\w+\/\d+/i, jurisdiction: "Malta" },
    { name: "Gibraltar Gambling Commission", pattern: /Gibraltar|RGL/i, jurisdiction: "Gibraltar" },
    // Tier 2 (Reputable)
    { name: "Curacao eGaming", pattern: /Cura[cç]ao|8048\/JAZ|1668\/JAZ/i, jurisdiction: "Curacao" },
    { name: "Kahnawake Gaming Commission", pattern: /Kahnawake/i, jurisdiction: "Canada" },
    { name: "Alderney Gambling Control", pattern: /Alderney/i, jurisdiction: "Alderney" },
    { name: "Isle of Man Gambling", pattern: /Isle\s*of\s*Man/i, jurisdiction: "Isle of Man" },
    // Tier 3 (Emerging)
    { name: "Anjouan Gaming", pattern: /Anjouan/i, jurisdiction: "Comoros" },
    { name: "Costa Rica Gaming", pattern: /Costa\s*Rica/i, jurisdiction: "Costa Rica" },
    // US State licenses
    { name: "Nevada Gaming Control", pattern: /Nevada\s*Gaming/i, jurisdiction: "Nevada, USA" },
    { name: "New Jersey DGE", pattern: /New\s*Jersey|DGE|Division\s*of\s*Gaming/i, jurisdiction: "New Jersey, USA" },
    { name: "Pennsylvania Gaming", pattern: /Pennsylvania\s*Gaming|PGCB/i, jurisdiction: "Pennsylvania, USA" }
  ];
  var RED_FLAGS = [
    /no\s*license/i,
    /unlicensed/i,
    /offshore/i,
    /unregulated/i,
    /bitcoin\s*only/i
    // Often a red flag
  ];
  var CasinoLicenseVerifier = class {
    /**
     * Scan document for license information
     */
    findLicenseInfo(doc = document) {
      const warnings = [];
      let found = false;
      let licenseNumber;
      let issuingAuthority;
      let jurisdiction;
      let location2;
      const footer = doc.querySelector("footer") || doc.querySelector('[class*="footer"]') || doc.querySelector('[id*="footer"]');
      if (footer) {
        const footerText = footer.textContent || "";
        const licenseMatch = this.extractLicense(footerText);
        if (licenseMatch.found) {
          found = true;
          licenseNumber = licenseMatch.licenseNumber;
          issuingAuthority = licenseMatch.authority;
          jurisdiction = licenseMatch.jurisdiction;
          location2 = "footer";
        }
      }
      if (!found) {
        const licenseLinks = Array.from(doc.querySelectorAll("a")).filter(
          (a) => /license|regulation|authority|gaming\s*commission/i.test(a.textContent || "")
        );
        if (licenseLinks.length > 0) {
          for (const link of licenseLinks) {
            const linkText = link.textContent || "";
            const licenseMatch = this.extractLicense(linkText);
            if (licenseMatch.found) {
              found = true;
              licenseNumber = licenseMatch.licenseNumber;
              issuingAuthority = licenseMatch.authority;
              jurisdiction = licenseMatch.jurisdiction;
              location2 = "license-page";
              break;
            }
          }
        }
      }
      if (!found) {
        const aboutLinks = Array.from(doc.querySelectorAll("a")).filter(
          (a) => /about|terms|legal|responsible/i.test(a.textContent || "")
        );
        if (aboutLinks.length > 0) {
          warnings.push("License info may be on About/Terms page - not verified automatically");
        }
      }
      const bodyText = doc.body.textContent || "";
      for (const redFlag of RED_FLAGS) {
        if (redFlag.test(bodyText)) {
          warnings.push(`Red flag detected: ${redFlag.source}`);
        }
      }
      return {
        found,
        licenseNumber,
        issuingAuthority,
        jurisdiction,
        location: location2,
        verified: found && issuingAuthority !== void 0,
        warnings
      };
    }
    /**
     * Extract license from text
     */
    extractLicense(text) {
      for (const auth of LEGITIMATE_AUTHORITIES) {
        if (auth.pattern.test(text)) {
          const licenseMatch = text.match(/\b([A-Z0-9]{4,}\/[A-Z0-9]+\/\d{4,}|\d{4,})\b/);
          return {
            found: true,
            licenseNumber: licenseMatch?.[1],
            authority: auth.name,
            jurisdiction: auth.jurisdiction
          };
        }
      }
      return { found: false };
    }
    /**
     * Verify casino legitimacy
     */
    verifyCasino(doc = document) {
      const licenseInfo = this.findLicenseInfo(doc);
      let verdict;
      let shouldAnalyze;
      let warningMessage;
      if (licenseInfo.verified) {
        verdict = "legitimate";
        shouldAnalyze = true;
      } else if (licenseInfo.found && licenseInfo.warnings.length === 0) {
        verdict = "unknown";
        shouldAnalyze = true;
        warningMessage = "License found but could not be verified automatically. Proceeding with caution.";
      } else if (licenseInfo.warnings.length > 0) {
        verdict = "suspicious";
        shouldAnalyze = false;
        warningMessage = `\u26A0\uFE0F This casino has red flags: ${licenseInfo.warnings.join(", ")}. Fairness analysis not recommended.`;
      } else {
        verdict = "unlicensed";
        shouldAnalyze = false;
        warningMessage = "\u{1F6AB} No gambling license found. This casino cannot be verified for fairness. Play at your own risk.";
      }
      return {
        isLegitimate: verdict === "legitimate",
        licenseInfo,
        verdict,
        shouldAnalyze,
        warningMessage
      };
    }
    /**
     * Get user-friendly message about casino legitimacy
     */
    getVerificationMessage(verification) {
      if (verification.verdict === "legitimate") {
        return `\u2705 Licensed by ${verification.licenseInfo.issuingAuthority} (${verification.licenseInfo.jurisdiction})${verification.licenseInfo.licenseNumber ? ` - License #${verification.licenseInfo.licenseNumber}` : ""}`;
      } else if (verification.verdict === "unknown") {
        return verification.warningMessage || "License status unknown";
      } else if (verification.verdict === "suspicious") {
        return verification.warningMessage || "Suspicious licensing";
      } else {
        return verification.warningMessage || "No license found";
      }
    }
  };

  // src/sidebar.ts
  var API_BASE = "https://tiltcheck.it.com/api";
  var authToken = null;
  var showSettings = false;
  var apiKeys = {
    openai: "",
    anthropic: "",
    custom: ""
  };
  var isAuthenticated = false;
  var userData = null;
  var sessionStats = {
    startTime: Date.now(),
    totalBets: 0,
    totalWagered: 0,
    totalWins: 0,
    currentBalance: 0
  };
  async function apiCall(endpoint, options = {}) {
    const headers = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers }
      });
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      return { error: "Network error" };
    }
  }
  function createSidebar() {
    const existing = document.getElementById("tiltguard-sidebar");
    if (existing) existing.remove();
    const sidebar = document.createElement("div");
    sidebar.id = "tiltguard-sidebar";
    sidebar.innerHTML = `
    <div class="tg-header">
      <div class="tg-logo">TiltGuard</div>
      <div class="tg-header-actions">
        <button class="tg-icon-btn" id="tg-settings" title="Settings">\u2699</button>
        <button class="tg-icon-btn" id="tg-minimize" title="Minimize">\u2212</button>
      </div>
    </div>
    
    <div class="tg-content" id="tg-content">
      <!-- Auth Section -->
      <div class="tg-section" id="tg-auth-section">
        <div class="tg-auth-prompt">
          <h3>Sign In</h3>
          <p>Authenticate to sync data and access vault</p>
          <button class="tg-btn tg-btn-primary" id="tg-discord-login">Discord Login</button>
          <div class="tg-auth-divider">or</div>
          <button class="tg-btn tg-btn-secondary" id="tg-guest-mode">Guest Mode</button>
        </div>
      </div>

      <!-- Main Content (hidden until auth) -->
      <div id="tg-main-content" style="display: none;">
        <!-- User Bar -->
        <div class="tg-user-bar">
          <div class="tg-user-info">
            <span id="tg-username">Guest</span>
            <span class="tg-tier" id="tg-user-tier">Free</span>
          </div>
          <button class="tg-btn-icon" id="tg-logout" title="Logout">\xD7</button>
        </div>

        <!-- Settings Panel (toggleable) -->
        <div class="tg-settings-panel" id="tg-settings-panel" style="display: none;">
          <h4>API Keys</h4>
          <div class="tg-input-group">
            <label>OpenAI Key</label>
            <input type="password" id="api-key-openai" placeholder="sk-..." />
          </div>
          <div class="tg-input-group">
            <label>Anthropic Key</label>
            <input type="password" id="api-key-anthropic" placeholder="sk-ant-..." />
          </div>
          <div class="tg-input-group">
            <label>Custom API</label>
            <input type="text" id="api-key-custom" placeholder="Custom key" />
          </div>
          <button class="tg-btn tg-btn-primary" id="save-api-keys">Save Keys</button>
          <button class="tg-btn tg-btn-secondary" id="close-settings">Close</button>
        </div>

        <!-- Active Session Metrics (TOP PRIORITY) -->
        <div class="tg-metrics-card">
          <div class="tg-metrics-header">
            <h3>Active Session</h3>
            <div class="tg-guardian-indicator" id="tg-guardian-indicator">\u25CF</div>
          </div>
          <div class="tg-metrics-grid">
            <div class="tg-metric">
              <span class="tg-metric-label">Time</span>
              <span class="tg-metric-value" id="tg-duration">0:00</span>
            </div>
            <div class="tg-metric">
              <span class="tg-metric-label">Bets</span>
              <span class="tg-metric-value" id="tg-bets">0</span>
            </div>
            <div class="tg-metric">
              <span class="tg-metric-label">Wagered</span>
              <span class="tg-metric-value" id="tg-wagered">$0</span>
            </div>
            <div class="tg-metric">
              <span class="tg-metric-label">P/L</span>
              <span class="tg-metric-value" id="tg-profit">$0</span>
            </div>
            <div class="tg-metric">
              <span class="tg-metric-label">RTP</span>
              <span class="tg-metric-value" id="tg-rtp">--</span>
            </div>
            <div class="tg-metric">
              <span class="tg-metric-label">Tilt</span>
              <span class="tg-metric-value tg-tilt-value" id="tg-score-value">0</span>
            </div>
          </div>
        </div>

        <!-- P/L Graph -->
        <div class="tg-section">
          <h4>Profit/Loss</h4>
          <div class="tg-graph" id="tg-pnl-graph">
            <canvas id="pnl-canvas" width="300" height="120"></canvas>
          </div>
        </div>

        <!-- Message Feed -->
        <div class="tg-section">
          <h4>Activity Feed</h4>
          <div class="tg-feed" id="tg-message-feed">
            <div class="tg-feed-item">Monitoring active...</div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="tg-section">
          <div class="tg-action-grid">
            <button class="tg-action-btn" id="tg-open-dashboard">Dashboard</button>
            <button class="tg-action-btn" id="tg-open-vault">Vault</button>
            <button class="tg-action-btn" id="tg-wallet">Wallet</button>
            <button class="tg-action-btn" id="tg-upgrade">Upgrade</button>
          </div>
        </div>

        <!-- Vault Section -->
        <div class="tg-section">
          <h4>Vault Balance</h4>
          <div class="tg-vault-amount" id="tg-vault-balance">$0.00</div>
          <div class="tg-vault-actions">
            <button class="tg-btn tg-btn-vault" id="tg-vault-btn">Vault Balance</button>
            <button class="tg-btn tg-btn-secondary" id="tg-vault-custom">Custom Amount</button>
          </div>
        </div>

        <!-- Export -->
        <div class="tg-section">
          <button class="tg-btn tg-btn-secondary" id="tg-export-session">Export Session</button>
        </div>
      </div>
    </div>
  `;
    document.body.style.marginRight = "340px";
    document.body.style.transition = "margin-right 0.3s ease";
    const style = document.createElement("style");
    style.textContent = `
    #tiltguard-sidebar {
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      width: 340px;
      height: 100vh;
      background: #0f1419;
      color: #e1e8ed;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.3);
      overflow-y: auto;
      transition: transform 0.2s ease;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
    }
    #tiltguard-sidebar.minimized { transform: translateX(300px); width: 40px; }
    body.tiltguard-minimized { margin-right: 40px !important; }
    #tiltguard-sidebar::-webkit-scrollbar { width: 6px; }
    #tiltguard-sidebar::-webkit-scrollbar-track { background: transparent; }
    #tiltguard-sidebar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 3px; }
    
    .tg-header {
      background: #000;
      padding: 14px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .tg-logo {
      font-size: 15px;
      font-weight: 600;
      color: #fff;
      letter-spacing: 0.5px;
    }
    .tg-header-actions { display: flex; gap: 6px; }
    .tg-icon-btn {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #e1e8ed;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.15s;
    }
    .tg-icon-btn:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.3); }
    
    .tg-content { padding: 12px; }
    .tg-section { margin-bottom: 12px; padding: 14px; background: rgba(255, 255, 255, 0.03); border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.05); }
    .tg-section h4 { margin: 0 0 10px 0; font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; letter-spacing: 0.5px; }
    
    .tg-auth-prompt { text-align: center; padding: 40px 20px; }
    .tg-auth-prompt h3 { font-size: 18px; margin-bottom: 8px; font-weight: 600; }
    .tg-auth-prompt p { font-size: 13px; opacity: 0.6; margin-bottom: 24px; }
    .tg-auth-divider { margin: 14px 0; text-align: center; opacity: 0.4; font-size: 12px; }
    
    .tg-user-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      margin-bottom: 12px;
    }
    .tg-user-info { display: flex; gap: 8px; align-items: center; font-size: 13px; }
    .tg-tier { padding: 2px 8px; background: rgba(99, 102, 241, 0.2); border-radius: 3px; font-size: 11px; color: #818cf8; }
    .tg-btn-icon {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      font-size: 20px;
      cursor: pointer;
      width: 24px;
      height: 24px;
      padding: 0;
      line-height: 1;
    }
    .tg-btn-icon:hover { color: rgba(255, 255, 255, 0.8); }
    
    .tg-settings-panel {
      background: #1a1f26;
      padding: 16px;
      margin-bottom: 12px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .tg-settings-panel h4 { margin: 0 0 12px 0; font-size: 13px; }
    .tg-input-group { margin-bottom: 12px; }
    .tg-input-group label { display: block; font-size: 12px; margin-bottom: 4px; opacity: 0.7; }
    .tg-input-group input {
      width: 100%;
      padding: 8px;
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: #e1e8ed;
      font-size: 12px;
    }
    .tg-input-group input:focus { outline: none; border-color: rgba(99, 102, 241, 0.5); }
    
    .tg-metrics-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      padding: 14px;
      margin-bottom: 12px;
    }
    .tg-metrics-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .tg-metrics-header h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
    }
    .tg-guardian-indicator {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #10b981;
      color: transparent;
      font-size: 0;
    }
    .tg-guardian-indicator.inactive { background: rgba(255, 255, 255, 0.2); }
    
    .tg-metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
    }
    .tg-metric {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .tg-metric-label {
      font-size: 11px;
      opacity: 0.5;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .tg-metric-value {
      font-size: 15px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .tg-tilt-value { color: #10b981; }
    .tg-tilt-value.warning { color: #f59e0b; }
    .tg-tilt-value.critical { color: #ef4444; }
    
    .tg-graph {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
      padding: 10px;
      height: 130px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .tg-feed {
      max-height: 120px;
      overflow-y: auto;
      font-size: 12px;
    }
    .tg-feed-item {
      padding: 8px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      opacity: 0.7;
    }
    .tg-feed-item:last-child { border-bottom: none; }
    
    .tg-action-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .tg-action-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #e1e8ed;
      padding: 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.15s;
    }
    .tg-action-btn:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.2); }
    
    .tg-vault-amount {
      font-size: 24px;
      font-weight: 700;
      color: #fbbf24;
      margin-bottom: 12px;
      font-variant-numeric: tabular-nums;
    }
    .tg-vault-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    
    .tg-btn {
      width: 100%;
      padding: 10px;
      margin-top: 6px;
      border: none;
      border-radius: 4px;
      color: white;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
      font-size: 13px;
    }
    .tg-btn-primary { background: #6366f1; }
    .tg-btn-primary:hover { background: #5558e3; }
    .tg-btn-secondary { background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); }
    .tg-btn-secondary:hover { background: rgba(255, 255, 255, 0.15); }
    .tg-btn-vault { background: #f59e0b; }
    .tg-btn-vault:hover { background: #d97706; }
  `;
    document.head.appendChild(style);
    document.body.appendChild(sidebar);
    setupEventListeners();
    checkAuthStatus();
    return sidebar;
  }
  function setupEventListeners() {
    document.getElementById("tg-minimize")?.addEventListener("click", () => {
      const sidebar = document.getElementById("tiltguard-sidebar");
      const btn = document.getElementById("tg-minimize");
      const isMin = sidebar?.classList.toggle("minimized");
      document.body.classList.toggle("tiltguard-minimized", isMin);
      document.body.style.marginRight = isMin ? "40px" : "340px";
      if (btn) btn.textContent = isMin ? "+" : "\u2212";
    });
    document.getElementById("tg-settings")?.addEventListener("click", () => {
      const panel = document.getElementById("tg-settings-panel");
      if (panel) {
        showSettings = !showSettings;
        panel.style.display = showSettings ? "block" : "none";
      }
    });
    document.getElementById("close-settings")?.addEventListener("click", () => {
      const panel = document.getElementById("tg-settings-panel");
      if (panel) {
        showSettings = false;
        panel.style.display = "none";
      }
    });
    document.getElementById("save-api-keys")?.addEventListener("click", () => {
      const openai = document.getElementById("api-key-openai")?.value;
      const anthropic = document.getElementById("api-key-anthropic")?.value;
      const custom = document.getElementById("api-key-custom")?.value;
      apiKeys = { openai, anthropic, custom };
      localStorage.setItem("tiltguard_api_keys", JSON.stringify(apiKeys));
      addFeedMessage("API keys saved");
      const panel = document.getElementById("tg-settings-panel");
      if (panel) {
        showSettings = false;
        panel.style.display = "none";
      }
    });
    document.getElementById("tg-discord-login")?.addEventListener("click", async () => {
      const width = 500;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const authWindow = window.open(
        `${API_BASE}/auth/discord`,
        "Discord Login",
        `width=${width},height=${height},left=${left},top=${top}`
      );
      const handleMessage = (event) => {
        if (event.data.type === "discord-auth" && event.data.token) {
          authToken = event.data.token;
          userData = event.data.user;
          isAuthenticated = true;
          localStorage.setItem("tiltguard_auth", JSON.stringify(userData));
          localStorage.setItem("tiltguard_token", authToken);
          showMainContent();
          addFeedMessage(`Authenticated as ${userData.username}`);
          window.removeEventListener("message", handleMessage);
          if (authWindow && !authWindow.closed) {
            authWindow.close();
          }
        }
      };
      window.addEventListener("message", handleMessage);
      const checkClosed = setInterval(() => {
        if (authWindow && authWindow.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", handleMessage);
          if (!isAuthenticated) {
            addFeedMessage("Discord login cancelled");
          }
        }
      }, 1e3);
    });
    document.getElementById("tg-guest-mode")?.addEventListener("click", continueAsGuest);
    document.getElementById("tg-logout")?.addEventListener("click", () => {
      localStorage.removeItem("tiltguard_auth");
      localStorage.removeItem("tiltguard_token");
      authToken = null;
      location.reload();
    });
    document.getElementById("tg-open-dashboard")?.addEventListener("click", openDashboard);
    document.getElementById("tg-open-vault")?.addEventListener("click", openVault);
    document.getElementById("tg-wallet")?.addEventListener("click", openWallet);
    document.getElementById("tg-vault-btn")?.addEventListener("click", vaultCurrentBalance);
    document.getElementById("tg-vault-custom")?.addEventListener("click", async () => {
      const amt = prompt("Enter amount to vault:");
      if (amt && !isNaN(parseFloat(amt))) {
        await depositToVault(parseFloat(amt));
      }
    });
    document.getElementById("tg-export-session")?.addEventListener("click", () => {
      const data = { ...sessionStats, timestamp: (/* @__PURE__ */ new Date()).toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tiltguard-session-${Date.now()}.json`;
      a.click();
      addFeedMessage("Session exported");
    });
    document.getElementById("tg-upgrade")?.addEventListener("click", openPremium);
  }
  function checkAuthStatus() {
    const stored = localStorage.getItem("tiltguard_auth");
    const token = localStorage.getItem("tiltguard_token");
    const keys = localStorage.getItem("tiltguard_api_keys");
    if (keys) {
      apiKeys = JSON.parse(keys);
      setTimeout(() => {
        if (document.getElementById("api-key-openai")) {
          document.getElementById("api-key-openai").value = apiKeys.openai || "";
          document.getElementById("api-key-anthropic").value = apiKeys.anthropic || "";
          document.getElementById("api-key-custom").value = apiKeys.custom || "";
        }
      }, 100);
    }
    if (!stored || !token) {
      console.log("\u{1F3AE} TiltGuard: Authentication required");
      return;
    }
    if (stored && token) {
      userData = JSON.parse(stored);
      authToken = token;
      isAuthenticated = true;
      showMainContent();
      loadVaultBalance();
      initPnLGraph();
    }
  }
  async function continueAsGuest() {
    const result = await apiCall("/auth/guest", {
      method: "POST",
      body: JSON.stringify({ username: "Guest" })
    });
    if (result.success) {
      authToken = result.token;
      userData = result.user;
      isAuthenticated = true;
      localStorage.setItem("tiltguard_auth", JSON.stringify(userData));
      localStorage.setItem("tiltguard_token", authToken);
      showMainContent();
      addFeedMessage("Guest session started");
    } else {
      alert("Failed to start guest session");
    }
  }
  function addFeedMessage(message) {
    const feed = document.getElementById("tg-message-feed");
    if (!feed) return;
    const item = document.createElement("div");
    item.className = "tg-feed-item";
    const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    item.textContent = `[${time}] ${message}`;
    feed.insertBefore(item, feed.firstChild);
    while (feed.children.length > 10) {
      feed.removeChild(feed.lastChild);
    }
  }
  var pnlHistory = [];
  function initPnLGraph() {
    const canvas = document.getElementById("pnl-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawPnLGraph(ctx, canvas);
  }
  function drawPnLGraph(ctx, canvas) {
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    if (pnlHistory.length < 2) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No data yet", width / 2, height / 2);
      return;
    }
    const max = Math.max(...pnlHistory, 0);
    const min = Math.min(...pnlHistory, 0);
    const range = max - min || 1;
    ctx.strokeStyle = pnlHistory[pnlHistory.length - 1] >= 0 ? "#10b981" : "#ef4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    pnlHistory.forEach((value, index) => {
      const x = index / (pnlHistory.length - 1) * width;
      const y = height - (value - min) / range * height;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    const current = pnlHistory[pnlHistory.length - 1];
    ctx.fillStyle = current >= 0 ? "#10b981" : "#ef4444";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`$${current.toFixed(2)}`, width - 10, 20);
  }
  function showMainContent() {
    document.getElementById("tg-auth-section").style.display = "none";
    document.getElementById("tg-main-content").style.display = "block";
    const username = document.getElementById("tg-username");
    const tier = document.getElementById("tg-user-tier");
    username.textContent = userData.username || "Guest";
    tier.textContent = userData.tier === "premium" ? "Premium" : "Free";
    initPnLGraph();
    addFeedMessage("Session started");
  }
  async function vaultCurrentBalance() {
    const balance = sessionStats.currentBalance || 0;
    if (balance <= 0) {
      addFeedMessage("No balance to vault");
      return;
    }
    const confirmed = confirm(`Vault entire balance of $${balance.toFixed(2)}?`);
    if (!confirmed) return;
    await depositToVault(balance);
    sessionStats.currentBalance = 0;
  }
  function updateLicense(verification) {
    if (verification.isLegitimate) {
      addFeedMessage(`\u2713 Licensed: ${verification.licenseInfo?.authority || "Verified"}`);
    } else {
      addFeedMessage(`\u26A0 ${verification.verdict || "Unlicensed"}`);
    }
  }
  function updateGuardian(active) {
    const indicator = document.getElementById("tg-guardian-indicator");
    if (indicator) {
      indicator.className = active ? "tg-guardian-indicator" : "tg-guardian-indicator inactive";
    }
    addFeedMessage(active ? "Guardian activated" : "Guardian deactivated");
  }
  function updateTilt(score, indicators) {
    const scoreEl = document.getElementById("tg-score-value");
    if (scoreEl) {
      scoreEl.textContent = Math.round(score).toString();
      scoreEl.className = "tg-metric-value tg-tilt-value";
      if (score >= 60) scoreEl.classList.add("critical");
      else if (score >= 30) scoreEl.classList.add("warning");
    }
    if (score >= 60) {
      addFeedMessage(`\u26A0\uFE0F High tilt detected: ${Math.round(score)}`);
    }
  }
  function updateStats(stats) {
    sessionStats = { ...sessionStats, ...stats };
    const duration = Math.floor((Date.now() - stats.startTime) / 1e3);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    const profit = stats.totalWins - stats.totalWagered;
    const rtp = stats.totalWagered > 0 ? stats.totalWins / stats.totalWagered * 100 : 0;
    const updates = {
      "tg-duration": `${minutes}:${seconds.toString().padStart(2, "0")}`,
      "tg-bets": stats.totalBets.toString(),
      "tg-wagered": `$${stats.totalWagered.toFixed(2)}`,
      "tg-profit": `$${profit.toFixed(2)}`,
      "tg-rtp": `${rtp.toFixed(1)}%`
    };
    Object.entries(updates).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el && value) {
        el.textContent = value;
        if (id === "tg-profit") el.style.color = profit >= 0 ? "#10b981" : "#ef4444";
      }
    });
    pnlHistory.push(profit);
    if (pnlHistory.length > 50) pnlHistory.shift();
    const canvas = document.getElementById("pnl-canvas");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) drawPnLGraph(ctx, canvas);
    }
    if (stats.currentBalance !== void 0) sessionStats.currentBalance = stats.currentBalance;
  }
  async function depositToVault(amount) {
    if (!userData) return;
    const result = await apiCall(`/vault/${userData.id}/deposit`, {
      method: "POST",
      body: JSON.stringify({ amount })
    });
    if (result.success) {
      const vaultEl = document.getElementById("tg-vault-balance");
      if (vaultEl) vaultEl.textContent = `$${result.vault.balance.toFixed(2)}`;
      addFeedMessage(`Vaulted $${amount.toFixed(2)}`);
    } else {
      addFeedMessage(`Vault error: ${result.error}`);
    }
  }
  async function loadVaultBalance() {
    if (!userData) return;
    const result = await apiCall(`/vault/${userData.id}`);
    if (result.vault) {
      const vaultEl = document.getElementById("tg-vault-balance");
      if (vaultEl) vaultEl.textContent = `$${result.vault.balance.toFixed(2)}`;
    }
  }
  async function openDashboard() {
    if (!userData) return;
    const result = await apiCall(`/dashboard/${userData.id}`);
    if (result.error) {
      addFeedMessage("Dashboard unavailable");
      return;
    }
    addFeedMessage("Dashboard opened");
    const data = JSON.stringify(result, null, 2);
    const win = window.open("", "TiltGuard Dashboard", "width=800,height=600");
    if (win) {
      win.document.write(`
      <html>
        <head><title>TiltGuard Dashboard</title>
        <style>body{font-family:monospace;padding:20px;background:#0f1419;color:#e1e8ed;}pre{background:#1a1f26;padding:15px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);}</style>
        </head>
        <body>
          <h1>\u{1F3AF} TiltGuard Dashboard</h1>
          <pre>${data}</pre>
        </body>
      </html>
    `);
    }
  }
  async function openVault() {
    if (!userData) return;
    const result = await apiCall(`/vault/${userData.id}`);
    if (result.error) {
      alert("Vault data unavailable");
      return;
    }
    const data = JSON.stringify(result.vault, null, 2);
    const win = window.open("", "TiltGuard Vault", "width=600,height=500");
    if (win) {
      win.document.write(`
      <html>
        <head><title>TiltGuard Vault</title>
        <style>body{font-family:monospace;padding:20px;background:#1a1a2e;color:white;}pre{background:#16213e;padding:15px;border-radius:8px;}</style>
        </head>
        <body>
          <h1>\u{1F512} TiltGuard Vault</h1>
          <pre>${data}</pre>
        </body>
      </html>
    `);
    }
  }
  async function openWallet() {
    if (!userData) return;
    const result = await apiCall(`/wallet/${userData.id}`);
    if (result.error) {
      alert("Wallet data unavailable");
      return;
    }
    const data = JSON.stringify(result, null, 2);
    const win = window.open("", "TiltGuard Wallet", "width=600,height=500");
    if (win) {
      win.document.write(`
      <html>
        <head><title>TiltGuard Wallet</title>
        <style>body{font-family:monospace;padding:20px;background:#1a1a2e;color:white;}pre{background:#16213e;padding:15px;border-radius:8px;}</style>
        </head>
        <body>
          <h1>\u{1F4B0} TiltGuard Wallet</h1>
          <pre>${data}</pre>
        </body>
      </html>
    `);
    }
  }
  async function openPremium() {
    const result = await apiCall("/premium/plans");
    if (result.error) {
      addFeedMessage("Premium plans unavailable");
      return;
    }
    const plans = result.plans.map(
      (p) => `${p.name} - $${p.price}/mo
${p.features.join("\n")}`
    ).join("\n\n");
    const upgrade = confirm(`Available Plans:

${plans}

Upgrade to Premium?`);
    if (upgrade && userData) {
      const upgradeResult = await apiCall("/premium/upgrade", {
        method: "POST",
        body: JSON.stringify({ userId: userData.id, plan: "premium" })
      });
      if (upgradeResult.success) {
        userData.tier = "premium";
        const tierEl = document.getElementById("tg-user-tier");
        if (tierEl) tierEl.textContent = "Premium";
        addFeedMessage("Upgraded to Premium");
      }
    }
  }
  if (typeof window !== "undefined") {
    window.TiltGuardSidebar = { create: createSidebar, updateLicense, updateGuardian, updateTilt, updateStats };
  }

  // src/content.ts
  var hostname = window.location.hostname;
  var isExcludedDomain = hostname.includes("discord.com") || hostname === "localhost" && window.location.port === "3333";
  if (isExcludedDomain) {
    console.log("[TiltGuard] Skipping - excluded domain:", hostname);
    throw new Error("TiltGuard: Excluded domain");
  }
  var ANALYZER_WS_URL = "ws://localhost:7071";
  var extractor = null;
  var tiltDetector = null;
  var licenseVerifier = null;
  var client = null;
  var sessionId = null;
  var stopObserving = null;
  var isMonitoring = false;
  var casinoVerification = null;
  var cooldownEndTime = null;
  var interventionQueue = [];
  function initialize() {
    console.log("[TiltGuard] Initializing on:", window.location.hostname);
    const sidebar = window.TiltGuardSidebar?.create();
    console.log("[TiltGuard] Sidebar created:", !!sidebar);
    licenseVerifier = new CasinoLicenseVerifier();
    casinoVerification = licenseVerifier.verifyCasino();
    console.log("[TiltGuard] License verification:", casinoVerification);
    window.TiltGuardSidebar?.updateLicense(casinoVerification);
    const startBtn = document.getElementById("tg-start-btn");
    if (startBtn) {
      startBtn.addEventListener("click", () => {
        if (isMonitoring) {
          stopMonitoring();
        } else {
          startMonitoring();
        }
      });
    }
    try {
      chrome.runtime.sendMessage({
        type: "license_verification",
        data: casinoVerification
      });
    } catch (e) {
      console.log("[TiltGuard] Could not send message to popup:", e);
    }
  }
  async function startMonitoring() {
    if (isMonitoring) return;
    console.log("[TiltGuard] Starting monitoring...");
    window.TiltGuardSidebar?.updateGuardian(true);
    isMonitoring = true;
    extractor = new CasinoDataExtractor();
    const initialBalance = extractor.extractBalance() || 100;
    console.log("[TiltGuard] Initial balance:", initialBalance);
    tiltDetector = new TiltDetector(initialBalance);
    client = new AnalyzerClient(ANALYZER_WS_URL);
    try {
      await client.connect();
      console.log("[TiltGuard] Connected to analyzer server");
    } catch (error) {
      console.log("[TiltGuard] Analyzer backend offline - tilt monitoring only");
    }
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userId = await getUserId();
    const casinoId = detectCasinoId();
    const gameId = detectGameId();
    console.log("[TiltGuard] Session started:", { sessionId, userId, casinoId, gameId });
    startTiltMonitoring();
    stopObserving = extractor.startObserving((spinData) => {
      if (!spinData) return;
      console.log("[TiltGuard] Spin detected:", spinData);
      handleSpinEvent(spinData, { sessionId, userId, casinoId, gameId });
    });
    console.log("[TiltGuard] Monitoring started successfully");
  }
  function stopMonitoring() {
    console.log("[TiltGuard] Stopping monitoring...");
    if (stopObserving) {
      stopObserving();
      stopObserving = null;
    }
    if (client) {
      client.disconnect();
      client = null;
    }
    isMonitoring = false;
    window.TiltGuardSidebar?.updateGuardian(false);
    console.log("[TiltGuard] Monitoring stopped");
  }
  function handleSpinEvent(spinData, session) {
    const bet = spinData.bet || 0;
    const payout = spinData.win || 0;
    if (tiltDetector) {
      tiltDetector.recordBet(bet, payout);
      const stats = {
        startTime: Date.now() - tiltDetector.sessionStartTime || Date.now(),
        totalBets: tiltDetector.bets?.length || 0,
        totalWagered: tiltDetector.totalWagered || 0,
        totalWins: tiltDetector.totalWagered + (payout - bet) || 0
      };
      window.TiltGuardSidebar?.updateStats(stats);
      const tiltSigns = tiltDetector.detectAllTiltSigns();
      const tiltRisk = tiltDetector.getTiltRiskScore();
      const indicators = tiltSigns.map((sign) => sign.message);
      window.TiltGuardSidebar?.updateTilt(tiltRisk, indicators);
      const interventions = tiltDetector.generateInterventions();
      if (interventions.length > 0) {
        handleInterventions(interventions);
      }
    }
    if (client && sessionId) {
      client.sendSpin({
        sessionId: session.sessionId,
        casinoId: session.casinoId,
        gameId: session.gameId,
        userId: session.userId,
        bet,
        payout,
        symbols: spinData.symbols,
        bonusRound: spinData.bonusActive,
        freeSpins: (spinData.freeSpins || 0) > 0
      });
    }
  }
  function startTiltMonitoring() {
    setInterval(() => {
      if (!tiltDetector || !isMonitoring) return;
      const tiltSigns = tiltDetector.detectAllTiltSigns();
      const tiltRisk = tiltDetector.getTiltRiskScore();
      const indicators = tiltSigns.map((sign) => sign.message);
      window.TiltGuardSidebar?.updateTilt(tiltRisk, indicators);
      chrome.runtime.sendMessage({
        type: "tilt_update",
        data: {
          tiltRisk,
          tiltSigns,
          sessionSummary: tiltDetector.getSessionSummary()
        }
      });
      if (tiltRisk >= 80) {
        triggerEmergencyStop("Critical tilt detected!");
      }
    }, 5e3);
  }
  function handleInterventions(interventions) {
    for (const intervention of interventions) {
      console.log("[TiltGuard] Intervention:", intervention);
      switch (intervention.type) {
        case "cooldown":
          startCooldown(intervention.data.duration);
          break;
        case "vault_balance":
          showVaultPrompt(intervention.data);
          break;
        case "spending_reminder":
          showSpendingReminder(intervention.data.realWorldComparison);
          break;
        case "stop_loss_triggered":
          triggerStopLoss(intervention.data);
          break;
        case "phone_friend":
          showPhoneFriendPrompt();
          break;
        case "session_break":
          showBreakPrompt();
          break;
      }
      interventionQueue.push(intervention);
      chrome.runtime.sendMessage({
        type: "intervention",
        data: intervention
      });
    }
  }
  function startCooldown(duration) {
    cooldownEndTime = Date.now() + duration;
    blockBettingUI(true);
    showCooldownOverlay(duration);
    const countdown = setInterval(() => {
      if (!cooldownEndTime) {
        clearInterval(countdown);
        return;
      }
      const remaining = cooldownEndTime - Date.now();
      if (remaining <= 0) {
        clearInterval(countdown);
        endCooldown();
      } else {
        updateCooldownOverlay(remaining);
      }
    }, 1e3);
  }
  function endCooldown() {
    cooldownEndTime = null;
    blockBettingUI(false);
    removeCooldownOverlay();
    showNotification("\u2705 Cooldown complete. Play responsibly.", "success");
  }
  function blockBettingUI(block) {
    const betButtons = document.querySelectorAll(
      'button[class*="bet"], button[class*="spin"], [data-action="bet"], [data-action="spin"]'
    );
    betButtons.forEach((btn) => {
      if (block) {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
        btn.dataset.tiltguardBlocked = "true";
      } else if (btn.dataset.tiltguardBlocked) {
        btn.disabled = false;
        btn.style.opacity = "";
        btn.style.cursor = "";
        delete btn.dataset.tiltguardBlocked;
      }
    });
  }
  function showCooldownOverlay(duration) {
    const overlay = document.createElement("div");
    overlay.id = "tiltguard-cooldown-overlay";
    overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: white;
    font-family: Arial, sans-serif;
  `;
    overlay.innerHTML = `
    <div style="text-align: center;">
      <h1 style="font-size: 48px; margin-bottom: 20px;">\u{1F6D1}</h1>
      <h2 style="font-size: 32px; margin-bottom: 10px;">Cooldown Period</h2>
      <p style="font-size: 18px; color: #ffaa00; margin-bottom: 30px;">
        Tilt detected. Take a break.
      </p>
      <div id="cooldown-timer" style="font-size: 72px; font-weight: bold; color: #00ff88;">
        ${Math.ceil(duration / 1e3)}
      </div>
      <p style="font-size: 14px; margin-top: 20px; color: rgba(255, 255, 255, 0.7);">
        Betting will resume when the timer reaches zero.
      </p>
    </div>
  `;
    document.body.appendChild(overlay);
  }
  function updateCooldownOverlay(remaining) {
    const timer = document.getElementById("cooldown-timer");
    if (timer) {
      timer.textContent = Math.ceil(remaining / 1e3).toString();
    }
  }
  function removeCooldownOverlay() {
    const overlay = document.getElementById("tiltguard-cooldown-overlay");
    if (overlay) overlay.remove();
  }
  function showVaultPrompt(vaultData) {
    const message = `\u{1F4B0} Your balance is ${vaultData.suggestedAmount.toFixed(2)}. Consider vaulting to protect your winnings.`;
    showInteractiveNotification(message, [
      { text: "Vault Now", action: () => openVaultInterface(vaultData.suggestedAmount) },
      { text: "Later", action: () => {
      } }
    ]);
  }
  function showSpendingReminder(comparison) {
    showInteractiveNotification(comparison.message, [
      { text: "Vault & Buy", action: () => openVaultInterface(comparison.cost) },
      { text: "Remind Me Later", action: () => {
      } }
    ]);
  }
  function triggerStopLoss(data) {
    triggerEmergencyStop(data.reason);
    showVaultPrompt({ suggestedAmount: tiltDetector?.getSessionSummary().currentBalance || 0 });
  }
  function showPhoneFriendPrompt() {
    showInteractiveNotification(
      "\u{1F4DE} Multiple tilt signs detected. Consider calling someone before continuing.",
      [
        { text: "Take Break", action: () => startCooldown(5 * 60 * 1e3) },
        { text: "Continue", action: () => {
        } }
      ]
    );
  }
  function showBreakPrompt() {
    showInteractiveNotification(
      "\u23F0 You've been playing for a while. How about a quick break?",
      [
        { text: "5 Min Break", action: () => startCooldown(5 * 60 * 1e3) },
        { text: "Keep Playing", action: () => {
        } }
      ]
    );
  }
  function triggerEmergencyStop(reason) {
    blockBettingUI(true);
    const warning = document.createElement("div");
    warning.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #ff3838 0%, #cc0000 100%);
    color: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(255, 56, 56, 0.5);
    z-index: 999999;
    max-width: 400px;
    text-align: center;
    font-family: Arial, sans-serif;
  `;
    warning.innerHTML = `
    <h2 style="font-size: 24px; margin-bottom: 15px;">\u{1F6A8} EMERGENCY STOP</h2>
    <p style="font-size: 16px; margin-bottom: 20px;">${reason}</p>
    <button id="emergency-vault" style="
      background: white;
      color: #cc0000;
      border: none;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      margin-right: 10px;
    ">Vault Balance</button>
    <button id="emergency-continue" style="
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid white;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
    ">I Understand (Continue)</button>
  `;
    document.body.appendChild(warning);
    document.getElementById("emergency-vault")?.addEventListener("click", () => {
      openVaultInterface(tiltDetector?.getSessionSummary().currentBalance || 0);
      warning.remove();
    });
    document.getElementById("emergency-continue")?.addEventListener("click", () => {
      blockBettingUI(false);
      warning.remove();
    });
  }
  function openVaultInterface(amount) {
    chrome.runtime.sendMessage({
      type: "open_vault",
      data: { suggestedAmount: amount }
    });
  }
  function showInteractiveNotification(message, actions) {
    const notification = document.createElement("div");
    notification.className = "tiltguard-notification";
    notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 255, 136, 0.3);
    z-index: 999999;
    max-width: 350px;
    font-family: Arial, sans-serif;
    border: 2px solid #00ff88;
  `;
    const messageEl = document.createElement("p");
    messageEl.style.cssText = "margin-bottom: 15px; font-size: 14px; line-height: 1.4;";
    messageEl.textContent = message;
    notification.appendChild(messageEl);
    const actionsContainer = document.createElement("div");
    actionsContainer.style.cssText = "display: flex; gap: 10px;";
    for (const actionDef of actions) {
      const button = document.createElement("button");
      button.textContent = actionDef.text;
      button.style.cssText = `
      flex: 1;
      padding: 10px;
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      background: linear-gradient(135deg, #00ff88 0%, #00ccff 100%);
      color: black;
    `;
      button.addEventListener("click", () => {
        actionDef.action();
        notification.remove();
      });
      actionsContainer.appendChild(button);
    }
    notification.appendChild(actionsContainer);
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3e4);
  }
  initialize();
  console.log("[TiltGuard] Content script loaded");
})();
//# sourceMappingURL=content.js.map
