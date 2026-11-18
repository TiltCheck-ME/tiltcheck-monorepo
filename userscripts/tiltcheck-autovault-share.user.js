// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-02
// ==UserScript==
// @name         TiltCheck AutoVault — Share Edition
// @namespace    https://tiltcheck.me/userscripts
// @version      1.1.1
// @description  One link for Stake.us + nuts.gg. Mobile-first big toggle. Skims wins to vault. Non-custodial.
// @author       TiltCheck
// @homepage     https://tiltcheck.me/tools/auto-vault/share
// @downloadURL  https://tiltcheck.me/userscripts/tiltcheck-autovault-share.user.js
// @updateURL    https://tiltcheck.me/userscripts/tiltcheck-autovault-share.user.js
// @match        *://stake.us/*
// @match        *://*.stake.us/*
// @match        https://stake.us/*
// @match        *://nuts.gg/*
// @match        *://*.nuts.gg/*
// @match        https://nuts.gg/*
// @match        https://www.nuts.gg/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    const LOG_PREFIX = '[TiltCheck AutoVault Share]';
    const BRAND = {
        teal: '#17c3b2',
        tealDark: '#129d8f',
        danger: '#ef4444',
        bg: '#0a0c10',
        bgCard: '#12161e',
        text: '#ffffff',
        muted: '#8a97a8',
        border: '#1e2533',
        font: '"Inter", "Segoe UI", Roboto, system-ui, sans-serif',
        tagline: 'Made for Degens. By Degens.',
        home: 'https://tiltcheck.me/tools/auto-vault'
    };

    const STORAGE_PREFIX = 'tiltcheck-autovault-share';
    const LEGACY_CONFIG_KEY = 'tiltcheck-autovault-config';
    const RATE_LIMIT_MAX = 50;
    const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
    const MIN_BALANCE_CHECKS = 2;
    const BALANCE_INIT_RETRIES = 5;
    const DEPOSIT_VAULT_PERCENTAGE = 0.2;
    const CURRENCY_CACHE_TIMEOUT = 5000;
    const DEFAULT_US_CURRENCY = 'sc';
    const CF_BACKOFF_MS = 60 * 1000;

    const hostname = window.location.hostname;
    function detectSite() {
        if (/(^|\.)stake\.us$/i.test(hostname)) {
            return { mode: 'stake-us', name: 'Stake.us' };
        }
        if (/(^|\.)nuts\.gg$/i.test(hostname)) {
            return { mode: 'nuts-ws', name: 'nuts.gg' };
        }
        return null;
    }
    const SITE = detectSite();
    if (!SITE) return;

    const SCRIPT_VERSION = '1.1.1';
    const INSTALL_PING_KEY = `${STORAGE_PREFIX}-install-pinged`;

    function pingFirstInstall() {
        try {
            if (localStorage.getItem(INSTALL_PING_KEY)) return;
            localStorage.setItem(INSTALL_PING_KEY, new Date().toISOString());
            const body = JSON.stringify({
                type: 'install_ping',
                step: 'share_edition_first_run',
                source: SITE.mode,
                label: SITE.name,
                path: window.location.pathname || '/',
                sessionId: `script_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`,
                metadata: {
                    site: SITE.mode,
                    version: SCRIPT_VERSION,
                },
            });
            const url = 'https://tiltcheck.me/api/funnel';
            if (navigator.sendBeacon) {
                navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
            } else {
                fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body,
                    keepalive: true,
                }).catch(() => {});
            }
        } catch (e) {
            /* quota or privacy mode — skip */
        }
    }
    pingFirstInstall();

    const DEFAULT_CONFIG = {
        saveAmount: 0.1,
        bigWinThreshold: 5,
        bigWinMultiplier: 3,
        checkInterval: 90,
        minDepositSol: 0.001,
        autoTipEnabled: false
    };

    function loadConfig() {
        const key = `${STORAGE_PREFIX}-config`;
        let raw = localStorage.getItem(key);
        if (!raw) raw = localStorage.getItem(LEGACY_CONFIG_KEY);
        if (raw) {
            try {
                const parsed = JSON.parse(raw);
                if (typeof parsed.checkInterval === 'number' && parsed.checkInterval > 300) {
                    parsed.checkInterval = Math.round(parsed.checkInterval / 1000);
                }
                return { ...DEFAULT_CONFIG, ...parsed };
            } catch (e) {
                console.warn(LOG_PREFIX, 'Config parse failed, using defaults.', e);
            }
        }
        return { ...DEFAULT_CONFIG };
    }

    function saveConfig(cfg) {
        try {
            localStorage.setItem(`${STORAGE_PREFIX}-config`, JSON.stringify(cfg));
        } catch (e) { /* quota */ }
    }

    let config = loadConfig();

    function isOnboarded() {
        return localStorage.getItem(`${STORAGE_PREFIX}-mobile-onboarded`) === '1';
    }
    function setOnboarded() {
        localStorage.setItem(`${STORAGE_PREFIX}-mobile-onboarded`, '1');
    }
    function resetOnboarding() {
        localStorage.removeItem(`${STORAGE_PREFIX}-mobile-onboarded`);
    }
    function getLastRunning() {
        return localStorage.getItem(`${STORAGE_PREFIX}-last-running`) === '1';
    }
    function setLastRunning(on) {
        if (on) localStorage.setItem(`${STORAGE_PREFIX}-last-running`, '1');
        else localStorage.removeItem(`${STORAGE_PREFIX}-last-running`);
    }

    function vaultedSessionKey() {
        const suffix = SITE.mode === 'stake-us' ? (stakeEngine.activeCurrency || DEFAULT_US_CURRENCY) : 'nuts-sol';
        return `${STORAGE_PREFIX}-vaulted-session:${suffix}`;
    }
    function loadVaultedSession() {
        try {
            const v = parseFloat(sessionStorage.getItem(vaultedSessionKey()));
            return !isNaN(v) && v >= 0 ? v : 0;
        } catch (e) {
            return 0;
        }
    }
    function saveVaultedSession(amount) {
        try {
            sessionStorage.setItem(vaultedSessionKey(), String(amount));
        } catch (e) { /* ignore */ }
    }
    let vaultedSession = loadVaultedSession();
    function addVaulted(amount) {
        if (!amount || amount <= 0) return;
        vaultedSession += amount;
        saveVaultedSession(vaultedSession);
        if (uiApi) uiApi.render();
    }

    let statusMessage = 'Ready';
    let statusType = 'info';
    let onStatusUpdate = null;

    function logActivity(message, type) {
        statusMessage = message;
        statusType = type || 'info';
        console.log(LOG_PREFIX, message);
        if (onStatusUpdate) onStatusUpdate(message, statusType);
    }
    const log = (msg, type) => logActivity(msg, type);

    const FLAVOR = {
        profit: ['Heater detected. Skimming the top.', 'Profit hit. Locking some in.'],
        bigWin: ['Big win. Bag secured.', 'Heater confirmed. Vaulting.'],
        deposit: ['Deposit detected. Skimming the top.'],
        start: ['AutoVault on. Watching the bag.', 'Monitoring active.'],
        stop: ['AutoVault off.', 'Paused. Your call.'],
        rateLimit: ['Rate cap hit. Breathing.', 'Vault limit — retry soon.']
    };
    const pickFlavor = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const getCookie = (name) => {
        const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
        return m ? m.pop().replace(/"/g, '') : '';
    };

    function loadRateLimitData() {
        try {
            const saved = sessionStorage.getItem(`${STORAGE_PREFIX}-ratelimit`);
            if (saved) return JSON.parse(saved).filter((ts) => Date.now() - ts < RATE_LIMIT_WINDOW);
        } catch (e) { /* reset */ }
        return [];
    }
    function saveRateLimitData(ts) {
        try {
            sessionStorage.setItem(`${STORAGE_PREFIX}-ratelimit`, JSON.stringify(ts));
        } catch (e) { /* ignore */ }
    }
    let vaultActionTimestamps = loadRateLimitData();
    function canVaultNow() {
        const now = Date.now();
        vaultActionTimestamps = vaultActionTimestamps.filter((ts) => now - ts < RATE_LIMIT_WINDOW);
        saveRateLimitData(vaultActionTimestamps);
        return vaultActionTimestamps.length < RATE_LIMIT_MAX;
    }
    function recordVaultAction() {
        vaultActionTimestamps.push(Date.now());
        saveRateLimitData(vaultActionTimestamps);
    }

    // --- Session wager tracking (read-only) ---
    class SessionTracker {
        constructor() {
            this.reset();
        }

        reset(startingBalance = null) {
            this.startedAt = Date.now();
            this.updatedAt = null;
            this.rounds = 0;
            this.wagered = 0;
            this.won = 0;
            this.consecutiveLosses = 0;
            this.fastRoundStreak = 0;
            this.lastRoundAt = null;
            this.startingBalance = Number.isFinite(startingBalance) ? startingBalance : null;
            this.currentBalance = this.startingBalance;
        }

        recordBalanceChange(previousBalance, currentBalance, timestamp = Date.now()) {
            if (
                !Number.isFinite(previousBalance) ||
                !Number.isFinite(currentBalance) ||
                previousBalance === currentBalance
            ) {
                return this.snapshot();
            }
            const delta = currentBalance - previousBalance;
            return this.recordRound({
                wagered: delta < 0 ? Math.abs(delta) : 0,
                won: delta > 0 ? delta : 0,
                balance: currentBalance,
                timestamp
            });
        }

        recordRound(round) {
            const wagered = this.toMoneyValue(round.wagered);
            const won = this.toMoneyValue(round.won);
            const balance = Number.isFinite(round.balance) ? round.balance : null;
            const timestamp = Number.isFinite(round.timestamp) ? round.timestamp : Date.now();
            const isLoss = wagered > 0 && won <= 0;

            this.rounds += 1;
            this.wagered += wagered;
            this.won += won;
            this.updatedAt = timestamp;

            if (balance !== null) {
                if (this.startingBalance === null) this.startingBalance = balance;
                this.currentBalance = balance;
            }

            if (this.lastRoundAt !== null && timestamp - this.lastRoundAt > 0 && timestamp - this.lastRoundAt <= 2000) {
                this.fastRoundStreak += 1;
            } else {
                this.fastRoundStreak = 0;
            }

            this.consecutiveLosses = isLoss ? this.consecutiveLosses + 1 : 0;
            this.lastRoundAt = timestamp;

            return this.snapshot();
        }

        snapshot() {
            const profitLoss = this.won - this.wagered;
            const rtp = this.wagered > 0 ? (this.won / this.wagered) * 100 : null;
            return {
                startedAt: this.startedAt,
                updatedAt: this.updatedAt,
                rounds: this.rounds,
                wagered: this.wagered,
                won: this.won,
                profitLoss,
                rtp,
                consecutiveLosses: this.consecutiveLosses
            };
        }

        toMoneyValue(value) {
            return Number.isFinite(value) ? Math.max(0, value) : 0;
        }
    }

    const sessionTracker = new SessionTracker();

    function formatWagerLine(snap) {
        if (!snap || snap.rounds === 0) return 'Session: no bets tracked yet';
        const pl = snap.profitLoss;
        const sign = pl >= 0 ? '+' : '';
        const rtp = snap.rtp !== null ? ` · ${snap.rtp.toFixed(1)}% RTP` : '';
        return `Wagered ${snap.wagered.toFixed(4)} · ${sign}${pl.toFixed(4)} P/L · ${snap.rounds} rnd${rtp}`;
    }

    function sessionUnitLabel() {
        if (SITE.mode === 'stake-us') {
            return (stakeEngine.activeCurrency || getCurrency() || DEFAULT_US_CURRENCY).toUpperCase();
        }
        return 'SOL';
    }

    const sessionWatch = {
        oldBalance: 0,
        initialized: false,
        balanceChecks: 0,
        interval: null,
        currency: null,

        readBalance() {
            if (SITE.mode === 'stake-us') return getCurrentBalance();
            if (nutsEngine.playBalance === null) return null;
            return unitToSol(nutsEngine.playBalance);
        },

        start() {
            if (this.interval) return;
            sessionTracker.reset(this.readBalance() || 0);
            this.oldBalance = this.readBalance() || 0;
            this.initialized = false;
            this.balanceChecks = 0;
            this.currency = SITE.mode === 'stake-us' ? getCurrency() : 'sol';
            this.interval = setInterval(() => this.tick(), config.checkInterval * 1000);
            this.tick();
        },

        stop() {
            if (this.interval) clearInterval(this.interval);
            this.interval = null;
        },

        resetSession() {
            const cur = this.readBalance();
            sessionTracker.reset(cur || 0);
            this.oldBalance = cur || 0;
            this.initialized = (cur || 0) > 0;
            this.balanceChecks = 0;
            if (uiApi) uiApi.render();
            log('Session wager stats reset.', 'info');
        },

        tick() {
            if (SITE.mode === 'stake-us') {
                getCurrency.cached = null;
                const newCur = getCurrency();
                if (newCur !== this.currency) {
                    this.currency = newCur;
                    const cur = getCurrentBalance();
                    sessionTracker.reset(cur || 0);
                    this.oldBalance = cur || 0;
                    this.initialized = false;
                    this.balanceChecks = 0;
                }
                const cur = getCurrentBalance();
                if (!this.initialized) {
                    if (cur > 0 && ++this.balanceChecks >= MIN_BALANCE_CHECKS) {
                        this.initialized = true;
                        this.oldBalance = cur;
                        sessionTracker.reset(cur);
                    }
                    return;
                }
                if (cur !== this.oldBalance) {
                    sessionTracker.recordBalanceChange(this.oldBalance, cur);
                    this.oldBalance = cur;
                    if (uiApi) uiApi.render();
                }
                return;
            }
            const cur = this.readBalance();
            if (cur === null) return;
            if (!this.initialized) {
                if (cur > 0 && ++this.balanceChecks >= MIN_BALANCE_CHECKS) {
                    this.initialized = true;
                    this.oldBalance = cur;
                    sessionTracker.reset(cur);
                }
            }
        },

        onNutsBalance(prevUnits, nextUnits) {
            if (prevUnits === null || nextUnits === null || prevUnits === nextUnits) return;
            const prev = unitToSol(prevUnits);
            const next = unitToSol(nextUnits);
            if (!this.initialized) {
                if (next > 0 && ++this.balanceChecks >= MIN_BALANCE_CHECKS) {
                    this.initialized = true;
                    this.oldBalance = next;
                    sessionTracker.reset(next);
                }
                return;
            }
            sessionTracker.recordBalanceChange(prev, next);
            this.oldBalance = next;
            if (uiApi) uiApi.render();
        }
    };

    // --- Stake.us engine ---
    let cloudflareLockoutUntil = 0;
    function isCloudflareLocked() {
        return Date.now() < cloudflareLockoutUntil;
    }
    function lockoutForCloudflare(reason) {
        cloudflareLockoutUntil = Date.now() + CF_BACKOFF_MS;
        log(`Cloudflare challenge (${reason}). Backing off 60s.`, 'warning');
    }

    const BALANCE_SELECTORS = [
        '[data-testid="coin-toggle"] .content span[data-ds-text="true"]',
        '[data-testid="balance-toggle"] .content span[data-ds-text="true"]',
        '[data-testid="user-balance"] .numeric',
        '.numeric.variant-highlighted'
    ];

    function parseStakeAmount(text) {
        if (!text) return NaN;
        const raw = String(text).replace(/\u00a0/g, ' ').trim();
        const m = raw.match(/[-+]?\d[\d\s,.'’]*(?:[.,]\d+)?/);
        if (!m) return NaN;
        let token = m[0].replace(/[\s'’]/g, '');
        const hasDot = token.includes('.');
        const hasComma = token.includes(',');
        if (hasDot && hasComma) {
            if (token.lastIndexOf('.') > token.lastIndexOf(',')) token = token.replace(/,/g, '');
            else token = token.replace(/\./g, '').replace(/,/g, '.');
        } else if (hasComma && !hasDot) {
            const parts = token.split(',');
            token = parts.length === 2 && parts[1].length <= 2 ? `${parts[0]}.${parts[1]}` : token.replace(/,/g, '');
        } else token = token.replace(/,/g, '');
        const n = parseFloat(token);
        return isNaN(n) ? NaN : n;
    }

    const FIAT_DISPLAY = new Set(['USD', 'EUR', 'GBP', 'CAD', 'AUD']);
    function detectCurrencyFromBar() {
        const el = document.querySelector('[data-testid="coin-toggle"], [data-testid="balance-toggle"]');
        if (!el) return null;
        const matches = (el.textContent || '').match(/\b[A-Z]{2,5}\b/g);
        if (!matches) return null;
        for (const code of matches) {
            if (!FIAT_DISPLAY.has(code)) return code.toLowerCase();
        }
        return null;
    }
    function getCurrency() {
        const now = Date.now();
        if (getCurrency.cached && getCurrency.cacheTime && now - getCurrency.cacheTime < CURRENCY_CACHE_TIMEOUT) {
            return getCurrency.cached;
        }
        const el = document.querySelector('[data-active-currency]');
        if (el) {
            const c = el.getAttribute('data-active-currency');
            if (c) {
                getCurrency.cached = c.toLowerCase();
                getCurrency.cacheTime = now;
                return getCurrency.cached;
            }
        }
        const fromBar = detectCurrencyFromBar();
        if (fromBar) {
            getCurrency.cached = fromBar;
            getCurrency.cacheTime = now;
            return fromBar;
        }
        const api = getCurrentBalance._api || {};
        const keys = Object.keys(api).sort((a, b) => (api[b] || 0) - (api[a] || 0));
        if (keys.length && api[keys[0]] > 0) {
            getCurrency.cached = keys[0];
            getCurrency.cacheTime = now;
            return keys[0];
        }
        getCurrency.cached = DEFAULT_US_CURRENCY;
        getCurrency.cacheTime = now;
        return DEFAULT_US_CURRENCY;
    }

    function isFiatDisplayActive() {
        const el = document.querySelector('[data-testid="coin-toggle"], [data-testid="balance-toggle"]');
        if (!el) return false;
        const txt = (el.textContent || '').trim();
        return /[$€£]/.test(txt) || /\bUSD\b/i.test(txt);
    }

    function getCurrentBalance() {
        const cur = (stakeEngine.activeCurrency || getCurrency() || '').toLowerCase();
        const apiVal = getCurrentBalance._api?.[cur];
        if (typeof apiVal === 'number' && apiVal >= 0) {
            getCurrentBalance.lastKnown = apiVal;
            return apiVal;
        }
        if (isFiatDisplayActive()) return getCurrentBalance.lastKnown || 0;
        for (const sel of BALANCE_SELECTORS) {
            const el = document.querySelector(sel);
            if (el) {
                const val = parseStakeAmount(el.textContent);
                if (!isNaN(val) && val >= 0) {
                    getCurrentBalance.lastKnown = val;
                    return val;
                }
            }
        }
        return getCurrentBalance.lastKnown || 0;
    }

    class StakeApi {
        constructor() {
            this.apiUrl = window.location.origin + '/_api/graphql';
            this.headers = {
                'content-type': 'application/json',
                'x-access-token': getCookie('session'),
                'x-language': 'en',
                'apollographql-client-name': 'stake.com',
                'apollographql-client-version': '1.0.0'
            };
        }
        async call(body, opName) {
            if (isCloudflareLocked()) {
                return { error: true, type: 'cloudflare-lockout', message: 'CF backoff active' };
            }
            const headers = { ...this.headers, 'x-access-token': getCookie('session') };
            if (opName) headers['x-operation-name'] = opName;
            try {
                const res = await fetch(this.apiUrl, {
                    credentials: 'include',
                    headers,
                    referrer: window.location.origin,
                    body,
                    method: 'POST',
                    mode: 'cors',
                    cache: 'no-cache'
                });
                const ct = res.headers.get('content-type') || '';
                const cfMit = res.headers.get('cf-mitigated');
                if (
                    cfMit === 'challenge' ||
                    (ct.includes('text/html') && (res.status === 403 || res.status === 503))
                ) {
                    lockoutForCloudflare(`HTTP ${res.status}`);
                    return { error: true, type: 'cloudflare', message: 'Cloudflare challenge' };
                }
                const raw = await res.text();
                let parsed = null;
                try {
                    parsed = raw ? JSON.parse(raw) : null;
                } catch (e) { /* not json */ }
                if (!res.ok) {
                    if (raw && raw.trimStart().toLowerCase().startsWith('<!doctype')) {
                        lockoutForCloudflare('HTML body');
                        return { error: true, type: 'cloudflare' };
                    }
                    const detail = parsed?.errors?.[0]?.message || res.statusText;
                    return { error: true, status: res.status, message: detail, errors: parsed?.errors };
                }
                return parsed || {};
            } catch (e) {
                if (/failed to fetch|network/i.test(e.message || '')) {
                    lockoutForCloudflare('network');
                    return { error: true, type: 'network', message: e.message };
                }
                return { error: true, message: e.message };
            }
        }
        getBalances() {
            const q = {
                query: `query UserBalances { user { id balances { available { amount currency } vault { amount currency } } } } }`,
                variables: {}
            };
            return this.call(JSON.stringify(q), 'UserBalances');
        }
        depositToVault(currency, amount) {
            const enumCurrency = String(currency || '').toLowerCase();
            const roundedAmount = Math.floor(Number(amount) * 1e8) / 1e8;
            const q = {
                query: `mutation CreateVaultDeposit($currency: CurrencyEnum!, $amount: Float!) {
                    createVaultDeposit(currency: $currency, amount: $amount) { id amount currency }
                }`,
                variables: { currency: enumCurrency, amount: roundedAmount }
            };
            return this.call(JSON.stringify(q), 'CreateVaultDeposit');
        }
    }

    const stakeEngine = {
        activeCurrency: null,
        running: false,
        stakeApi: null,
        vaultInterval: null,
        apiBalanceInterval: null,
        oldBalance: 0,
        lastBalance: 0,
        isInitialized: false,
        balanceChecks: 0,
        isProcessing: false,
        lastVaultedDeposit: 0,

        isRunning() {
            return this.running;
        },

        async refreshApiBalance() {
            if (isCloudflareLocked()) return;
            try {
                if (!this.stakeApi) this.stakeApi = new StakeApi();
                const cur = (this.activeCurrency || '').toLowerCase();
                if (!cur) return;
                const resp = await this.stakeApi.getBalances();
                const balances = resp?.data?.user?.balances;
                if (!Array.isArray(balances)) return;
                getCurrentBalance._api = getCurrentBalance._api || {};
                for (const entry of balances) {
                    const code = entry?.available?.currency?.toLowerCase();
                    if (!code) continue;
                    const amt = entry.available.amount;
                    const n = typeof amt === 'number' ? amt : parseFloat(amt);
                    if (!isNaN(n) && n >= 0) getCurrentBalance._api[code] = n;
                }
            } catch (e) { /* blip */ }
        },

        startApiPolling() {
            if (this.apiBalanceInterval) clearInterval(this.apiBalanceInterval);
            this.apiBalanceInterval = setInterval(() => this.refreshApiBalance(), 5000);
            this.refreshApiBalance();
        },

        stopApiPolling() {
            if (this.apiBalanceInterval) clearInterval(this.apiBalanceInterval);
            this.apiBalanceInterval = null;
        },

        updateBaseline() {
            const cur = getCurrentBalance();
            if (cur > 0) {
                this.oldBalance = cur;
                if (!this.isInitialized && this.balanceChecks++ >= MIN_BALANCE_CHECKS) {
                    this.isInitialized = true;
                    log(`Baseline: ${cur.toFixed(6)} ${this.activeCurrency.toUpperCase()}`, 'info');
                }
            }
        },

        detectDeposit() {
            const sels = ['[data-testid*="notification"]', '[class*="notification"]', '[class*="transaction"]'];
            for (const sel of sels) {
                for (const node of document.querySelectorAll(sel)) {
                    const txt = (node.textContent || '').toLowerCase();
                    if (txt.includes('deposit') && /\d/.test(txt)) {
                        const amt = parseStakeAmount(node.textContent);
                        if (!isNaN(amt) && amt > 0) return amt;
                    }
                }
            }
            return 0;
        },

        async processDeposit(amount, isBigWin) {
            if (amount < 1e-8 || this.isProcessing) return;
            if (!canVaultNow()) {
                log(pickFlavor(FLAVOR.rateLimit), 'warning');
                return;
            }
            this.isProcessing = true;
            const pct = (config.saveAmount * (isBigWin ? config.bigWinMultiplier : 1) * 100).toFixed(0);
            log(`${pickFlavor(isBigWin ? FLAVOR.bigWin : FLAVOR.profit)} Vaulting ${pct}% — ${amount.toFixed(6)} ${this.activeCurrency.toUpperCase()}`, isBigWin ? 'bigwin' : 'profit');
            try {
                if (!this.stakeApi) this.stakeApi = new StakeApi();
                const resp = await this.stakeApi.depositToVault(this.activeCurrency, amount);
                this.isProcessing = false;
                if (resp?.data?.createVaultDeposit) {
                    recordVaultAction();
                    addVaulted(amount);
                    this.oldBalance = getCurrentBalance();
                    log(`Secured ${amount.toFixed(6)} ${this.activeCurrency.toUpperCase()}`, 'success');
                    return;
                }
                if (resp?.error) {
                    if (resp.type === 'cloudflare' || resp.type === 'cloudflare-lockout') {
                        log('CF backoff — vault skipped.', 'warning');
                    } else {
                        log(`Vault failed: ${resp.message || 'unknown'}`, 'error');
                    }
                    return;
                }
                const gql = resp?.errors?.[0]?.message;
                if (gql) log(`Stake: ${gql}`, 'error');
                else log('Vault returned no data.', 'error');
            } catch (e) {
                this.isProcessing = false;
                log('Vault error: ' + (e.message || 'unknown'), 'error');
            }
        },

        checkBalanceChanges() {
            getCurrency.cached = null;
            const newCur = getCurrency();
            if (newCur !== this.activeCurrency) {
                this.activeCurrency = newCur;
                vaultedSession = loadVaultedSession();
                this.isInitialized = false;
                this.balanceChecks = 0;
                log(`Currency → ${newCur.toUpperCase()}`, 'info');
            }
            const cur = getCurrentBalance();
            if (!this.isInitialized) {
                this.updateBaseline();
                return;
            }
            const dep = this.detectDeposit();
            if (dep > 0 && cur - this.lastBalance >= dep * 0.95 && this.lastVaultedDeposit !== dep) {
                this.processDeposit(dep * DEPOSIT_VAULT_PERCENTAGE, false);
                this.lastVaultedDeposit = dep;
                this.oldBalance = cur;
            } else if (cur > this.oldBalance) {
                const profit = cur - this.oldBalance;
                const isBig = cur > this.oldBalance * config.bigWinThreshold;
                const depAmt = profit * config.saveAmount * (isBig ? config.bigWinMultiplier : 1);
                this.processDeposit(depAmt, isBig);
                this.oldBalance = cur;
            } else if (cur < this.oldBalance) {
                this.oldBalance = cur;
            }
            this.lastBalance = cur;
        },

        start() {
            if (this.running) return;
            if (!getCookie('session')) {
                log('Log in to Stake.us first.', 'warning');
                return;
            }
            this.running = true;
            this.stakeApi = new StakeApi();
            this.activeCurrency = getCurrency();
            this.startApiPolling();
            this.oldBalance = 0;
            this.isInitialized = false;
            this.balanceChecks = 0;
            this.isProcessing = false;
            this.lastBalance = getCurrentBalance();
            this.lastVaultedDeposit = 0;
            vaultedSession = loadVaultedSession();
            vaultActionTimestamps = loadRateLimitData();
            let tries = 0;
            const boot = setInterval(() => {
                if (!this.running) {
                    clearInterval(boot);
                    return;
                }
                this.updateBaseline();
                if (++tries >= BALANCE_INIT_RETRIES && !this.isInitialized && getCurrentBalance() > 0) {
                    this.isInitialized = true;
                    this.oldBalance = getCurrentBalance();
                }
            }, 1000);
            if (this.vaultInterval) clearInterval(this.vaultInterval);
            this.vaultInterval = setInterval(() => this.checkBalanceChanges(), config.checkInterval * 1000);
            log(pickFlavor(FLAVOR.start), 'success');
            log(`Watching ${this.activeCurrency.toUpperCase()}`, 'info');
        },

        stop() {
            if (!this.running) return;
            this.running = false;
            if (this.vaultInterval) clearInterval(this.vaultInterval);
            this.vaultInterval = null;
            this.stopApiPolling();
            log(pickFlavor(FLAVOR.stop), 'info');
        },

        kill() {
            this.stop();
            log('Kill switch — monitoring stopped.', 'warning');
        },

        formatVaulted() {
            const c = (this.activeCurrency || DEFAULT_US_CURRENCY).toUpperCase();
            return `${vaultedSession.toFixed(6)} ${c} vaulted`;
        }
    };

    // --- nuts.gg WebSocket engine (hook at document-start) ---
    const NUTS_UNIT = 1_000_000_000;
    const WS_URL_MATCH = 'nuts.tools/graphql';
    const DEV_USERNAME = 'jmenichole';
    const AUTO_TIP_PERCENT = 0.01;

    let nutsSocket = null;
    let socketAuthenticated = false;
    const attachedSockets = new WeakSet();
    let pendingMutation = null;
    let pendingTipMutation = null;

    function nutsUuid() {
        if (crypto?.randomUUID) return crypto.randomUUID();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
    }

    function nutsOnIncoming(raw) {
        try {
            const msg = JSON.parse(raw);
            if (msg.type === 'connection_ack' || msg.type === 'next' || msg.type === 'data') {
                if (!socketAuthenticated) {
                    socketAuthenticated = true;
                    log('nuts.tools socket ready', 'info');
                }
            }
            if (msg.type === 'next' && msg.payload?.data) nutsHandlePayload(msg);
        } catch (e) { /* ignore */ }
    }

    function attachNutsSocket(ws) {
        if (!ws || attachedSockets.has(ws)) return;
        attachedSockets.add(ws);
        nutsSocket = ws;
        ws.addEventListener('message', (evt) => nutsOnIncoming(evt.data));
        ws.addEventListener('close', () => {
            if (nutsSocket === ws) {
                nutsSocket = null;
                socketAuthenticated = false;
            }
        });
    }

    try {
        const OriginalSend = WebSocket.prototype.send;
        WebSocket.prototype.send = function (data) {
            try {
                if (typeof this.url === 'string' && this.url.includes(WS_URL_MATCH)) attachNutsSocket(this);
            } catch (e) { /* ignore */ }
            return OriginalSend.apply(this, arguments);
        };
    } catch (e) {
        console.error(LOG_PREFIX, 'WS send patch failed', e);
    }
    try {
        const OriginalWS = window.WebSocket;
        function HookedWS(url, protocols) {
            const ws = protocols !== undefined ? new OriginalWS(url, protocols) : new OriginalWS(url);
            try {
                if (String(url).includes(WS_URL_MATCH)) attachNutsSocket(ws);
            } catch (e) { /* ignore */ }
            return ws;
        }
        HookedWS.prototype = OriginalWS.prototype;
        HookedWS.CONNECTING = OriginalWS.CONNECTING;
        HookedWS.OPEN = OriginalWS.OPEN;
        HookedWS.CLOSING = OriginalWS.CLOSING;
        HookedWS.CLOSED = OriginalWS.CLOSED;
        window.WebSocket = HookedWS;
    } catch (e) { /* ignore */ }

    const unitToSol = (u) => (Number(u) || 0) / NUTS_UNIT;
    const solToUnit = (s) => Math.floor(Number(s) * NUTS_UNIT);

    function sendVaultDeposit(amountUnits) {
        return new Promise((resolve, reject) => {
            if (!nutsSocket || nutsSocket.readyState !== 1 || !socketAuthenticated) {
                return reject(new Error('Socket not ready'));
            }
            const id = nutsUuid();
            const payload = {
                id,
                type: 'subscribe',
                payload: {
                    query: 'mutation depositToVault($amount: Float!) {\n  depositToVault(amount: $amount)\n}',
                    operationName: 'depositToVault',
                    variables: { amount: Math.floor(amountUnits) }
                }
            };
            const timeout = setTimeout(() => {
                if (pendingMutation?.id === id) {
                    pendingMutation = null;
                    reject(new Error('Deposit timed out'));
                }
            }, 15000);
            pendingMutation = {
                id,
                resolve: (msg) => {
                    clearTimeout(timeout);
                    resolve(msg);
                }
            };
            try {
                nutsSocket.send(JSON.stringify(payload));
            } catch (e) {
                clearTimeout(timeout);
                pendingMutation = null;
                reject(e);
            }
        });
    }

    function sendDevTip(amountUnits) {
        return new Promise((resolve, reject) => {
            if (!nutsSocket || nutsSocket.readyState !== 1 || !socketAuthenticated) {
                return reject(new Error('Socket not ready'));
            }
            const id = nutsUuid();
            const payload = {
                id,
                type: 'subscribe',
                payload: {
                    query: 'mutation tip($recipient: String!, $amount: Float!, $private: Boolean!) {\n tip(recipient: $recipient, amount: $amount, private: $private) { amount }\n}',
                    operationName: 'tip',
                    variables: { amount: Math.floor(amountUnits), recipient: DEV_USERNAME, private: true }
                }
            };
            const timeout = setTimeout(() => {
                if (pendingTipMutation?.id === id) {
                    pendingTipMutation = null;
                    reject(new Error('Tip timed out'));
                }
            }, 15000);
            pendingTipMutation = {
                id,
                resolve: (msg) => {
                    clearTimeout(timeout);
                    resolve(msg);
                }
            };
            try {
                nutsSocket.send(JSON.stringify(payload));
            } catch (e) {
                clearTimeout(timeout);
                pendingTipMutation = null;
                reject(e);
            }
        });
    }

    function nutsHandlePayload(msg) {
        const d = msg.payload.data;
        if (!d) return;
        if ('balance' in d && d.balance?.after !== undefined) {
            const prevBalance = nutsEngine.playBalance;
            nutsEngine.playBalance = Number(d.balance.after);
            sessionWatch.onNutsBalance(prevBalance, nutsEngine.playBalance);
            if (nutsEngine.playBalance > 0 && nutsEngine.oldBalance === null) nutsEngine.oldBalance = nutsEngine.playBalance;
            if (!nutsEngine.isInitialized && ++nutsEngine.balanceChecks >= MIN_BALANCE_CHECKS && nutsEngine.playBalance > 0) {
                nutsEngine.isInitialized = true;
                nutsEngine.oldBalance = nutsEngine.playBalance;
                log(`Baseline: ${unitToSol(nutsEngine.playBalance).toFixed(6)} SOL`, 'info');
            }
            if (uiApi) uiApi.render();
        }
        if ('vaultBalance' in d && d.vaultBalance?.after !== undefined) {
            const newVault = Number(d.vaultBalance.after);
            if (nutsEngine.previousVaultBalance !== null && newVault < nutsEngine.previousVaultBalance && config.autoTipEnabled) {
                const withdrawn = nutsEngine.previousVaultBalance - newVault;
                let tipUnits = Math.floor(withdrawn * AUTO_TIP_PERCENT);
                const minTip = solToUnit(0.0001);
                if (tipUnits < minTip) tipUnits = minTip;
                if (withdrawn > tipUnits) {
                    sendDevTip(tipUnits).then(() => log('Dev auto-tip sent.', 'success')).catch((e) => log(`Tip failed: ${e.message}`, 'error'));
                }
            }
            nutsEngine.previousVaultBalance = newVault;
            nutsEngine.vaultBalance = newVault;
        }
        if ('depositToVault' in d && pendingMutation && msg.id === pendingMutation.id) {
            pendingMutation.resolve(msg);
            pendingMutation = null;
        }
        if ('tip' in d && pendingTipMutation && msg.id === pendingTipMutation.id) {
            pendingTipMutation.resolve(msg);
            pendingTipMutation = null;
        }
    }

    const nutsEngine = {
        playBalance: null,
        vaultBalance: null,
        oldBalance: null,
        previousVaultBalance: null,
        isInitialized: false,
        balanceChecks: 0,
        isProcessing: false,
        running: false,
        vaultInterval: null,

        isRunning() {
            return this.running;
        },

        async processDeposit(amountUnits, isBigWin) {
            if (amountUnits < solToUnit(config.minDepositSol) || this.isProcessing) return;
            if (!canVaultNow()) {
                log(pickFlavor(FLAVOR.rateLimit), 'warning');
                return;
            }
            if (!socketAuthenticated) {
                log('Socket not authenticated yet.', 'warning');
                return;
            }
            this.isProcessing = true;
            const pct = (config.saveAmount * (isBigWin ? config.bigWinMultiplier : 1) * 100).toFixed(0);
            log(`${pickFlavor(isBigWin ? FLAVOR.bigWin : FLAVOR.profit)} Vaulting ${pct}% — ${unitToSol(amountUnits).toFixed(6)} SOL`, isBigWin ? 'bigwin' : 'profit');
            try {
                await sendVaultDeposit(amountUnits);
                recordVaultAction();
                addVaulted(unitToSol(amountUnits));
                this.oldBalance = this.playBalance;
                log(`Secured ${unitToSol(amountUnits).toFixed(6)} SOL`, 'success');
            } catch (e) {
                log(`Vault error: ${e.message}`, 'error');
            }
            this.isProcessing = false;
        },

        checkBalanceChanges() {
            if (this.playBalance === null || !this.isInitialized) return;
            if (this.oldBalance === null) {
                this.oldBalance = this.playBalance;
                return;
            }
            if (this.playBalance > this.oldBalance) {
                const profit = this.playBalance - this.oldBalance;
                const isBig = (this.oldBalance > 0 ? this.playBalance / this.oldBalance : 1) >= config.bigWinThreshold;
                const dep = Math.floor(profit * config.saveAmount * (isBig ? config.bigWinMultiplier : 1));
                if (dep > 0) this.processDeposit(dep, isBig);
                this.oldBalance = this.playBalance;
            } else if (this.playBalance < this.oldBalance) {
                this.oldBalance = this.playBalance;
            }
        },

        start() {
            if (this.running) return;
            this.running = true;
            this.oldBalance = this.playBalance;
            this.isProcessing = false;
            this.balanceChecks = 0;
            this.isInitialized = false;
            vaultedSession = loadVaultedSession();
            vaultActionTimestamps = loadRateLimitData();
            if (this.vaultInterval) clearInterval(this.vaultInterval);
            this.vaultInterval = setInterval(() => this.checkBalanceChanges(), config.checkInterval * 1000);
            log(pickFlavor(FLAVOR.start), 'success');
        },

        stop() {
            if (!this.running) return;
            this.running = false;
            if (this.vaultInterval) clearInterval(this.vaultInterval);
            this.vaultInterval = null;
            log(pickFlavor(FLAVOR.stop), 'info');
        },

        kill() {
            this.stop();
            log('Kill switch — monitoring stopped.', 'warning');
        },

        formatVaulted() {
            return `${vaultedSession.toFixed(6)} SOL vaulted`;
        }
    };

    const engine = SITE.mode === 'stake-us' ? stakeEngine : nutsEngine;

    function engineStart() {
        engine.start();
        setLastRunning(true);
        if (uiApi) uiApi.render();
    }
    function engineStop(clearLast) {
        engine.stop();
        if (clearLast) setLastRunning(false);
        if (uiApi) uiApi.render();
    }
    function engineKill() {
        engine.kill();
        setLastRunning(false);
        if (uiApi) uiApi.render();
    }

    // --- UI ---
    let uiApi = null;
    let viewMode = 'full';
    let drawerOpen = false;
    let panelHidden = false;

    function formatStatusTime() {
        const d = new Date();
        return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
    }

    function injectStyles() {
        if (document.getElementById('tc-av-share-styles')) return;
        const style = document.createElement('style');
        style.id = 'tc-av-share-styles';
        style.textContent = `
        #tc-av-share-root {
            position: fixed; top: 72px; right: 12px; z-index: 2147483646;
            font-family: ${BRAND.font}; font-size: 14px; color: ${BRAND.text};
            min-width: 280px; max-width: min(360px, calc(100vw - 24px));
            background: ${BRAND.bgCard}; border: 1px solid ${BRAND.border};
            border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.55);
            user-select: none; overflow: hidden;
        }
        #tc-av-share-root.hidden-panel { display: none; }
        #tc-av-share-root.compact { min-width: 260px; }
        #tc-av-share-root .tc-hdr {
            display: flex; align-items: center; justify-content: space-between;
            padding: 10px 12px; background: ${BRAND.bg}; border-bottom: 1px solid ${BRAND.border};
            cursor: grab;
        }
        #tc-av-share-root .tc-hdr:active { cursor: grabbing; }
        #tc-av-share-root .tc-title { font-weight: 700; font-size: 13px; color: ${BRAND.teal}; }
        #tc-av-share-root .tc-hdr-btns { display: flex; gap: 4px; }
        #tc-av-share-root .tc-icon-btn {
            background: transparent; border: 1px solid ${BRAND.border}; color: ${BRAND.muted};
            width: 28px; height: 28px; border-radius: 6px; cursor: pointer; font-size: 14px; line-height: 1;
        }
        #tc-av-share-root .tc-icon-btn:hover { color: ${BRAND.text}; border-color: ${BRAND.teal}; }
        #tc-av-share-root .tc-body { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
        #tc-av-share-root .tc-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        #tc-av-share-root .tc-label { color: ${BRAND.muted}; font-size: 12px; }
        #tc-av-share-root input[type="number"] {
            width: 72px; padding: 6px 8px; border-radius: 6px; border: 1px solid ${BRAND.border};
            background: #080a0d; color: ${BRAND.text}; text-align: right; font-size: 13px;
        }
        #tc-av-share-root input[type="checkbox"] { accent-color: ${BRAND.teal}; width: 16px; height: 16px; }
        #tc-av-share-root .tc-tip-row { font-size: 11px; color: ${BRAND.muted}; line-height: 1.35; gap: 8px; align-items: flex-start; }
        #tc-av-share-root .tc-master {
            width: 100%; min-height: 48px; border: none; border-radius: 10px; font-weight: 800;
            font-size: 15px; letter-spacing: 0.04em; cursor: pointer; transition: background 0.15s;
        }
        #tc-av-share-root .tc-master.off { background: ${BRAND.border}; color: ${BRAND.muted}; }
        #tc-av-share-root .tc-master.on { background: ${BRAND.teal}; color: #041210; }
        #tc-av-share-root .tc-master.on:active { background: ${BRAND.tealDark}; }
        #tc-av-share-root .tc-stat { font-size: 12px; color: ${BRAND.teal}; font-weight: 600; }
        #tc-av-share-root .tc-wager { font-size: 11px; color: ${BRAND.muted}; line-height: 1.35; font-family: ui-monospace, monospace; }
        #tc-av-share-root .tc-status { font-size: 11px; color: ${BRAND.muted}; line-height: 1.4; word-break: break-word; }
        #tc-av-share-root .tc-status .tc-time { color: #4B5563; margin-right: 6px; }
        #tc-av-share-root .tc-status.success { color: ${BRAND.teal}; }
        #tc-av-share-root .tc-status.warning { color: #fbbf24; }
        #tc-av-share-root .tc-status.error { color: ${BRAND.danger}; }
        #tc-av-share-root .tc-btn-primary {
            width: 100%; min-height: 44px; border: none; border-radius: 10px; font-weight: 700;
            background: ${BRAND.teal}; color: #041210; cursor: pointer; font-size: 14px;
        }
        #tc-av-share-root .tc-drawer {
            max-height: 0; overflow: hidden; transition: max-height 0.25s ease;
            border-top: 0 solid ${BRAND.border};
        }
        #tc-av-share-root .tc-drawer.open {
            max-height: 520px; border-top-width: 1px; padding-top: 10px;
        }
        #tc-av-share-root .tc-drawer-inner { display: flex; flex-direction: column; gap: 10px; }
        #tc-av-share-root .tc-link { color: ${BRAND.teal}; font-size: 12px; text-decoration: none; }
        #tc-av-share-root .tc-link:hover { text-decoration: underline; }
        #tc-av-share-root .tc-reset { background: transparent; border: 1px solid ${BRAND.danger}; color: ${BRAND.danger};
            padding: 8px; border-radius: 8px; cursor: pointer; font-size: 12px; }
        #tc-av-share-root .tc-footer { text-align: center; font-size: 10px; color: ${BRAND.muted};
            padding: 8px; border-top: 1px solid ${BRAND.border}; }
        #tc-av-share-stealth {
            position: fixed; bottom: 14px; right: 14px; width: 14px; height: 14px; border-radius: 50%;
            background: #4B5563; z-index: 2147483646; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        }
        #tc-av-share-stealth.running { background: ${BRAND.teal}; }
        #tc-av-share-stealth.hidden { display: none; }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    function bindDrag(header, root) {
        let dragging = false;
        let dx = 0;
        let dy = 0;
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.tc-hdr-btns')) return;
            dragging = true;
            const r = root.getBoundingClientRect();
            dx = e.clientX - r.left;
            dy = e.clientY - r.top;
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            root.style.left = Math.max(0, Math.min(window.innerWidth - root.offsetWidth, e.clientX - dx)) + 'px';
            root.style.top = Math.max(0, Math.min(window.innerHeight - root.offsetHeight, e.clientY - dy)) + 'px';
            root.style.right = 'auto';
        });
        document.addEventListener('mouseup', () => {
            dragging = false;
        });
    }

    function readSettingsFromDom(root) {
        const g = (id) => root.querySelector(id);
        const save = parseFloat(g('#tc-save')?.value);
        const bigT = parseFloat(g('#tc-big-t')?.value);
        const bigM = parseFloat(g('#tc-big-m')?.value);
        const chk = parseInt(g('#tc-interval')?.value, 10);
        if (!isNaN(save) && save >= 0) config.saveAmount = Math.min(save, 1);
        if (!isNaN(bigT) && bigT >= 1) config.bigWinThreshold = bigT;
        if (!isNaN(bigM) && bigM >= 1) config.bigWinMultiplier = bigM;
        if (!isNaN(chk) && chk >= 10) config.checkInterval = chk;
        if (SITE.mode === 'nuts-ws') {
            const minD = parseFloat(g('#tc-min-dep')?.value);
            if (!isNaN(minD) && minD >= 0) config.minDepositSol = minD;
            config.autoTipEnabled = !!g('#tc-auto-tip')?.checked;
        }
        saveConfig(config);
    }

    function settingsHtml() {
        const nutsExtra =
            SITE.mode === 'nuts-ws'
                ? `
            <div class="tc-row"><span class="tc-label">Min deposit (SOL)</span>
                <input type="number" id="tc-min-dep" min="0" step="0.0001" value="${config.minDepositSol}"></div>
            <div class="tc-row tc-tip-row">
                <input type="checkbox" id="tc-auto-tip" ${config.autoTipEnabled ? 'checked' : ''}>
                <label for="tc-auto-tip">Auto-tip ${AUTO_TIP_PERCENT * 100}% on vault withdraw to @${DEV_USERNAME} (optional)</label>
            </div>`
                : '';
        return `
            <div class="tc-row"><span class="tc-label">Skim % of profit</span>
                <input type="number" id="tc-save" min="0" max="1" step="0.01" value="${config.saveAmount}"></div>
            <div class="tc-row"><span class="tc-label">Heater threshold (×)</span>
                <input type="number" id="tc-big-t" min="1" step="0.1" value="${config.bigWinThreshold}"></div>
            <div class="tc-row"><span class="tc-label">Heater multiplier</span>
                <input type="number" id="tc-big-m" min="1" step="0.1" value="${config.bigWinMultiplier}"></div>
            <div class="tc-row"><span class="tc-label">Check interval (sec)</span>
                <input type="number" id="tc-interval" min="10" step="1" value="${config.checkInterval}"></div>
            ${nutsExtra}`;
    }

    function createUI() {
        document.getElementById('tc-av-share-root')?.remove();
        document.getElementById('tc-av-share-stealth')?.remove();
        injectStyles();

        const stealth = document.createElement('div');
        stealth.id = 'tc-av-share-stealth';
        stealth.className = 'hidden';
        stealth.title = 'TiltCheck AutoVault (tap to show)';

        const root = document.createElement('div');
        root.id = 'tc-av-share-root';
        const onboarded = isOnboarded();
        root.classList.toggle('compact', onboarded);

        const header = document.createElement('div');
        header.className = 'tc-hdr';
        header.innerHTML = `
            <span class="tc-title">TC · AutoVault</span>
            <div class="tc-hdr-btns">
                <button type="button" class="tc-icon-btn" id="tc-min" title="Minimize">−</button>
                <button type="button" class="tc-icon-btn" id="tc-stealth" title="Stealth">○</button>
                <button type="button" class="tc-icon-btn" id="tc-gear" title="Settings">⚙</button>
            </div>`;

        const body = document.createElement('div');
        body.className = 'tc-body';

        if (!onboarded) {
            body.innerHTML = settingsHtml() + `<button type="button" class="tc-btn-primary" id="tc-start-onboard">Get started</button>`;
        } else {
            body.innerHTML = `
                <button type="button" class="tc-master off" id="tc-master">AUTOVAULT OFF</button>
                <div class="tc-stat" id="tc-vaulted-stat">0 vaulted</div>
                <div class="tc-wager" id="tc-wager-stat">Session: waiting for bets…</div>
                <div class="tc-status" id="tc-status-line"><span class="tc-time"></span><span class="tc-msg">Ready</span></div>
                <div class="tc-drawer" id="tc-drawer"><div class="tc-drawer-inner" id="tc-drawer-inner"></div></div>`;
        }

        const footer = document.createElement('div');
        footer.className = 'tc-footer';
        footer.textContent = BRAND.tagline;

        root.appendChild(header);
        root.appendChild(body);
        root.appendChild(footer);
        document.body.appendChild(stealth);
        document.body.appendChild(root);
        bindDrag(header, root);

        const drawer = root.querySelector('#tc-drawer');
        const drawerInner = root.querySelector('#tc-drawer-inner');
        const gearBtn = root.querySelector('#tc-gear');

        function setStealthMode(on) {
            if (on) {
                root.classList.add('hidden-panel');
                stealth.classList.remove('hidden');
                stealth.classList.toggle('running', engine.isRunning());
            } else {
                root.classList.remove('hidden-panel');
                panelHidden = false;
            }
        }

        root.querySelector('#tc-min')?.addEventListener('click', (e) => {
            e.stopPropagation();
            root.classList.add('hidden-panel');
            panelHidden = true;
        });
        root.querySelector('#tc-stealth')?.addEventListener('click', (e) => {
            e.stopPropagation();
            setStealthMode(true);
        });
        stealth.addEventListener('click', () => {
            root.classList.remove('hidden-panel');
            stealth.classList.add('hidden');
            panelHidden = false;
        });

        gearBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!onboarded) return;
            drawerOpen = !drawerOpen;
            if (drawer) drawer.classList.toggle('open', drawerOpen);
            if (drawerOpen && drawerInner && !drawerInner.innerHTML) {
                drawerInner.innerHTML =
                    settingsHtml() +
                    `<div class="tc-wager" id="tc-wager-detail"></div>` +
                    `<a class="tc-link" href="https://tiltcheck.me/tools/session-wager" target="_blank" rel="noopener">Session wager tool</a>` +
                    `<a class="tc-link" href="${BRAND.home}" target="_blank" rel="noopener">AutoVault docs</a>` +
                    `<button type="button" class="tc-reset" id="tc-reset-session">Reset session stats</button>` +
                    `<button type="button" class="tc-reset" id="tc-reset-onboard">Reset onboarding</button>`;
                drawerInner.querySelectorAll('input').forEach((inp) => {
                    inp.addEventListener('change', () => {
                        readSettingsFromDom(drawerInner);
                        if (engine.isRunning()) {
                            engine.stop();
                            engine.start();
                        }
                        render();
                    });
                });
                drawerInner.querySelector('#tc-reset-onboard')?.addEventListener('click', () => {
                    engineStop(true);
                    sessionWatch.stop();
                    resetOnboarding();
                    createUI();
                });
                drawerInner.querySelector('#tc-reset-session')?.addEventListener('click', () => {
                    sessionWatch.resetSession();
                    render();
                });
            }
        });

        root.querySelector('#tc-start-onboard')?.addEventListener('click', () => {
            readSettingsFromDom(body);
            setOnboarded();
            setLastRunning(true);
            createUI();
            sessionWatch.start();
            engineStart();
        });

        const master = root.querySelector('#tc-master');
        if (master) {
            let pressTimer = null;
            let killJustFired = false;
            const updateMasterLabel = () => {
                const on = engine.isRunning();
                master.classList.toggle('on', on);
                master.classList.toggle('off', !on);
                master.textContent = on ? 'AUTOVAULT ON' : 'AUTOVAULT OFF';
                stealth.classList.toggle('running', on);
            };
            const fireKillSwitch = () => {
                killJustFired = true;
                engineKill();
                updateMasterLabel();
                render();
                setTimeout(() => {
                    killJustFired = false;
                }, 400);
            };
            master.addEventListener('click', () => {
                if (killJustFired) return;
                if (engine.isRunning()) {
                    engineStop(true);
                } else {
                    if (drawerOpen && drawerInner) readSettingsFromDom(drawerInner);
                    engineStart();
                }
                updateMasterLabel();
                render();
            });
            master.addEventListener('mousedown', () => {
                if (!engine.isRunning()) return;
                pressTimer = setTimeout(fireKillSwitch, 800);
            });
            master.addEventListener('mouseup', () => clearTimeout(pressTimer));
            master.addEventListener('mouseleave', () => clearTimeout(pressTimer));
            master.addEventListener('touchstart', () => {
                if (!engine.isRunning()) return;
                pressTimer = setTimeout(fireKillSwitch, 800);
            }, { passive: true });
            master.addEventListener('touchend', () => clearTimeout(pressTimer));
            updateMasterLabel();
        }

        onStatusUpdate = (msg, type) => {
            const line = root.querySelector('#tc-status-line');
            if (!line) return;
            line.className = 'tc-status ' + (type || 'info');
            const timeEl = line.querySelector('.tc-time');
            const msgEl = line.querySelector('.tc-msg');
            if (timeEl) timeEl.textContent = formatStatusTime() + ' ';
            if (msgEl) msgEl.textContent = msg;
            else line.innerHTML = `<span class="tc-time">${formatStatusTime()} </span><span class="tc-msg">${msg}</span>`;
        };

        function render() {
            const stat = root.querySelector('#tc-vaulted-stat');
            if (stat) stat.textContent = engine.formatVaulted();
            const snap = sessionTracker.snapshot();
            const unit = sessionUnitLabel();
            const wagerLine = formatWagerLine(snap);
            const wagerEl = root.querySelector('#tc-wager-stat');
            if (wagerEl) wagerEl.textContent = `${wagerLine} (${unit})`;
            const wagerDetail = root.querySelector('#tc-wager-detail');
            if (wagerDetail) {
                wagerDetail.textContent =
                    snap.rounds > 0
                        ? `Won ${snap.won.toFixed(4)} · Loss streak ${snap.consecutiveLosses} · ${unit}`
                        : 'Play a round — balance changes become wager stats.';
            }
            if (master) {
                const on = engine.isRunning();
                master.classList.toggle('on', on);
                master.classList.toggle('off', !on);
                master.textContent = on ? 'AUTOVAULT ON' : 'AUTOVAULT OFF';
            }
            stealth.classList.toggle('running', engine.isRunning());
            if (!panelHidden) stealth.classList.add('hidden');
        }

        render();
        if (onboarded) sessionWatch.start();
        if (onboarded && getLastRunning()) {
            setTimeout(() => {
                if (!engine.isRunning()) engineStart();
            }, 1200);
        }

        return { render };
    }

    function mountUI(reason) {
        if (!document.body) return false;
        try {
            uiApi = createUI();
            console.log(LOG_PREFIX, 'UI mounted (' + reason + ')');
            return true;
        } catch (e) {
            console.error(LOG_PREFIX, 'UI mount failed', e);
            return false;
        }
    }

    function scheduleMount() {
        let attempts = 0;
        const tryMount = () => {
            attempts++;
            if (mountUI('retry-' + attempts)) return;
            if (attempts < 80) setTimeout(tryMount, 150);
            else console.error(LOG_PREFIX, 'UI never mounted');
        };
        tryMount();
    }

    if (document.body) scheduleMount();
    else {
        const obs = new MutationObserver(() => {
            if (document.body) {
                obs.disconnect();
                scheduleMount();
            }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
    }

    window.addEventListener(
        'load',
        () => {
            if (!document.getElementById('tc-av-share-root')) scheduleMount();
        },
        { once: true }
    );
})();
