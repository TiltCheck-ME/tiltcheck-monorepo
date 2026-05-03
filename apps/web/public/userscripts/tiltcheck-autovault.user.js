// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-03
// ==UserScript==
// @name         TiltCheck AutoVault — Bag Secured
// @namespace    https://tiltcheck.me/userscripts
// @version      3.0.0
// @description  TiltCheck AutoVault for crypto + sweeps casinos. Skims a slice of every win straight to the vault so the heater does not give it back. Best on Stake.us (clean API). Stake.com mirrors work when Cloudflare lets them. Best-effort DOM mode for BC.Game, Roobet, Shuffle, Rollbit, Gamdom. Non-custodial — TiltCheck never touches funds. Made for Degens. By Degens.
// @author       TiltCheck (jmenichole) — original Stake logic by Ruby (stakestats.net)
// @homepage     https://tiltcheck.me
// @website      https://tiltcheck.me/tools/auto-vault
// @supportURL   https://tiltcheck.me/contact
// @updateURL    https://tiltcheck.me/userscripts/tiltcheck-autovault.user.js
// @downloadURL  https://tiltcheck.me/userscripts/tiltcheck-autovault.user.js
// @icon         https://tiltcheck.me/icon.png
// Stake (full API mode — most reliable on stake.us)
// @match        https://stake.com/*
// @match        https://stake.bet/*
// @match        https://stake.games/*
// @match        https://staketr.com/*
// @match        https://staketr2.com/*
// @match        https://staketr3.com/*
// @match        https://staketr4.com/*
// @match        https://stake.bz/*
// @match        https://stake.us/*
// @match        https://stake.pet/*
// Generic DOM mode (nudge-only — opens vault dialog when a win is detected,
// leaves the user to confirm the actual deposit. No API access.)
// @match        https://shuffle.us/*
// @match        https://*.shuffle.us/*
// @match        https://shuffle.com/*
// @match        https://*.shuffle.com/*
// @match        https://gamba.com/*
// @match        https://*.gamba.com/*
// @match        https://gambacasino.com/*
// @match        https://*.gambacasino.com/*
// @match        https://goated.com/*
// @match        https://*.goated.com/*
// @match        https://bc.game/*
// @match        https://*.bc.game/*
// @match        https://bcgame.com/*
// @match        https://*.bcgame.com/*
// @match        https://roobet.com/*
// @match        https://*.roobet.com/*
// @match        https://rollbit.com/*
// @match        https://*.rollbit.com/*
// @match        https://gamdom.com/*
// @match        https://*.gamdom.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // --- Brand constants ---
    const BRAND = {
        name: 'TiltCheck',
        product: 'AutoVault',
        tagline: 'Made for Degens. By Degens.',
        url: 'https://tiltcheck.me',
        // Live values from apps/web/src/app/globals.css
        teal: '#17c3b2',
        tealDark: '#129d8f',
        tealGlow: 'rgba(23,195,178,0.4)',
        gold: '#ffd700',
        danger: '#ef4444',
        bgPage: '#0a0c10',
        bgSurface: '#0d1117',
        bgCard: '#12161e',
        bgElevated: '#161a21',
        bgInput: '#080a0d',
        textPrimary: '#ffffff',
        textSecondary: '#c4ced8',
        textMuted: '#8a97a8',
        textDisabled: '#4B5563',
        borderSubtle: '#1e2533',
        borderDefault: '#283347',
        borderEmphasis: '#344158',
        fontSans: '"Inter", "Segoe UI", Roboto, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        fontMono: '"JetBrains Mono", "SF Mono", Menlo, Monaco, Consolas, monospace'
    };

    // --- Config ---
    const INIT_DELAY = 2000;
    const DEFAULT_CURRENCY = 'bnb';
    const DEFAULT_US_CURRENCY = 'sc';
    const MIN_BALANCE_CHECKS = 2;
    const DEPOSIT_VAULT_PERCENTAGE = 0.2;
    const CURRENCY_CACHE_TIMEOUT = 5000;
    const BALANCE_INIT_RETRIES = 5;
    const RATE_LIMIT_MAX = 50;
    const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour, matches Stake's vault throttle window

    // Storage keys are namespaced so this script does not collide with the
    // upstream Ruby/StakeStats version if a user happens to have both.
    const STORAGE_PREFIX = 'tiltcheck-autovault';

    const DEFAULT_CONFIG = {
        saveAmount: 0.1,        // 10% of profit goes to vault
        bigWinThreshold: 5,     // 5x balance jump counts as a heater
        bigWinMultiplier: 3,    // skim 3x more on a heater
        checkInterval: 90       // seconds between checks
    };

    function loadConfig() {
        const saved = localStorage.getItem(`${STORAGE_PREFIX}-config`);
        if (saved) {
            try {
                return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
            } catch (e) {
                // Bootstrap path: log() is not initialized yet, so go straight to console.
                console.warn('[TiltCheck AutoVault] Saved config is cooked. Falling back to defaults.', e);
            }
        }
        return { ...DEFAULT_CONFIG };
    }

    function saveConfig(cfg) {
        try {
            localStorage.setItem(`${STORAGE_PREFIX}-config`, JSON.stringify(cfg));
        } catch (e) {
            // Storage full or blocked. Not fatal.
        }
    }

    let config = loadConfig();

    // --- Site detection ---
    const hostname = window.location.hostname;
    const isStakeUS = /(^|\.)stake\.us$/i.test(hostname);

    // Casinos with a real, scriptable Stake-style GraphQL API.
    const STAKE_API_HOSTS = [
        /(^|\.)stake\.com$/i,
        /(^|\.)stake\.bet$/i,
        /(^|\.)stake\.games$/i,
        /(^|\.)stake\.bz$/i,
        /(^|\.)stake\.us$/i,
        /(^|\.)stake\.pet$/i,
        /(^|\.)staketr\d?\.com$/i
    ];

    // Casinos we recognize but cannot script via API. Generic DOM "nudge mode"
    // opens the vault dialog at the right moment and lets the user confirm.
    // Each entry has a display name and the textual hints we use to find the
    // vault button in the casino's own UI.
    const GENERIC_DOM_HOSTS = [
        { name: 'Shuffle.us',  match: /(^|\.)shuffle\.us$/i,        vaultHints: ['vault', 'safe', 'lock', 'save'] },
        { name: 'Shuffle.com', match: /(^|\.)shuffle\.com$/i,       vaultHints: ['vault', 'safe', 'lock', 'save'] },
        { name: 'Gamba',       match: /(^|\.)gamba\.com$/i,         vaultHints: ['vault', 'lock', 'safe'] },
        { name: 'Gamba',       match: /(^|\.)gambacasino\.com$/i,   vaultHints: ['vault', 'lock', 'safe'] },
        { name: 'Goated',      match: /(^|\.)goated\.com$/i,        vaultHints: ['vault', 'safe', 'lock'] },
        { name: 'BC.Game',     match: /(^|\.)(bc\.game|bcgame\.com)$/i, vaultHints: ['vault', 'safe', 'lock'] },
        { name: 'Roobet',      match: /(^|\.)roobet\.com$/i,        vaultHints: ['vault', 'safe', 'lock'] },
        { name: 'Rollbit',     match: /(^|\.)rollbit\.com$/i,       vaultHints: ['vault', 'lockup', 'lock'] },
        { name: 'Gamdom',      match: /(^|\.)gamdom\.com$/i,        vaultHints: ['vault', 'safe', 'lock'] }
    ];

    // SITE_MODE drives every downstream branch (which adapter, which UI label,
    // which monitoring strategy). Computed once at script load.
    function detectSiteMode() {
        if (STAKE_API_HOSTS.some((re) => re.test(hostname))) {
            return { mode: 'stake-api', name: isStakeUS ? 'Stake.us' : 'Stake.com', hints: null };
        }
        const generic = GENERIC_DOM_HOSTS.find((g) => g.match.test(hostname));
        if (generic) {
            return { mode: 'generic-dom', name: generic.name, hints: generic.vaultHints };
        }
        // Should not happen given the @match list, but be defensive.
        return { mode: 'unsupported', name: hostname, hints: null };
    }
    const SITE = detectSiteMode();

    // --- Activity Log ---
    const activityLog = [];
    const MAX_LOG_ENTRIES = 50;
    let onLogUpdate = null;

    function logActivity(message, type) {
        const entry = {
            time: new Date(),
            message,
            type: type || 'info'
        };
        activityLog.unshift(entry);
        if (activityLog.length > MAX_LOG_ENTRIES) activityLog.pop();
        // Console prefix uses the brand so it is easy to filter in DevTools.
        console.log(`[${BRAND.name} ${BRAND.product}]`, message);
        if (onLogUpdate) onLogUpdate(entry);
    }
    const log = (msg, type) => logActivity(msg, type || 'info');

    // --- Flavor text in TiltCheck voice ---
    const FLAVOR = {
        profit: [
            'Heater detected. Skimming the top.',
            'Bag is moving up. Locking some in.',
            'Profit hit. The math is mathing — for now.'
        ],
        bigWin: [
            'Big win. We do not give it back.',
            'Heater confirmed. Securing the bag.',
            'You actually cooked. Vaulting before you talk yourself out of it.'
        ],
        deposit: [
            'Deposit detected. Skimming the top so it is not all on the table.'
        ],
        start: [
            'AutoVault locked in. Watching the bag.',
            'Monitoring active. Winning is easy. Keeping it is legendary.'
        ],
        stop: [
            'AutoVault paused. Your call now.',
            'Stopped watching. The math waits for no one.'
        ],
        rateLimit: [
            'Hit the cap. Stake says breathe. Will retry shortly.',
            'Rate limited by Stake. Mandatory chill — vault resumes soon.'
        ]
    };
    const pickFlavor = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // --- Cookie helper ---
    const getCookie = (name) => {
        const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
        return m ? m.pop().replace(/"/g, '') : '';
    };

    // --- Balance selectors (Stake DOM, with fallbacks for layout shifts) ---
    const BALANCE_SELECTORS = [
        '[data-testid="coin-toggle"] .content span[data-ds-text="true"]',
        '[data-testid="balance-toggle"] .content span[data-ds-text="true"]',
        '[data-testid="coin-toggle"] .content span',
        '[data-testid="balance-toggle"] span.content span',
        '[data-testid="user-balance"] .numeric',
        '.numeric.variant-highlighted',
        '[data-testid="user-balance"]',
        '.balance-value'
    ];

    // --- Cloudflare challenge backoff ---
    // When CF mitigates the session, every API call returns an HTML challenge
    // page instead of JSON. Hammering during a challenge makes CF *more*
    // suspicious. We back off for a window after detecting one.
    let cloudflareLockoutUntil = 0;
    const CLOUDFLARE_BACKOFF_MS = 60 * 1000; // 1 minute

    function isCloudflareLocked() {
        return Date.now() < cloudflareLockoutUntil;
    }
    function lockoutForCloudflare(reason) {
        cloudflareLockoutUntil = Date.now() + CLOUDFLARE_BACKOFF_MS;
        log(`Cloudflare is challenging this session (${reason}). Backing off 60s. Browse Stake normally for a moment to clear the challenge.`, 'warning');
    }

    // --- Stake API (uses the user's own session cookie — non-custodial pass-through) ---
    class StakeApi {
        constructor() {
            this.apiUrl = window.location.origin + '/_api/graphql';
            this._accessToken = getCookie('session');
            this.headers = {
                'content-type': 'application/json',
                'x-access-token': this._accessToken,
                'x-language': 'en',
                // These headers make the request look like Stake's own Apollo client.
                // Cloudflare's bot management correlates header sets — missing the
                // Apollo identity headers is a yellow flag.
                'apollographql-client-name': 'stake.com',
                'apollographql-client-version': '1.0.0'
            };
        }
        async call(body, opName) {
            // Skip the round-trip entirely if CF is mid-challenge. Hammering
            // during a challenge is what gets sessions soft-banned.
            if (isCloudflareLocked()) {
                const waitMs = Math.max(0, cloudflareLockoutUntil - Date.now());
                return { error: true, type: 'cloudflare-lockout', message: `Cloudflare backoff: ${Math.ceil(waitMs / 1000)}s left` };
            }

            const headers = { ...this.headers };
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

                // Cloudflare challenge detection — fires before we try to parse.
                // Signals: response is HTML (not JSON), CF headers present, or 403/503
                // with a content-type of text/html. Any of these = mitigation in flight.
                const cfMitigated = res.headers.get('cf-mitigated');
                const cfRay = res.headers.get('cf-ray');
                const contentType = res.headers.get('content-type') || '';
                const looksLikeChallenge =
                    cfMitigated === 'challenge' ||
                    (contentType.includes('text/html') && (res.status === 403 || res.status === 503)) ||
                    (cfRay && contentType.includes('text/html') && !res.ok);

                if (looksLikeChallenge) {
                    lockoutForCloudflare(`HTTP ${res.status}, cf-mitigated=${cfMitigated || 'n/a'}`);
                    console.warn('[TiltCheck AutoVault] Cloudflare challenge detected:', {
                        url: this.apiUrl,
                        operation: opName,
                        status: res.status,
                        cfMitigated,
                        cfRay,
                        contentType,
                        hint: 'Browse stake.com normally for ~30s to clear the challenge, then retry.'
                    });
                    return { error: true, type: 'cloudflare', status: res.status, message: 'Cloudflare challenge in flight' };
                }

                // GraphQL servers — Stake included — return JSON error bodies on 4xx/5xx.
                const rawBody = await res.text();
                let parsed = null;
                try { parsed = rawBody ? JSON.parse(rawBody) : null; } catch (e) { /* not JSON */ }

                if (!res.ok) {
                    // Belt-and-suspenders: if body is HTML and headers slipped past the
                    // CF check above (e.g. CF without explicit cf-mitigated header), still
                    // treat it as a challenge.
                    if (rawBody && rawBody.trimStart().toLowerCase().startsWith('<!doctype')) {
                        lockoutForCloudflare(`HTTP ${res.status}, HTML body`);
                        return { error: true, type: 'cloudflare', status: res.status, message: 'Cloudflare challenge in flight' };
                    }

                    let detail = res.statusText || 'unknown';
                    if (parsed?.errors?.[0]?.message) detail = parsed.errors[0].message;
                    else if (parsed?.message) detail = parsed.message;
                    else if (parsed?.error) detail = parsed.error;
                    else if (rawBody && rawBody.length < 300) detail = rawBody;

                    log(`Stake API responded ${res.status}: ${detail}`, 'error');
                    console.warn('[TiltCheck AutoVault] HTTP error payload:', {
                        url: this.apiUrl,
                        operation: opName,
                        status: res.status,
                        statusText: res.statusText,
                        responseBody: parsed || rawBody,
                        requestBody: (() => { try { return JSON.parse(body); } catch { return body; } })()
                    });
                    return {
                        error: true,
                        status: res.status,
                        message: detail,
                        body: parsed || rawBody,
                        errors: Array.isArray(parsed?.errors) ? parsed.errors : undefined
                    };
                }
                return parsed || {};
            } catch (e) {
                // "Failed to fetch" with no response usually means CF terminated the
                // connection mid-flight — also treat as challenge backoff.
                if (e?.message && /failed to fetch|network/i.test(e.message)) {
                    lockoutForCloudflare('fetch terminated');
                    return { error: true, type: 'cloudflare', message: 'Connection terminated — likely Cloudflare challenge' };
                }
                log('Network error talking to Stake: ' + (e.message || 'unknown'), 'error');
                return { error: true, message: e.message, type: 'network' };
            }
        }
        async getBalances() {
            const q = {
                query: `query UserBalances {
                    user { id balances {
                        available { amount currency }
                        vault { amount currency }
                    }}}`,
                variables: {}
            };
            return this.call(JSON.stringify(q), 'UserBalances');
        }
        async depositToVault(currency, amount) {
            // Stake's CurrencyEnum is LOWERCASE. Confirmed from API error response:
            //   "Did you mean the enum value 'usd', 'sol', 'bnb', 'btc', or 'eth'?"
            // Earlier versions of this script tried .toUpperCase() — that was wrong.
            const enumCurrency = String(currency || '').toLowerCase();
            // Stake rejects float garbage like 0.00001000000000000001 — round to
            // 8 decimal places (the precision Stake itself uses for crypto and SC).
            const roundedAmount = Math.floor(Number(amount) * 1e8) / 1e8;
            const q = {
                query: `mutation CreateVaultDeposit($currency: CurrencyEnum!, $amount: Float!) {
                    createVaultDeposit(currency: $currency, amount: $amount) {
                        id amount currency user {
                            id balances {
                                available { amount currency }
                                vault { amount currency }
                            }
                        }
                        __typename
                    }
                }`,
                variables: { currency: enumCurrency, amount: roundedAmount }
            };
            return this.call(JSON.stringify(q), 'CreateVaultDeposit');
        }
    }

    // --- Generic DOM Adapter (nudge mode for non-Stake casinos) ---
    // Strategy:
    //   1. Detect a win by polling the visible balance number for upward jumps.
    //   2. When a heater hits, find a "Vault" / "Safe" / "Lock" button in the
    //      casino's own UI by text matching the per-site hints.
    //   3. Click that button to OPEN the vault dialog. We do NOT auto-fill or
    //      auto-submit. Brand law 6 (non-custodial) and basic safety: clicking
    //      the wrong "Confirm" button on an untested casino UI would be bad.
    //   4. Surface a notification telling the user what to vault.
    //
    // This is intentionally less ambitious than the Stake API path. It is a
    // smart-friend nudge, not full automation. When a casino's vault flow has
    // been hand-tested, we can graduate it to a full adapter.
    class GenericDOMAdapter {
        constructor(siteName, vaultHints) {
            this.siteName = siteName;
            this.vaultHints = vaultHints || ['vault', 'safe', 'lock'];
        }

        // Find a button whose text best matches a vault hint. Scoring beats
        // raw "first match" because casinos often have multiple buttons whose
        // text contains "lock" (e.g. "Lock account", "Lock account 2FA"). We
        // want the most specific vault-flow trigger.
        findVaultButton() {
            const candidates = Array.from(
                document.querySelectorAll('button, [role="button"], a[href*="vault" i], a[href*="safe" i]')
            );

            let best = null;
            let bestScore = 0;

            for (const el of candidates) {
                if (!(el instanceof HTMLElement)) continue;
                if (el.offsetParent === null) continue; // not visible
                const text = (el.textContent || '').trim().toLowerCase();
                if (!text || text.length > 40) continue; // skip long descriptive blocks

                let score = 0;
                for (const hint of this.vaultHints) {
                    const h = hint.toLowerCase();
                    if (text === h) score += 100;            // exact match wins
                    else if (text.startsWith(h)) score += 50; // "vault" in "vault deposit"
                    else if (text.includes(' ' + h)) score += 20; // "to vault"
                    else if (text.includes(h)) score += 10;  // contains anywhere
                }

                // Penalize obviously wrong buttons.
                if (/account|2fa|unlock|withdraw|password|wallet.{0,10}lock/i.test(text)) {
                    score -= 30;
                }

                if (score > bestScore) {
                    best = el;
                    bestScore = score;
                }
            }

            return bestScore > 0 ? best : null;
        }

        // Try to open the vault dialog. Returns the button we clicked (so the
        // caller can log it) or null if nothing matched.
        openVaultDialog() {
            const btn = this.findVaultButton();
            if (!btn) return null;
            try {
                btn.click();
                return btn;
            } catch (e) {
                return null;
            }
        }

        // Best-effort balance read from the casino's own UI. Cannot tell crypto
        // units from fiat display, so callers should use this only for trend
        // detection ("balance went up") not for absolute amount math.
        getBalanceFromDOM() {
            const balanceSelectors = [
                '[data-testid*="balance" i]',
                '[class*="balance" i] [class*="amount" i]',
                '[class*="balance" i] [class*="value" i]',
                'header [class*="amount" i]',
                'nav [class*="amount" i]'
            ];
            for (const sel of balanceSelectors) {
                try {
                    const els = document.querySelectorAll(sel);
                    for (const el of els) {
                        const v = parseStakeAmount(el.textContent);
                        if (!isNaN(v) && v > 0) return v;
                    }
                } catch (e) { /* try next */ }
            }
            return null;
        }
    }

    // --- Vault Display (session vaulted counter) ---
    class VaultDisplay {
        constructor() {
            this._el = document.createElement('span');
            this._el.id = 'tcVaultDisplayElement';
            this._vaulted = 0;
            this._currency = getCurrency();
            this._load();
            this.render();
        }
        _storageKey() {
            const c = (this._currency || getCurrency() || '').toLowerCase();
            return `${STORAGE_PREFIX}-vaulted-session:${c}`;
        }
        _load() {
            try {
                const raw = sessionStorage.getItem(this._storageKey());
                const v = parseFloat(raw);
                if (!isNaN(v) && v >= 0) this._vaulted = v;
            } catch (e) { /* ignore */ }
        }
        _save() {
            try {
                sessionStorage.setItem(this._storageKey(), String(this._vaulted));
            } catch (e) { /* ignore */ }
        }
        setCurrency(currency) {
            this._currency = (currency || getCurrency() || '').toLowerCase();
            this._load();
            this.render();
        }
        render() {
            if (!this._el) return;
            this._el.innerText = (this._vaulted || 0).toFixed(8);
        }
        update(amount) {
            const add = +amount;
            if (isNaN(add) || add <= 0) return;
            this._vaulted = (this._vaulted || 0) + add;
            this._save();
            this.render();
        }
        reset() {
            this._vaulted = 0;
            this._save();
            this.render();
        }
    }

    // --- Amount parsing (handles Stake's locale variations) ---
    function parseStakeAmount(text) {
        if (!text) return NaN;
        const raw = String(text).replace(/\u00a0/g, ' ').trim();
        if (!raw) return NaN;
        if (/[•*]+/.test(raw)) return NaN;

        const m = raw.match(/[-+]?\d[\d\s,.'’]*(?:[.,]\d+)?[kmbt]?/i);
        if (!m) return NaN;

        let token = m[0].trim();
        const suffixMatch = token.match(/[kmbt]$/i);
        const suffix = suffixMatch ? suffixMatch[0].toLowerCase() : '';
        token = token.replace(/[kmbt]$/i, '').trim();
        token = token.replace(/[\s'’]/g, '');

        const hasDot = token.includes('.');
        const hasComma = token.includes(',');
        if (hasDot && hasComma) {
            if (token.lastIndexOf('.') > token.lastIndexOf(',')) {
                token = token.replace(/,/g, '');
            } else {
                token = token.replace(/\./g, '').replace(/,/g, '.');
            }
        } else if (hasComma && !hasDot) {
            const parts = token.split(',');
            if (parts.length === 2 && parts[1].length <= 2) token = `${parts[0]}.${parts[1]}`;
            else token = token.replace(/,/g, '');
        } else {
            token = token.replace(/,/g, '');
        }

        const n = parseFloat(token);
        if (isNaN(n)) return NaN;

        const mult =
            suffix === 'k' ? 1e3 :
            suffix === 'm' ? 1e6 :
            suffix === 'b' ? 1e9 :
            suffix === 't' ? 1e12 :
            1;

        return n * mult;
    }

    // Display-only fiat tokens that should NEVER be treated as the active vault
    // currency. If the balance bar reads "$16.50 USD" we want to ignore the
    // "USD" — the user's actual underlying currency is something like SOL/BTC.
    const FIAT_DISPLAY_TOKENS = new Set([
        'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'KRW', 'BRL', 'INR', 'MXN', 'NZD'
    ]);

    function detectCurrencyFromBalanceBar() {
        const el =
            document.querySelector('[data-testid="coin-toggle"]') ||
            document.querySelector('[data-testid="balance-toggle"]');
        if (!el) return null;
        const txt = (el.textContent || '').trim();
        // Match all 2-5 uppercase tokens, then pick the first one that is NOT
        // a display-only fiat code. (Stake's vault doesn't deal in USD/EUR/etc.)
        const matches = txt.match(/\b[A-Z]{2,5}\b/g);
        if (!matches) return null;
        for (const code of matches) {
            if (!FIAT_DISPLAY_TOKENS.has(code)) return code.toLowerCase();
        }
        return null;
    }

    function getCurrency() {
        const now = Date.now();
        if (getCurrency.cached && getCurrency.cacheTime && (now - getCurrency.cacheTime < CURRENCY_CACHE_TIMEOUT)) {
            return getCurrency.cached;
        }
        // Belt-and-suspenders: never return a fiat display token from any
        // detection path. Vault currencies on Stake are crypto/sweeps tickers,
        // never USD/EUR/etc. (Those are display-layer conversions only.)
        const isFiatToken = (code) =>
            !!code && FIAT_DISPLAY_TOKENS.has(String(code).toUpperCase());

        const el = document.querySelector('[data-active-currency]');
        if (el) {
            const c = el.getAttribute('data-active-currency');
            if (c && !isFiatToken(c)) {
                getCurrency.cached = c.toLowerCase();
                getCurrency.cacheTime = now;
                return getCurrency.cached;
            }
        }
        const fromBar = detectCurrencyFromBalanceBar();
        if (fromBar && !isFiatToken(fromBar)) {
            getCurrency.cached = fromBar;
            getCurrency.cacheTime = now;
            return getCurrency.cached;
        }
        // Last resort: if we have an API balance snapshot, pick whichever
        // currency has the largest available amount. That is far more likely to
        // be what the user is actually playing than the hardcoded default.
        const apiBalances = getCurrentBalance._api || {};
        const apiKeys = Object.keys(apiBalances);
        if (apiKeys.length) {
            apiKeys.sort((a, b) => (apiBalances[b] || 0) - (apiBalances[a] || 0));
            const top = apiKeys[0];
            if (top && !isFiatToken(top) && apiBalances[top] > 0) {
                getCurrency.cached = top;
                getCurrency.cacheTime = now;
                return getCurrency.cached;
            }
        }
        const defaultCurr = isStakeUS ? DEFAULT_US_CURRENCY : DEFAULT_CURRENCY;
        getCurrency.cached = defaultCurr;
        getCurrency.cacheTime = now;
        return defaultCurr;
    }

    // --- Detect Stake's "Display in fiat" toggle ---
    // When ON, the balance pill shows "$16.50" instead of "0.10234 SOL".
    // Reading that DOM number and treating it as native currency units would
    // make every vault attempt 100x+ too large. We refuse the DOM read in
    // that state and rely on the API balance instead.
    function isFiatDisplayActive() {
        const el =
            document.querySelector('[data-testid="coin-toggle"]') ||
            document.querySelector('[data-testid="balance-toggle"]');
        if (!el) return false;
        const txt = (el.textContent || '').trim();
        // Currency symbols of any major fiat OR explicit USD/EUR/GBP tokens.
        return /[$€£¥₽₩₹]/.test(txt) || /\b(USD|EUR|GBP|CAD|AUD)\b/i.test(txt);
    }

    // --- Read current balance ---
    // PRIMARY: GraphQL `getBalances` cache (always native currency units).
    // FALLBACK: DOM scrape, but only if fiat display toggle is OFF (otherwise
    //   the DOM is showing dollars and the unit math would be off by orders
    //   of magnitude).
    function getCurrentBalance() {
        const curCode = (activeCurrency || getCurrency() || '').toLowerCase();

        // Always prefer the API value when we have one for the active currency.
        // The API speaks native units (SOL, BTC, SC, etc.) regardless of how the
        // user has configured the UI to display them.
        if (curCode) {
            const apiVal = getCurrentBalance._api?.[curCode];
            if (typeof apiVal === 'number' && apiVal >= 0) {
                getCurrentBalance.lastKnownBalance = apiVal;
                return apiVal;
            }
        }

        // No API value yet (first poll hasn't landed) — DOM fallback, but
        // only if we can be confident the DOM shows native units.
        if (isFiatDisplayActive()) {
            if (!getCurrentBalance._fiatWarned) {
                getCurrentBalance._fiatWarned = true;
                log('Stake is showing balances in fiat (USD). DOM reads disabled to prevent unit-mismatch vaulting. Waiting for API balance to land — or disable "Display in fiat" in account settings for faster bootstrap.', 'warning');
            }
            return getCurrentBalance.lastKnownBalance || 0;
        }

        for (const selector of BALANCE_SELECTORS) {
            try {
                const el = document.querySelector(selector);
                if (el) {
                    const val = parseStakeAmount(el.textContent);
                    if (!isNaN(val) && val >= 0) {
                        if (getCurrentBalance._workingSelector !== selector) {
                            getCurrentBalance._workingSelector = selector;
                            log(`Balance selector locked in: ${selector}`, 'info');
                        }
                        getCurrentBalance.lastKnownBalance = val;
                        return val;
                    }
                }
            } catch (e) { /* try the next selector */ }
        }

        if (!getCurrentBalance._warned) {
            getCurrentBalance._warned = true;
            log('Could not read balance from API or DOM yet. Will keep trying.', 'warning');
        }
        return getCurrentBalance.lastKnownBalance || 0;
    }

    // --- Rate limit tracking (sessionStorage so it survives reloads) ---
    function loadRateLimitData() {
        const saved = sessionStorage.getItem(`${STORAGE_PREFIX}-ratelimit`);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                return data.filter(ts => Date.now() - ts < RATE_LIMIT_WINDOW);
            } catch (e) {
                log('Rate limit history is cooked. Resetting.', 'warning');
            }
        }
        return [];
    }

    function saveRateLimitData(timestamps) {
        try {
            sessionStorage.setItem(`${STORAGE_PREFIX}-ratelimit`, JSON.stringify(timestamps));
        } catch (e) { /* ignore */ }
    }

    let vaultActionTimestamps = loadRateLimitData();

    function canVaultNow() {
        const now = Date.now();
        vaultActionTimestamps = vaultActionTimestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
        saveRateLimitData(vaultActionTimestamps);
        return vaultActionTimestamps.length < RATE_LIMIT_MAX;
    }

    function getVaultCountLastHour() {
        const now = Date.now();
        vaultActionTimestamps = vaultActionTimestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
        return vaultActionTimestamps.length;
    }

    // --- Floaty Widget UI (TiltCheck dark palette) ---
    let currentViewMode = 'full';

    function createVaultFloatyUI(startCallback, stopCallback, getParams, setParams, vaultDisplay) {
        const existing = document.getElementById('tc-autovault-floaty');
        if (existing) existing.remove();
        const existingStealth = document.getElementById('tc-autovault-stealth');
        if (existingStealth) existingStealth.remove();

        const style = document.createElement('style');
        style.id = 'tc-autovault-styles';
        style.textContent = `
        #tc-autovault-floaty {
            background: ${BRAND.bgCard};
            color: ${BRAND.textSecondary};
            border: 1px solid rgba(23,195,178,0.4);
            border-radius: 0;
            box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(23,195,178,0.08);
            font-family: ${BRAND.fontSans};
            font-size: 13px;
            width: 280px;
            height: auto;
            min-width: 240px;
            min-height: 280px;
            max-width: min(680px, 95vw);
            max-height: min(720px, 90vh);
            user-select: none;
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 999999;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            resize: both;
            transition: opacity 0.2s, transform 0.2s;
        }
        /* Tint the native resize handle so it reads as a brand affordance, not
           a default OS chrome bit. */
        #tc-autovault-floaty::-webkit-resizer {
            background: linear-gradient(
                135deg,
                transparent 0%,
                transparent 45%,
                ${BRAND.teal} 45%,
                ${BRAND.teal} 55%,
                transparent 55%,
                transparent 100%
            );
        }
        #tc-autovault-floaty.hidden { display: none; }
        #tc-autovault-floaty .tc-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: ${BRAND.bgElevated};
            padding: 10px 12px;
            border-bottom: 1px solid ${BRAND.borderSubtle};
            cursor: grab;
        }
        #tc-autovault-floaty .tc-header:active { cursor: grabbing; }
        #tc-autovault-floaty .tc-title {
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: ${BRAND.fontMono};
            font-weight: 700;
            font-size: 11px;
            color: ${BRAND.textPrimary};
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }
        #tc-autovault-floaty .tc-status-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: ${BRAND.textDisabled};
            box-shadow: 0 0 0 0 transparent;
            transition: background 0.2s, box-shadow 0.2s;
        }
        #tc-autovault-floaty .tc-status-dot.running {
            background: ${BRAND.teal};
            box-shadow: 0 0 8px ${BRAND.tealGlow};
        }
        #tc-autovault-floaty .tc-brand-mark {
            color: ${BRAND.teal};
        }
        #tc-autovault-floaty .tc-mode-chip {
            font-family: ${BRAND.fontMono};
            font-size: 8px;
            font-weight: 700;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            padding: 2px 6px;
            border: 1px solid ${BRAND.borderDefault};
            color: ${BRAND.textMuted};
            white-space: nowrap;
            margin-left: 4px;
        }
        #tc-autovault-floaty .tc-mode-chip.api {
            color: ${BRAND.teal};
            border-color: ${BRAND.teal};
        }
        #tc-autovault-floaty .tc-mode-chip.dom {
            color: ${BRAND.gold};
            border-color: ${BRAND.gold};
        }
        #tc-autovault-floaty .tc-header-btns { display: flex; gap: 2px; }
        #tc-autovault-floaty .tc-header-btn {
            background: none;
            border: none;
            color: ${BRAND.textMuted};
            cursor: pointer;
            padding: 4px 6px;
            border-radius: 0;
            font-size: 14px;
            line-height: 1;
            transition: color 0.15s, background 0.15s;
        }
        #tc-autovault-floaty .tc-header-btn:hover {
            color: ${BRAND.textPrimary};
            background: ${BRAND.borderDefault};
        }
        #tc-autovault-floaty .tc-content {
            padding: 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        #tc-autovault-floaty .tc-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        #tc-autovault-floaty .tc-label {
            color: ${BRAND.textMuted};
            font-size: 12px;
        }
        #tc-autovault-floaty input[type="number"] {
            background: ${BRAND.bgInput};
            color: ${BRAND.textPrimary};
            border: 1px solid ${BRAND.borderDefault};
            border-radius: 0;
            padding: 5px 7px;
            font-size: 12px;
            font-family: ${BRAND.fontMono};
            width: 64px;
            text-align: right;
            transition: border-color 0.15s;
        }
        #tc-autovault-floaty input[type="number"]:focus {
            outline: none;
            border-color: ${BRAND.teal};
            box-shadow: 0 0 0 1px ${BRAND.tealGlow};
        }
        #tc-autovault-floaty .tc-btn-row {
            display: flex;
            gap: 6px;
            margin-top: 4px;
        }
        #tc-autovault-floaty .tc-btn {
            flex: 1;
            background: ${BRAND.bgElevated};
            color: ${BRAND.textSecondary};
            border: 1px solid ${BRAND.borderDefault};
            border-radius: 0;
            padding: 8px 10px;
            font-size: 11px;
            font-family: ${BRAND.fontMono};
            font-weight: 700;
            cursor: pointer;
            transition: all 0.15s;
            text-transform: uppercase;
            letter-spacing: 0.12em;
        }
        #tc-autovault-floaty .tc-btn:hover:not(:disabled) {
            background: ${BRAND.borderDefault};
            color: ${BRAND.textPrimary};
        }
        #tc-autovault-floaty .tc-btn:disabled {
            opacity: 0.35;
            cursor: not-allowed;
        }
        #tc-autovault-floaty .tc-btn.primary {
            background: transparent;
            border-color: ${BRAND.teal};
            color: ${BRAND.teal};
        }
        #tc-autovault-floaty .tc-btn.primary:hover:not(:disabled) {
            background: rgba(23,195,178,0.1);
            box-shadow: 0 0 12px ${BRAND.tealGlow};
        }
        #tc-autovault-floaty .tc-btn.danger {
            background: transparent;
            border-color: ${BRAND.danger};
            color: ${BRAND.danger};
        }
        #tc-autovault-floaty .tc-btn.danger:hover:not(:disabled) {
            background: rgba(239,68,68,0.1);
        }
        #tc-autovault-floaty .tc-stats {
            display: flex;
            justify-content: space-between;
            padding-top: 10px;
            border-top: 1px solid ${BRAND.borderSubtle};
            font-size: 11px;
        }
        #tc-autovault-floaty .tc-stat {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }
        #tc-autovault-floaty .tc-stat-label {
            color: ${BRAND.textMuted};
            font-family: ${BRAND.fontMono};
            font-size: 9px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }
        #tc-autovault-floaty .tc-stat-value {
            color: ${BRAND.teal};
            font-family: ${BRAND.fontMono};
            font-weight: 700;
        }
        #tc-autovault-floaty .tc-stat-value.gold { color: ${BRAND.gold}; }
        #tc-autovault-floaty .tc-footer {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            padding: 8px;
            border-top: 1px solid ${BRAND.borderSubtle};
        }
        #tc-autovault-floaty .tc-link {
            color: ${BRAND.textMuted};
            font-size: 10px;
            font-family: ${BRAND.fontMono};
            text-decoration: none;
            letter-spacing: 0.08em;
            transition: color 0.15s;
        }
        #tc-autovault-floaty .tc-link:hover { color: ${BRAND.teal}; }
        #tc-autovault-floaty .tc-tagline {
            color: ${BRAND.textDisabled};
            font-size: 9px;
            font-family: ${BRAND.fontMono};
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }
        #tc-autovault-floaty .tc-log-toggle {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 14px;
            background: ${BRAND.bgElevated};
            border-top: 1px solid ${BRAND.borderSubtle};
            cursor: pointer;
            transition: background 0.15s;
        }
        #tc-autovault-floaty .tc-log-toggle:hover { background: ${BRAND.borderDefault}; }
        #tc-autovault-floaty .tc-log-toggle-text {
            font-size: 10px;
            font-family: ${BRAND.fontMono};
            color: ${BRAND.textMuted};
            text-transform: uppercase;
            letter-spacing: 0.12em;
        }
        #tc-autovault-floaty .tc-log-toggle-icon {
            font-size: 10px;
            color: ${BRAND.textMuted};
            transition: transform 0.2s;
        }
        #tc-autovault-floaty .tc-log-toggle.open .tc-log-toggle-icon {
            transform: rotate(180deg);
        }
        #tc-autovault-floaty .tc-log {
            flex: 0 0 0;
            min-height: 0;
            overflow: hidden;
            transition: flex-basis 0.25s ease-out;
            background: ${BRAND.bgPage};
            display: flex;
            flex-direction: column;
        }
        /* When open: take the rest of the available widget height so the log
           grows when the user resizes the widget taller. flex: 1 instead of a
           fixed max-height. */
        #tc-autovault-floaty .tc-log.open {
            flex: 1 1 auto;
            min-height: 100px;
        }
        #tc-autovault-floaty .tc-log-inner {
            padding: 8px;
            flex: 1 1 auto;
            overflow-y: auto;
            font-family: ${BRAND.fontMono};
            font-size: 10px;
            line-height: 1.45;
            min-height: 0;
        }
        #tc-autovault-floaty .tc-log-inner::-webkit-scrollbar { width: 4px; }
        #tc-autovault-floaty .tc-log-inner::-webkit-scrollbar-track { background: ${BRAND.bgPage}; }
        #tc-autovault-floaty .tc-log-inner::-webkit-scrollbar-thumb {
            background: ${BRAND.borderDefault};
            border-radius: 0;
        }
        #tc-autovault-floaty .tc-log-entry {
            padding: 2px 0;
            color: ${BRAND.textMuted};
            display: flex;
            gap: 6px;
        }
        #tc-autovault-floaty .tc-log-entry.success { color: ${BRAND.teal}; }
        #tc-autovault-floaty .tc-log-entry.profit { color: ${BRAND.teal}; }
        #tc-autovault-floaty .tc-log-entry.bigwin { color: ${BRAND.gold}; }
        #tc-autovault-floaty .tc-log-entry.warning { color: ${BRAND.gold}; opacity: 0.85; }
        #tc-autovault-floaty .tc-log-entry.error { color: ${BRAND.danger}; }
        #tc-autovault-floaty .tc-log-time {
            color: ${BRAND.textDisabled};
            flex-shrink: 0;
        }
        #tc-autovault-floaty .tc-log-empty {
            color: ${BRAND.textDisabled};
            font-style: italic;
            text-align: center;
            padding: 8px;
            font-family: ${BRAND.fontSans};
        }
        #tc-autovault-floaty.mini {
            min-width: auto;
            max-width: none;
            min-height: 0;
            max-height: none;
            width: auto;
            height: auto;
            resize: none;
        }
        #tc-autovault-floaty.mini .tc-header { padding: 6px 12px; border-bottom: none; }
        #tc-autovault-floaty.mini .tc-content,
        #tc-autovault-floaty.mini .tc-log-toggle,
        #tc-autovault-floaty.mini .tc-log,
        #tc-autovault-floaty.mini .tc-footer { display: none; }
        #tc-autovault-floaty.mini .tc-title span:not(.tc-brand-mark) { display: none; }
        #tc-autovault-stealth {
            position: fixed;
            bottom: 12px;
            right: 12px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: ${BRAND.textDisabled};
            cursor: pointer;
            z-index: 999999;
            transition: transform 0.15s, background 0.15s, box-shadow 0.15s;
            box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        }
        #tc-autovault-stealth:hover { transform: scale(1.5); }
        #tc-autovault-stealth.running {
            background: ${BRAND.teal};
            box-shadow: 0 0 8px ${BRAND.tealGlow};
        }
        #tc-autovault-stealth.hidden { display: none; }
        @media (max-width: 500px) {
            #tc-autovault-floaty {
                right: 10px !important;
                left: 10px !important;
                max-width: none;
                min-width: auto;
            }
        }
        `;
        document.head.appendChild(style);

        const widget = document.createElement('div');
        widget.id = 'tc-autovault-floaty';

        const stealthDot = document.createElement('div');
        stealthDot.id = 'tc-autovault-stealth';
        stealthDot.className = 'hidden';
        stealthDot.title = `${BRAND.name} ${BRAND.product} (click to expand)`;
        document.body.appendChild(stealthDot);

        const modeChipClass = SITE.mode === 'stake-api' ? 'api' : SITE.mode === 'generic-dom' ? 'dom' : '';
        const modeChipLabel = SITE.mode === 'stake-api'
            ? 'API'
            : SITE.mode === 'generic-dom'
                ? 'DOM · Nudge'
                : 'Off';
        const modeChipTitle = SITE.mode === 'stake-api'
            ? `${SITE.name} via GraphQL — full automation`
            : SITE.mode === 'generic-dom'
                ? `${SITE.name} — DOM nudge mode. Opens vault dialog; you confirm.`
                : `${SITE.name} not supported`;
        const header = document.createElement('div');
        header.className = 'tc-header';
        header.innerHTML = `
            <div class="tc-title">
                <div class="tc-status-dot" id="tcStatusDot"></div>
                <span class="tc-brand-mark">TC</span><span>·&nbsp;AutoVault</span>
                <span class="tc-mode-chip ${modeChipClass}" title="${modeChipTitle}">${modeChipLabel}</span>
            </div>
            <div class="tc-header-btns">
                <button class="tc-header-btn" id="tcMinBtn" title="Minimize">−</button>
                <button class="tc-header-btn" id="tcStealthBtn" title="Stealth Mode">○</button>
                <button class="tc-header-btn" id="tcCloseBtn" title="Close">×</button>
            </div>
        `;
        widget.appendChild(header);

        const content = document.createElement('div');
        content.className = 'tc-content';
        content.innerHTML = `
            <div class="tc-row">
                <span class="tc-label">Skim % of profit</span>
                <input type="number" id="tcSaveAmount" min="0" max="1" step="0.01" value="${getParams().saveAmount}">
            </div>
            <div class="tc-row">
                <span class="tc-label">Heater threshold (x)</span>
                <input type="number" id="tcBigWinThreshold" min="1" step="0.1" value="${getParams().bigWinThreshold}">
            </div>
            <div class="tc-row">
                <span class="tc-label">Heater multiplier</span>
                <input type="number" id="tcBigWinMultiplier" min="1" step="0.1" value="${getParams().bigWinMultiplier}">
            </div>
            <div class="tc-row">
                <span class="tc-label">Check interval (sec)</span>
                <input type="number" id="tcCheckInterval" min="10" step="1" value="${getParams().checkInterval}">
            </div>
            <div class="tc-btn-row">
                <button class="tc-btn primary" id="tcStartBtn">Start</button>
                <button class="tc-btn danger" id="tcStopBtn" disabled>Stop</button>
            </div>
            <div class="tc-stats">
                <div class="tc-stat">
                    <span class="tc-stat-label">Vaulted (session)</span>
                    <span class="tc-stat-value gold" id="tcVaultBal">0.00</span>
                </div>
                <div class="tc-stat">
                    <span class="tc-stat-label">Vaults / hr</span>
                    <span class="tc-stat-value" id="tcVaultCount">0/${RATE_LIMIT_MAX}</span>
                </div>
            </div>
        `;
        widget.appendChild(content);

        const logToggle = document.createElement('div');
        logToggle.className = 'tc-log-toggle';
        logToggle.innerHTML = `
            <span class="tc-log-toggle-text">Activity Log</span>
            <span class="tc-log-toggle-icon">▼</span>
        `;
        widget.appendChild(logToggle);

        const logPanel = document.createElement('div');
        logPanel.className = 'tc-log';
        logPanel.innerHTML = `<div class="tc-log-inner" id="tcLogInner"><div class="tc-log-empty">Nothing here yet — your activity will fill in once a hand is played.</div></div>`;
        widget.appendChild(logPanel);

        const logInner = logPanel.querySelector('#tcLogInner');
        logToggle.onclick = () => {
            logToggle.classList.toggle('open');
            logPanel.classList.toggle('open');
        };

        const formatTime = (date) => {
            const h = date.getHours().toString().padStart(2, '0');
            const m = date.getMinutes().toString().padStart(2, '0');
            const s = date.getSeconds().toString().padStart(2, '0');
            return `${h}:${m}:${s}`;
        };

        function addLogEntry(entry) {
            const empty = logInner.querySelector('.tc-log-empty');
            if (empty) empty.remove();
            const div = document.createElement('div');
            div.className = `tc-log-entry ${entry.type}`;
            div.innerHTML = `<span class="tc-log-time">${formatTime(entry.time)}</span><span></span>`;
            div.lastChild.textContent = entry.message;
            logInner.insertBefore(div, logInner.firstChild);
            while (logInner.children.length > 30) {
                logInner.removeChild(logInner.lastChild);
            }
        }
        onLogUpdate = addLogEntry;

        const footer = document.createElement('div');
        footer.className = 'tc-footer';
        footer.innerHTML = `
            <a href="${BRAND.url}" target="_blank" rel="noopener" class="tc-link">tiltcheck.me</a>
            <span class="tc-tagline">${BRAND.tagline}</span>
        `;
        widget.appendChild(footer);

        // Wire vaulted display element through to VaultDisplay so updates land here.
        const vaultBalEl = content.querySelector('#tcVaultBal');
        vaultDisplay._el = vaultBalEl;
        vaultDisplay.render();

        const statusDot = widget.querySelector('#tcStatusDot');
        const minBtn = widget.querySelector('#tcMinBtn');
        const stealthBtn = widget.querySelector('#tcStealthBtn');
        const closeBtn = widget.querySelector('#tcCloseBtn');

        function setViewMode(mode) {
            currentViewMode = mode;
            if (mode === 'full') {
                widget.classList.remove('mini', 'hidden');
                stealthDot.classList.add('hidden');
            } else if (mode === 'mini') {
                widget.classList.add('mini');
                widget.classList.remove('hidden');
                stealthDot.classList.add('hidden');
            } else if (mode === 'stealth') {
                widget.classList.add('hidden');
                stealthDot.classList.remove('hidden');
            }
        }

        minBtn.onclick = (e) => {
            e.stopPropagation();
            setViewMode(currentViewMode === 'mini' ? 'full' : 'mini');
            minBtn.textContent = currentViewMode === 'mini' ? '+' : '−';
            minBtn.title = currentViewMode === 'mini' ? 'Expand' : 'Minimize';
        };
        stealthBtn.onclick = (e) => {
            e.stopPropagation();
            setViewMode('stealth');
        };
        stealthDot.onclick = () => {
            setViewMode('full');
            minBtn.textContent = '−';
        };
        closeBtn.onclick = () => {
            widget.remove();
            stealthDot.remove();
        };

        // Drag from header
        let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.tc-header-btns')) return;
            isDragging = true;
            dragOffsetX = e.clientX - widget.getBoundingClientRect().left;
            dragOffsetY = e.clientY - widget.getBoundingClientRect().top;
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            let newLeft = e.clientX - dragOffsetX;
            let newTop = e.clientY - dragOffsetY;
            newLeft = Math.max(0, Math.min(window.innerWidth - widget.offsetWidth, newLeft));
            newTop = Math.max(0, Math.min(window.innerHeight - widget.offsetHeight, newTop));
            widget.style.left = newLeft + 'px';
            widget.style.top = newTop + 'px';
            widget.style.right = 'auto';
        });
        document.addEventListener('mouseup', () => { isDragging = false; });

        const startBtn = content.querySelector('#tcStartBtn');
        const stopBtn = content.querySelector('#tcStopBtn');
        const vaultCountEl = content.querySelector('#tcVaultCount');

        function updateVaultCountUI() {
            const count = getVaultCountLastHour();
            vaultCountEl.textContent = `${count}/${RATE_LIMIT_MAX}`;
            // Color tracks how close to the cap we are: teal -> gold -> red.
            vaultCountEl.style.color = count >= RATE_LIMIT_MAX
                ? BRAND.danger
                : count >= Math.floor(RATE_LIMIT_MAX * 0.8)
                    ? BRAND.gold
                    : BRAND.teal;
        }
        window.__tcUpdateVaultCountUI = updateVaultCountUI;
        updateVaultCountUI();
        setInterval(updateVaultCountUI, 10000);

        function setRunningState(isRunning) {
            statusDot.classList.toggle('running', isRunning);
            stealthDot.classList.toggle('running', isRunning);
            startBtn.disabled = isRunning;
            stopBtn.disabled = !isRunning;
        }

        startBtn.onclick = () => {
            setRunningState(true);
            startCallback();
            updateVaultCountUI();
        };
        stopBtn.onclick = () => {
            setRunningState(false);
            stopCallback();
            updateVaultCountUI();
        };

        content.querySelector('#tcSaveAmount').onchange = function () {
            let v = parseFloat(this.value);
            if (isNaN(v) || v < 0) v = 0;
            if (v > 1) v = 1;
            setParams({ saveAmount: v });
            this.value = v;
        };
        content.querySelector('#tcBigWinThreshold').onchange = function () {
            let v = parseFloat(this.value);
            if (isNaN(v) || v < 1) v = 1;
            setParams({ bigWinThreshold: v });
            this.value = v;
        };
        content.querySelector('#tcBigWinMultiplier').onchange = function () {
            let v = parseFloat(this.value);
            if (isNaN(v) || v < 1) v = 1;
            setParams({ bigWinMultiplier: v });
            this.value = v;
        };
        content.querySelector('#tcCheckInterval').onchange = function () {
            let v = parseInt(this.value, 10);
            if (isNaN(v) || v < 10) v = 10;
            setParams({ checkInterval: v });
            this.value = v;
        };

        document.body.appendChild(widget);

        return {
            setRunning: setRunningState,
            updateVaultCount: updateVaultCountUI
        };
    }

    // --- Main monitoring state ---
    let vaultInterval = null;
    let vaultCountInterval = null;
    let apiBalanceInterval = null;
    let vaultDisplay = null;
    let stakeApi = null;
    let activeCurrency = null;
    let oldBalance = 0;
    let lastBalance = 0;
    let isProcessing = false;
    let isInitialized = false;
    let balanceChecks = 0;
    let lastDepositDetected = 0;
    let lastDepositAmount = 0;
    let lastVaultedDeposit = 0;
    let isRunning = false;
    let ui = null;

    function getParams() {
        return {
            saveAmount: config.saveAmount,
            bigWinThreshold: config.bigWinThreshold,
            bigWinMultiplier: config.bigWinMultiplier,
            checkInterval: config.checkInterval
        };
    }

    function setParams(partial) {
        config = { ...config, ...partial };
        saveConfig(config);
        // If the check interval changed mid-run, restart the loop so it takes effect.
        if (isRunning && partial.checkInterval !== undefined) {
            if (vaultInterval) clearInterval(vaultInterval);
            vaultInterval = setInterval(checkBalanceChanges, config.checkInterval * 1000);
        }
    }

    async function refreshApiBalance() {
        // Skip the poll entirely during CF backoff — the call() will short-circuit
        // anyway, but checking here saves the extra log spam.
        if (isCloudflareLocked()) return;
        try {
            if (!stakeApi) stakeApi = new StakeApi();
            const cur = (activeCurrency || '').toLowerCase();
            if (!cur) return;
            const resp = await stakeApi.getBalances();
            const balances = resp?.data?.user?.balances;
            if (!Array.isArray(balances)) return;

            // Cache EVERY balance Stake returns, not just the active one. This
            // gives getCurrency() a reliable last-resort fallback (pick the
            // largest non-zero balance) and lets us detect currency mismatches.
            getCurrentBalance._api = getCurrentBalance._api || {};
            const knownCurrencies = [];
            for (const entry of balances) {
                const code = entry?.available?.currency?.toLowerCase();
                if (!code) continue;
                const amt = entry.available.amount;
                const n = typeof amt === 'number' ? amt : parseFloat(amt);
                if (!isNaN(n) && n >= 0) {
                    getCurrentBalance._api[code] = n;
                    knownCurrencies.push(code);
                }
            }

            // The smoking gun for "currency discrepancy" errors: we are tracking
            // a currency that does not exist in the user's actual Stake balances.
            // Switch to the largest balance and log loudly so the user knows.
            if (cur && knownCurrencies.length && !knownCurrencies.includes(cur)) {
                if (!refreshApiBalance._warnedMismatch) {
                    refreshApiBalance._warnedMismatch = true;
                    log(`Currency mismatch: tracking "${cur}" but Stake says you have [${knownCurrencies.join(', ')}]. Switching to your largest balance.`, 'warning');
                }
                // Force getCurrency() to re-pick on next call.
                getCurrency.cached = null;
                getCurrency.cacheTime = 0;
                const newCur = getCurrency();
                if (newCur && newCur !== cur) {
                    activeCurrency = newCur;
                    if (vaultDisplay) vaultDisplay.setCurrency(activeCurrency);
                }
            }
        } catch (e) { /* network blip is fine */ }
    }

    function startApiBalancePolling() {
        if (apiBalanceInterval) clearInterval(apiBalanceInterval);
        apiBalanceInterval = setInterval(refreshApiBalance, 5000);
        refreshApiBalance();
    }

    function stopApiBalancePolling() {
        if (apiBalanceInterval) clearInterval(apiBalanceInterval);
        apiBalanceInterval = null;
    }

    function checkCurrencyChange() {
        getCurrency.cached = null;
        getCurrency.cacheTime = 0;
        const newCurrency = getCurrency();
        if (newCurrency !== activeCurrency) {
            log(`Currency switched: ${activeCurrency || 'none'} -> ${newCurrency}`, 'info');
            activeCurrency = newCurrency;
            startApiBalancePolling();
            vaultDisplay.setCurrency(activeCurrency);
            vaultDisplay.reset();
            isInitialized = false;
            balanceChecks = 0;
            updateCurrentBalance();
            return true;
        }
        return false;
    }

    function updateCurrentBalance() {
        const cur = getCurrentBalance();
        if (cur > 0) {
            oldBalance = cur;
            if (!isInitialized && balanceChecks++ >= MIN_BALANCE_CHECKS) {
                isInitialized = true;
                log(`Initial balance locked: ${oldBalance.toFixed(8)} ${activeCurrency.toUpperCase()}`, 'info');
            }
        }
    }

    function initializeBalance() {
        updateCurrentBalance();
        let tries = 0;
        const intv = setInterval(() => {
            if (!isRunning) { clearInterval(intv); return; }
            updateCurrentBalance();
            if (++tries >= BALANCE_INIT_RETRIES) {
                clearInterval(intv);
                if (oldBalance > 0) {
                    isInitialized = true;
                    log(`Starting balance: ${oldBalance.toFixed(8)} ${activeCurrency.toUpperCase()}`, 'info');
                } else {
                    const cur = getCurrentBalance();
                    if (cur > 0) {
                        oldBalance = cur;
                        isInitialized = true;
                        log(`Last attempt balance: ${oldBalance.toFixed(8)} ${activeCurrency.toUpperCase()}`, 'info');
                    } else {
                        log('Could not detect a starting balance. Reload the page after a deposit lands.', 'warning');
                    }
                }
            }
        }, 1000);
    }

    function detectDepositEvent() {
        // Heuristic: scan likely notification / history nodes for the word "deposit"
        // followed by a number. Stake does not give us a stable event hook here.
        const possibleSelectors = [
            '[data-testid*="notification"]',
            '[class*="notification"]',
            '[class*="transaction"]',
            '[class*="history"]',
            '[class*="activity"]'
        ];
        for (const sel of possibleSelectors) {
            const nodes = document.querySelectorAll(sel);
            for (const node of nodes) {
                const txt = node.textContent || '';
                const lower = txt.toLowerCase();
                if (lower.includes('deposit') && /\d/.test(lower)) {
                    const amt = parseStakeAmount(txt);
                    if (!isNaN(amt) && amt > 0) {
                        lastDepositDetected = Date.now();
                        lastDepositAmount = amt;
                        return amt;
                    }
                }
            }
        }
        return 0;
    }

    async function processDeposit(amount, isBigWin) {
        if (amount < 1e-8 || isProcessing) return;
        if (!canVaultNow()) {
            log(pickFlavor(FLAVOR.rateLimit), 'warning');
            if (ui) ui.updateVaultCount();
            return;
        }
        isProcessing = true;

        const pct = (config.saveAmount * (isBigWin ? config.bigWinMultiplier : 1) * 100).toFixed(0);
        const flavor = pickFlavor(isBigWin ? FLAVOR.bigWin : FLAVOR.profit);
        log(`${flavor} Vaulting ${pct}% — ${amount.toFixed(6)} ${activeCurrency.toUpperCase()}`, isBigWin ? 'bigwin' : 'profit');

        try {
            if (!stakeApi) stakeApi = new StakeApi();
            const resp = await stakeApi.depositToVault(activeCurrency, amount);
            isProcessing = false;

            // Success path
            if (resp?.data?.createVaultDeposit) {
                vaultDisplay.update(amount);
                vaultActionTimestamps.push(Date.now());
                saveRateLimitData(vaultActionTimestamps);
                oldBalance = getCurrentBalance();
                if (ui) ui.updateVaultCount();
                log(`Bag secured. +${amount.toFixed(6)} ${activeCurrency.toUpperCase()} in the vault.`, 'success');
                return;
            }

            // Failure path — surface the actual reason instead of guessing.
            // Order of suspicion: Cloudflare -> HTTP error -> GraphQL errors -> empty data.
            if (resp?.error) {
                // Cloudflare cases were already announced inside call(); just acknowledge.
                if (resp.type === 'cloudflare' || resp.type === 'cloudflare-lockout') {
                    log(`Skipping vault attempt — ${resp.message}`, 'warning');
                    return;
                }
                if (resp.status === 401 || (resp.status === 403 && resp.type !== 'cloudflare')) {
                    log(`Stake rejected auth (HTTP ${resp.status}). Session expired — refresh the page and log back in.`, 'error');
                } else if (resp.status === 429) {
                    log(`Stake rate limited the request (HTTP 429). Backing off.`, 'error');
                } else if (resp.type === 'network') {
                    log(`Network blip talking to Stake: ${resp.message}. Will retry next interval.`, 'error');
                } else {
                    log(`Stake API error (HTTP ${resp.status || '?'}): ${resp.message || 'unknown'}`, 'error');
                }
                return;
            }

            const gqlErrors = Array.isArray(resp?.errors) ? resp.errors : [];
            if (gqlErrors.length) {
                const first = gqlErrors[0] || {};
                const msg = first.message || 'unknown';
                const code = first.extensions?.code || first.extensions?.errorName;
                // Map common Stake error codes/messages to actionable hints.
                if (/CurrencyEnum/i.test(msg) || /enum/i.test(msg)) {
                    log(`Stake rejected currency "${activeCurrency.toLowerCase()}": ${msg}. Either Stake added a currency we do not recognize, or our casing is off.`, 'error');
                } else if (/rate.?limit|too many/i.test(msg) || code === 'RATE_LIMITED') {
                    log(`Stake rate limit hit: ${msg}`, 'warning');
                } else if (/insufficient|balance/i.test(msg)) {
                    log(`Insufficient balance for vault: ${msg}. Skipping this skim.`, 'warning');
                } else if (/minimum|too small|min.?amount/i.test(msg)) {
                    log(`Skim amount below Stake's minimum: ${amount.toFixed(8)} ${activeCurrency.toUpperCase()}. Bumping save percent or waiting for a bigger win.`, 'warning');
                } else if (/auth|session|unauthor/i.test(msg)) {
                    log(`Stake auth rejected: ${msg}. Refresh the page and log back in.`, 'error');
                } else {
                    log(`Stake said: ${msg}${code ? ` (${code})` : ''}`, 'error');
                }
                // Dump the full payload to console for deep debugging.
                console.warn('[TiltCheck AutoVault] Full GraphQL error payload:', resp);
                return;
            }

            // Truly unknown — log everything we have so we can debug from console.
            log(`Vault returned no data and no errors. Check DevTools console for the raw payload.`, 'error');
            console.warn('[TiltCheck AutoVault] Unexpected empty response. Request was', {
                currency: activeCurrency.toUpperCase(),
                amount,
                response: resp
            });
        } catch (e) {
            isProcessing = false;
            log('Vault threw: ' + (e.message || 'unknown'), 'error');
            console.warn('[TiltCheck AutoVault] Vault exception:', e);
        }
    }

    function checkBalanceChanges() {
        if (checkCurrencyChange()) return;
        const cur = getCurrentBalance();

        if (!isInitialized) {
            updateCurrentBalance();
            return;
        }

        const depositAmt = detectDepositEvent();
        if (depositAmt > 0) {
            // Treat as a deposit if the balance jump matches the detected deposit closely.
            if (cur - lastBalance >= depositAmt * 0.95 && lastVaultedDeposit !== depositAmt) {
                const toVault = depositAmt * DEPOSIT_VAULT_PERCENTAGE;
                log(`${pickFlavor(FLAVOR.deposit)} +${depositAmt.toFixed(4)} ${activeCurrency.toUpperCase()}`, 'info');
                processDeposit(toVault, false);
                lastVaultedDeposit = depositAmt;
                oldBalance = cur;
            }
        } else if (cur > oldBalance) {
            const profit = cur - oldBalance;
            const isBig = cur > oldBalance * config.bigWinThreshold;
            const depAmt = profit * config.saveAmount * (isBig ? config.bigWinMultiplier : 1);
            processDeposit(depAmt, isBig);
            oldBalance = cur;
        } else if (cur < oldBalance) {
            // Loss — reset baseline so the next win calculates from the new floor.
            oldBalance = cur;
        }

        lastBalance = cur;
        if (ui) ui.updateVaultCount();
    }

    // --- Generic DOM (nudge) monitoring loop ---
    // No API access. Polls visible balance for upward jumps, opens the casino's
    // own vault dialog when a heater hits. User confirms the deposit themselves.
    let genericAdapter = null;
    let genericLastBalance = 0;
    let genericInitialized = false;
    let genericInitChecks = 0;
    let genericLastNudge = 0;
    const GENERIC_NUDGE_COOLDOWN_MS = 60 * 1000; // do not spam the dialog

    function checkGenericBalanceChanges() {
        if (!genericAdapter) return;
        const cur = genericAdapter.getBalanceFromDOM();
        if (cur === null) {
            if (!checkGenericBalanceChanges._warned) {
                checkGenericBalanceChanges._warned = true;
                log(`Could not read balance on ${SITE.name}. Make sure the balance bar is visible.`, 'warning');
            }
            return;
        }

        if (!genericInitialized) {
            if (cur > 0) {
                genericLastBalance = cur;
                if (genericInitChecks++ >= MIN_BALANCE_CHECKS) {
                    genericInitialized = true;
                    log(`Initial ${SITE.name} balance locked: ${cur.toFixed(4)}`, 'info');
                }
            }
            return;
        }

        if (cur > genericLastBalance) {
            const profit = cur - genericLastBalance;
            const isBig = cur > genericLastBalance * config.bigWinThreshold;
            const suggested = profit * config.saveAmount * (isBig ? config.bigWinMultiplier : 1);

            const sinceLast = Date.now() - genericLastNudge;
            if (sinceLast < GENERIC_NUDGE_COOLDOWN_MS) {
                genericLastBalance = cur;
                return;
            }

            const flavor = pickFlavor(isBig ? FLAVOR.bigWin : FLAVOR.profit);
            log(`${flavor} Suggested: lock ${suggested.toFixed(4)} on ${SITE.name}.`, isBig ? 'bigwin' : 'profit');

            const clicked = genericAdapter.openVaultDialog();
            if (clicked) {
                genericLastNudge = Date.now();
                const btnText = (clicked.textContent || '').trim().slice(0, 20);
                log(`Vault dialog opened ("${btnText}"). Confirm the deposit yourself.`, 'success');
            } else {
                log(`Could not find a vault button on ${SITE.name}. Open the vault manually.`, 'warning');
            }

            genericLastBalance = cur;
        } else if (cur < genericLastBalance) {
            // Loss: reset baseline so the next win calculates from the new floor.
            genericLastBalance = cur;
        }
    }

    function startMonitoring() {
        if (isRunning) return;

        if (SITE.mode === 'stake-api') {
            isRunning = true;
            stakeApi = new StakeApi();
            activeCurrency = getCurrency();
            startApiBalancePolling();

            vaultDisplay.setCurrency(activeCurrency);
            vaultDisplay.reset();
            oldBalance = 0;
            isProcessing = false;
            isInitialized = false;
            balanceChecks = 0;
            lastDepositDetected = 0;
            lastDepositAmount = 0;
            lastBalance = getCurrentBalance();
            lastVaultedDeposit = 0;
            vaultActionTimestamps = loadRateLimitData();

            initializeBalance();
            vaultInterval = setInterval(checkBalanceChanges, config.checkInterval * 1000);
            vaultCountInterval = setInterval(() => {
                if (ui) ui.updateVaultCount();
            }, 10000);

            log(pickFlavor(FLAVOR.start), 'success');
            log(`Watching ${activeCurrency.toUpperCase()} on ${SITE.name}`, 'info');
            return;
        }

        if (SITE.mode === 'generic-dom') {
            isRunning = true;
            genericAdapter = new GenericDOMAdapter(SITE.name, SITE.hints);
            genericLastBalance = 0;
            genericInitialized = false;
            genericInitChecks = 0;
            genericLastNudge = 0;
            checkGenericBalanceChanges._warned = false;

            // First sweep is immediate so the user gets fast feedback that we
            // can read their balance.
            checkGenericBalanceChanges();
            vaultInterval = setInterval(checkGenericBalanceChanges, config.checkInterval * 1000);

            log(pickFlavor(FLAVOR.start), 'success');
            log(`${SITE.name}: nudge mode. We will open the vault dialog; you confirm the deposit.`, 'info');
            return;
        }

        log(`AutoVault is not supported on ${SITE.name} yet.`, 'warning');
    }

    function stopMonitoring() {
        if (!isRunning) return;
        isRunning = false;
        if (vaultInterval) clearInterval(vaultInterval);
        vaultInterval = null;
        if (vaultCountInterval) clearInterval(vaultCountInterval);
        vaultCountInterval = null;
        if (SITE.mode === 'stake-api') stopApiBalancePolling();
        log(pickFlavor(FLAVOR.stop), 'info');
    }

    // --- Bootstrap ---
    function init() {
        if (SITE.mode === 'stake-api') {
            // Bail loudly if there is no Stake session — TiltCheck cannot do anything useful.
            if (!getCookie('session')) {
                log('No Stake session cookie found. Log in first, then refresh.', 'warning');
            }
        } else if (SITE.mode === 'generic-dom') {
            log(`${SITE.name} runs in DOM nudge mode. Less reliable than Stake.com — feedback welcome.`, 'info');
        } else if (SITE.mode === 'unsupported') {
            log(`This site (${SITE.name}) is not supported. AutoVault will stay idle.`, 'warning');
        }
        vaultDisplay = new VaultDisplay();
        ui = createVaultFloatyUI(startMonitoring, stopMonitoring, getParams, setParams, vaultDisplay);
        log(`${BRAND.name} ${BRAND.product} ready on ${SITE.name}. Press Start when you are.`, 'info');
    }

    // Wait for the page to settle before injecting the widget so Stake's own
    // app shell is mounted and our DOM queries have something to find.
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(init, INIT_DELAY);
    } else {
        window.addEventListener('DOMContentLoaded', () => setTimeout(init, INIT_DELAY));
    }
})();
