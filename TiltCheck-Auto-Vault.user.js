/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
// ==UserScript==
// @name         TiltCheck Auto-Vault
// @version      1.0
// @description  Automatically sends a percentage of your profits to the vault, works on stake.com, its mirror sites, and stake.us
// @author       by jmenichole, TiltCheck
// @website      https://tiltcheck.me
// @homepage     https://tiltcheck.me
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
// @run-at       document-end
// @downloadURL  https://raw.githubusercontent.com/TiltCheck-ME/tiltcheck-monorepo/main/TiltCheck-Auto-Vault.user.js
// @updateURL    https://raw.githubusercontent.com/TiltCheck-ME/tiltcheck-monorepo/main/TiltCheck-Auto-Vault.user.js
// @namespace    TiltCheck Auto-Vault
// ==/UserScript==

(function() {
    'use strict';

    // --- TiltCheck Brand Config ---
    var BRAND = {
        name: 'TiltCheck',
        website: 'https://tiltcheck.me',
        discord: 'https://discord.gg/GNtz42ZX',
        colors: {
            primary: '#00FFF5',
            secondary: '#B100FF',
            background: '#0D0D0F',
            surface: '#1a1a1f',
            text: '#F5F5F5',
            textMuted: '#8a8a8f',
            success: '#00FFF5',
            warning: '#FF7A28',
            error: '#FF0033',
            border: '#2a2a35'
        }
    };

    // --- Config ---
    var INIT_DELAY = 2000;
    var DEFAULT_CURRENCY = 'bnb';
    var DEFAULT_US_CURRENCY = 'sc';
    var MIN_BALANCE_CHECKS = 2;
    var CURRENCY_CACHE_TIMEOUT = 5000;
    var BALANCE_INIT_RETRIES = 5;
    var RATE_LIMIT_MAX = 50;
    var RATE_LIMIT_WINDOW = 60 * 60 * 1000;

    function loadConfig() {
        var saved = localStorage.getItem('tiltcheck-autovault-config');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                log('Failed to load saved config:', e);
            }
        }
        return {
            saveAmount: 0.1,
            bigWinThreshold: 5,
            bigWinMultiplier: 3,
            checkInterval: 90000,
            analyticsOptIn: false
        };
    }

    function saveConfig(cfg) {
        localStorage.setItem('tiltcheck-autovault-config', JSON.stringify(cfg));
    }

    var config = loadConfig();
    var SAVE_AMOUNT = config.saveAmount;
    var BIG_WIN_THRESHOLD = config.bigWinThreshold;
    var BIG_WIN_MULTIPLIER = config.bigWinMultiplier;
    var CHECK_INTERVAL = config.checkInterval;

    // --- Analytics (opt-in, default OFF) ---
    var SUPABASE_URL = 'https://your-project.supabase.co'; // TODO: replace with actual project URL
    var SUPABASE_ANON_KEY = 'your-anon-key'; // TODO: replace with actual anon key
    var SCRIPT_VERSION = '1.0';

    function sendAnalyticsPing(event) {
        if (!config.analyticsOptIn) return;
        try {
            fetch(SUPABASE_URL + '/rest/v1/vault_analytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
                },
                body: JSON.stringify({
                    event: event,
                    script_version: SCRIPT_VERSION,
                    site_domain: hostname
                })
            });
        } catch (e) {
            // Silent fail — analytics should never break the script
        }
    }

    // --- Site detection ---
    var hostname = window.location.hostname;
    var isStakeUS = hostname.endsWith('.us');
    var isScriptInitialized = false;

    // --- Activity Log ---
    var activityLog = [];
    var MAX_LOG_ENTRIES = 50;
    var onLogUpdate = null;

    function logActivity(message, type) {
        type = type || 'info';
        var entry = {
            time: new Date(),
            message: message,
            type: type
        };
        activityLog.unshift(entry);
        if (activityLog.length > MAX_LOG_ENTRIES) activityLog.pop();
        console.log('[TiltCheck Vault]', message);
        if (onLogUpdate) onLogUpdate(entry);
    }
    var log = function() {
        var args = Array.prototype.slice.call(arguments);
        logActivity(args.join(' '), 'info');
    };

    // --- TiltCheck Flavor Text ---
    var FLAVOR = {
        profit: [
            "TiltCheck secured profit",
            "Bankroll protected",
            "Savings automated"
        ],
        bigWin: [
            "BIG WIN! TiltCheck active",
            "Jackpot! Vaulting active"
        ],
        deposit: [
            "Deposit detected",
            "Balance boost logged"
        ],
        start: [
            "TiltCheck Vault active",
            "Auto-vault running"
        ],
        stop: [
            "TiltCheck Vault paused",
            "Auto-vault stopped"
        ],
        rateLimit: [
            "Rate limited - TiltCheck pausing vault. Please wait...",
            "Limit reached - TiltCheck pausing. Please wait..."
        ]
    };
    function pickFlavor(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    // --- Cookie helper ---
    function getCookie(name) {
        var m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
        return m ? m.pop().replace(/"/g, '') : '';
    }

    // --- Balance selectors ---
    var BALANCE_SELECTORS = [
        '[data-testid="coin-toggle"] .content span[data-ds-text="true"]',
        '[data-testid="balance-toggle"] .content span[data-ds-text="true"]',
        '[data-testid="coin-toggle"] .content span',
        '[data-testid="balance-toggle"] span.content span',
        '[data-testid="user-balance"] .numeric',
        '.numeric.variant-highlighted',
        '[data-testid="user-balance"]',
        '.balance-value'
    ];

    // --- Stake API ---
    function StakeApi() {
        this.apiUrl = window.location.origin + '/_api/graphql';
        this._accessToken = getCookie("session");
        this.headers = {
            'content-type': 'application/json',
            'x-access-token': this._accessToken,
            'x-language': 'en'
        };
    }
    StakeApi.prototype.call = function(body, opName) {
        var self = this;
        var headers = {};
        for (var k in self.headers) headers[k] = self.headers[k];
        if (opName) headers['x-operation-name'] = opName;
        return fetch(self.apiUrl, {
            credentials: 'include',
            headers: headers,
            referrer: window.location.origin,
            body: body,
            method: 'POST',
            mode: 'cors',
            cache: 'no-cache'
        }).then(function(res) {
            if (!res.ok) {
                log('API call failed with status ' + res.status + ': ' + res.statusText);
                return { error: true, status: res.status, message: res.statusText };
            }
            return res.json();
        }).catch(function(e) {
            log('API call failed:', e);
            return { error: true, message: e.message, type: 'network' };
        });
    };
    StakeApi.prototype.getBalances = function() {
        var q = {
            query: 'query UserBalances { user { id balances { available { amount currency } vault { amount currency } } } }',
            variables: {}
        };
        return this.call(JSON.stringify(q), 'UserBalances');
    };
    StakeApi.prototype.depositToVault = function(currency, amount) {
        var q = {
            query: 'mutation CreateVaultDeposit($currency: CurrencyEnum!, $amount: Float!) { createVaultDeposit(currency: $currency, amount: $amount) { id amount currency user { id balances { available { amount currency } vault { amount currency } } } __typename } }',
            variables: { currency: currency, amount: amount }
        };
        return this.call(JSON.stringify(q), 'CreateVaultDeposit');
    };

    // --- Vault Display ---
    function VaultDisplay() {
        this._el = document.createElement("span");
        this._el.id = "vaultDisplayElement";
        this._vaulted = 0;
        this._currency = getCurrency();
        this._el.title = "Vaulted this session";
        Object.assign(this._el.style, {
            marginLeft: "8px",
            color: BRAND.colors.primary,
            fontSize: "1em",
            fontWeight: "bold",
            background: BRAND.colors.surface,
            borderRadius: "6px",
            padding: "2px 8px",
            boxShadow: '0 0 10px ' + BRAND.colors.primary + '40'
        });
        this._load();
        this.render();
    }
    VaultDisplay.prototype._storageKey = function() {
        var c = (this._currency || getCurrency() || '').toLowerCase();
        return 'tiltcheck-vaulted-session:' + c;
    };
    VaultDisplay.prototype._load = function() {
        try {
            var raw = sessionStorage.getItem(this._storageKey());
            var v = parseFloat(raw);
            if (!isNaN(v) && v >= 0) this._vaulted = v;
        } catch (e) {}
    };
    VaultDisplay.prototype._save = function() {
        try {
            sessionStorage.setItem(this._storageKey(), String(this._vaulted));
        } catch (e) {}
    };
    VaultDisplay.prototype.setCurrency = function(currency) {
        this._currency = (currency || getCurrency() || '').toLowerCase();
        this._load();
        this.render();
    };
    VaultDisplay.prototype.render = function() {
        if (!this._el) return;
        this._el.innerText = (this._vaulted || 0).toFixed(8);
    };
    VaultDisplay.prototype.update = function(amount) {
        var add = +amount;
        if (isNaN(add) || add <= 0) return;
        this._vaulted = (this._vaulted || 0) + add;
        this._save();
        this.render();
    };
    VaultDisplay.prototype.reset = function() {
        this._vaulted = 0;
        this._save();
        this.render();
    };

    // --- Currency detection ---
    function parseStakeAmount(text) {
        if (!text) return NaN;
        var raw = String(text).replace(/\u00a0/g, ' ').trim();
        if (!raw) return NaN;
        if (/[•*]+/.test(raw)) return NaN;
        var m = raw.match(/[-+]?\d[\d\s,.'](?:[.,]\d+)?[kmbt]?/i);
        if (!m) return NaN;
        var token = m[0].trim();
        var suffixMatch = token.match(/[kmbt]$/i);
        var suffix = suffixMatch ? suffixMatch[0].toLowerCase() : '';
        token = token.replace(/[kmbt]$/i, '').trim();
        token = token.replace(/[\s'.]/g, '');
        var hasDot = token.indexOf('.') !== -1;
        var hasComma = token.indexOf(',') !== -1;
        if (hasDot && hasComma) {
            if (token.lastIndexOf('.') > token.lastIndexOf(',')) {
                token = token.replace(/,/g, '');
            } else {
                token = token.replace(/\./g, '').replace(/,/g, '.');
            }
        } else if (hasComma && !hasDot) {
            var parts = token.split(',');
            if (parts.length === 2 && parts[1].length <= 2) token = parts[0] + '.' + parts[1];
            else token = token.replace(/,/g, '');
        } else {
            token = token.replace(/,/g, '');
        }
        var n = parseFloat(token);
        if (isNaN(n)) return NaN;
        var mult = suffix === 'k' ? 1e3 : suffix === 'm' ? 1e6 : suffix === 'b' ? 1e9 : suffix === 't' ? 1e12 : 1;
        return n * mult;
    }

    function detectCurrencyFromBalanceBar() {
        var el = document.querySelector('[data-testid="coin-toggle"]') || document.querySelector('[data-testid="balance-toggle"]');
        if (!el) return null;
        var txt = (el.textContent || '').trim();
        var m = txt.match(/\b[A-Z]{2,5}\b/);
        return m ? m[0].toLowerCase() : null;
    }

    function getCurrency() {
        var now = Date.now();
        if (getCurrency.cached && getCurrency.cacheTime && (now - getCurrency.cacheTime < CURRENCY_CACHE_TIMEOUT)) {
            return getCurrency.cached;
        }
        var el = document.querySelector('[data-active-currency]');
        if (el) {
            var c = el.getAttribute('data-active-currency');
            if (c) {
                getCurrency.cached = c.toLowerCase();
                getCurrency.cacheTime = now;
                return getCurrency.cached;
            }
        }
        var fromBar = detectCurrencyFromBalanceBar();
        if (fromBar) {
            getCurrency.cached = fromBar;
            getCurrency.cacheTime = now;
            return getCurrency.cached;
        }
        var defaultCurr = isStakeUS ? DEFAULT_US_CURRENCY : DEFAULT_CURRENCY;
        getCurrency.cached = defaultCurr;
        getCurrency.cacheTime = now;
        return defaultCurr;
    }

    // --- Get balance from UI ---
    function getCurrentBalance() {
        var curCode = (activeCurrency || getCurrency() || '').toLowerCase();
        var uiCode = (detectCurrencyFromBalanceBar() || '').toLowerCase();
        if (curCode && uiCode && uiCode !== curCode) {
            var apiVal = getCurrentBalance._api ? getCurrentBalance._api[curCode] : undefined;
            if (typeof apiVal === 'number' && apiVal >= 0) return apiVal;
        }
        for (var i = 0; i < BALANCE_SELECTORS.length; i++) {
            var selector = BALANCE_SELECTORS[i];
            try {
                var el = document.querySelector(selector);
                if (el) {
                    var val = parseStakeAmount(el.textContent);
                    if (!isNaN(val) && val >= 0) {
                        if (!getCurrentBalance._workingSelector || getCurrentBalance._workingSelector !== selector) {
                            getCurrentBalance._workingSelector = selector;
                            log('Balance detected using selector: ' + selector);
                        }
                        getCurrentBalance.lastKnownBalance = val;
                        return val;
                    }
                }
            } catch (e) {}
        }
        if (curCode) {
            var apiVal = getCurrentBalance._api ? getCurrentBalance._api[curCode] : undefined;
            if (typeof apiVal === 'number' && apiVal >= 0) return apiVal;
        }
        if (!getCurrentBalance._warned) {
            getCurrentBalance._warned = true;
            log('Could not detect balance with any known selector.');
        }
        return getCurrentBalance.lastKnownBalance || 0;
    }

    // --- Vault Rate Limit Tracking ---
    function loadRateLimitData() {
        var saved = sessionStorage.getItem('tiltcheck-ratelimit');
        if (saved) {
            try {
                var data = JSON.parse(saved);
                return data.filter(function(ts) { return Date.now() - ts < RATE_LIMIT_WINDOW; });
            } catch (e) {
                log('Failed to load rate limit data:', e);
            }
        }
        return [];
    }

    function saveRateLimitData(timestamps) {
        sessionStorage.setItem('tiltcheck-ratelimit', JSON.stringify(timestamps));
    }

    var vaultActionTimestamps = loadRateLimitData();

    function canVaultNow() {
        var now = Date.now();
        vaultActionTimestamps = vaultActionTimestamps.filter(function(ts) { return now - ts < RATE_LIMIT_WINDOW; });
        saveRateLimitData(vaultActionTimestamps);
        return vaultActionTimestamps.length < RATE_LIMIT_MAX;
    }

    function getVaultCountLastHour() {
        var now = Date.now();
        vaultActionTimestamps = vaultActionTimestamps.filter(function(ts) { return now - ts < RATE_LIMIT_WINDOW; });
        return vaultActionTimestamps.length;
    }

    // --- TiltCheck Floaty UI Widget ---
    var currentViewMode = 'full';

    function createVaultFloatyUI(startCallback, stopCallback, getParams, setParams, vaultDisplay) {
        if (document.getElementById('tiltcheck-floaty')) {
            document.getElementById('tiltcheck-floaty').remove();
        }
        if (document.getElementById('tiltcheck-stealth')) {
            document.getElementById('tiltcheck-stealth').remove();
        }

        // TiltCheck Brand Styles
        var style = document.createElement('style');
        style.id = 'tiltcheck-styles';
        style.textContent = ''
            + '#tiltcheck-floaty {'
            + '  background: ' + BRAND.colors.background + ';'
            + '  color: ' + BRAND.colors.text + ';'
            + '  border: 1px solid ' + BRAND.colors.border + ';'
            + '  border-radius: 12px;'
            + '  box-shadow: 0 4px 30px rgba(0, 255, 245, 0.15), 0 0 60px rgba(177, 0, 255, 0.1);'
            + '  font-family: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;'
            + '  font-size: 13px;'
            + '  min-width: 260px;'
            + '  max-width: 300px;'
            + '  user-select: none;'
            + '  position: fixed;'
            + '  top: 80px;'
            + '  right: 20px;'
            + '  z-index: 999999;'
            + '  display: flex;'
            + '  flex-direction: column;'
            + '  transition: opacity 0.2s, transform 0.2s;'
            + '  overflow: hidden;'
            + '}'
            + '#tiltcheck-floaty.hidden { display: none; }'
            + '#tiltcheck-floaty .tc-header {'
            + '  display: flex;'
            + '  align-items: center;'
            + '  justify-content: space-between;'
            + '  background: linear-gradient(135deg, ' + BRAND.colors.surface + ' 0%, ' + BRAND.colors.background + ' 100%);'
            + '  padding: 10px 14px;'
            + '  border-radius: 12px 12px 0 0;'
            + '  border-bottom: 1px solid ' + BRAND.colors.border + ';'
            + '  cursor: grab;'
            + '  position: relative;'
            + '  overflow: hidden;'
            + '}'
            + '#tiltcheck-floaty .tc-header::before {'
            + '  content: "";'
            + '  position: absolute;'
            + '  top: 0;'
            + '  left: 0;'
            + '  right: 0;'
            + '  height: 2px;'
            + '  background: linear-gradient(90deg, ' + BRAND.colors.primary + ', ' + BRAND.colors.secondary + ');'
            + '}'
            + '#tiltcheck-floaty .tc-header:active { cursor: grabbing; }'
            + '#tiltcheck-floaty .tc-brand {'
            + '  display: flex;'
            + '  align-items: center;'
            + '  gap: 8px;'
            + '}'
            + '#tiltcheck-floaty .tc-logo {'
            + '  width: 24px;'
            + '  height: 24px;'
            + '  background: linear-gradient(135deg, ' + BRAND.colors.primary + ', ' + BRAND.colors.secondary + ');'
            + '  border-radius: 6px;'
            + '  display: flex;'
            + '  align-items: center;'
            + '  justify-content: center;'
            + '  font-weight: bold;'
            + '  font-size: 12px;'
            + '  color: ' + BRAND.colors.background + ';'
            + '  box-shadow: 0 0 10px ' + BRAND.colors.primary + '60;'
            + '}'
            + '#tiltcheck-floaty .tc-title {'
            + '  font-weight: 700;'
            + '  font-size: 13px;'
            + '  color: ' + BRAND.colors.text + ';'
            + '  letter-spacing: 0.5px;'
            + '}'
            + '#tiltcheck-floaty .tc-status-dot {'
            + '  width: 8px;'
            + '  height: 8px;'
            + '  border-radius: 50%;'
            + '  background: #4a5568;'
            + '  box-shadow: 0 0 8px transparent;'
            + '  transition: all 0.3s ease;'
            + '}'
            + '#tiltcheck-floaty .tc-status-dot.running { '
            + '  background: ' + BRAND.colors.primary + ';'
            + '  box-shadow: 0 0 12px ' + BRAND.colors.primary + ';'
            + '}'
            + '#tiltcheck-floaty .tc-header-btns {'
            + '  display: flex;'
            + '  gap: 4px;'
            + '}'
            + '#tiltcheck-floaty .tc-header-btn {'
            + '  background: none;'
            + '  border: none;'
            + '  color: ' + BRAND.colors.textMuted + ';'
            + '  cursor: pointer;'
            + '  padding: 4px 8px;'
            + '  border-radius: 4px;'
            + '  font-size: 14px;'
            + '  line-height: 1;'
            + '  transition: all 0.15s;'
            + '}'
            + '#tiltcheck-floaty .tc-header-btn:hover {'
            + '  color: ' + BRAND.colors.text + ';'
            + '  background: ' + BRAND.colors.border + ';'
            + '}'
            + '#tiltcheck-floaty .tc-content {'
            + '  padding: 14px;'
            + '  display: flex;'
            + '  flex-direction: column;'
            + '  gap: 12px;'
            + '}'
            + '#tiltcheck-floaty .tc-row {'
            + '  display: flex;'
            + '  align-items: center;'
            + '  justify-content: space-between;'
            + '}'
            + '#tiltcheck-floaty .tc-label {'
            + '  color: ' + BRAND.colors.textMuted + ';'
            + '  font-size: 12px;'
            + '}'
            + '#tiltcheck-floaty input[type="number"] {'
            + '  background: ' + BRAND.colors.surface + ';'
            + '  color: ' + BRAND.colors.text + ';'
            + '  border: 1px solid ' + BRAND.colors.border + ';'
            + '  border-radius: 6px;'
            + '  padding: 6px 8px;'
            + '  font-size: 12px;'
            + '  width: 60px;'
            + '  text-align: right;'
            + '  transition: all 0.15s;'
            + '}'
            + '#tiltcheck-floaty input[type="number"]:focus {'
            + '  outline: none;'
            + '  border-color: ' + BRAND.colors.primary + ';'
            + '  box-shadow: 0 0 8px ' + BRAND.colors.primary + '30;'
            + '}'
            + '#tiltcheck-floaty .tc-btn-row {'
            + '  display: flex;'
            + '  gap: 8px;'
            + '  margin-top: 4px;'
            + '}'
            + '#tiltcheck-floaty .tc-btn {'
            + '  flex: 1;'
            + '  background: ' + BRAND.colors.surface + ';'
            + '  color: ' + BRAND.colors.text + ';'
            + '  border: 1px solid ' + BRAND.colors.border + ';'
            + '  border-radius: 6px;'
            + '  padding: 8px 12px;'
            + '  font-size: 11px;'
            + '  font-weight: 600;'
            + '  cursor: pointer;'
            + '  transition: all 0.15s;'
            + '  text-transform: uppercase;'
            + '  letter-spacing: 0.5px;'
            + '}'
            + '#tiltcheck-floaty .tc-btn:hover:not(:disabled) {'
            + '  background: ' + BRAND.colors.border + ';'
            + '  color: ' + BRAND.colors.text + ';'
            + '}'
            + '#tiltcheck-floaty .tc-btn:disabled {'
            + '  opacity: 0.4;'
            + '  cursor: not-allowed;'
            + '}'
            + '#tiltcheck-floaty .tc-btn.primary {'
            + '  background: linear-gradient(135deg, ' + BRAND.colors.primary + ', ' + BRAND.colors.secondary + ');'
            + '  border: none;'
            + '  color: ' + BRAND.colors.background + ';'
            + '}'
            + '#tiltcheck-floaty .tc-btn.primary:hover:not(:disabled) {'
            + '  box-shadow: 0 0 20px ' + BRAND.colors.primary + '60;'
            + '  transform: translateY(-1px);'
            + '}'
            + '#tiltcheck-floaty .tc-btn.danger {'
            + '  background: transparent;'
            + '  border: 1px solid ' + BRAND.colors.error + ';'
            + '  color: ' + BRAND.colors.error + ';'
            + '}'
            + '#tiltcheck-floaty .tc-btn.danger:hover:not(:disabled) {'
            + '  background: ' + BRAND.colors.error + ';'
            + '  color: ' + BRAND.colors.text + ';'
            + '}'
            + '#tiltcheck-floaty .tc-stats {'
            + '  display: flex;'
            + '  justify-content: space-between;'
            + '  padding-top: 10px;'
            + '  border-top: 1px solid ' + BRAND.colors.border + ';'
            + '  font-size: 11px;'
            + '}'
            + '#tiltcheck-floaty .tc-stat {'
            + '  display: flex;'
            + '  flex-direction: column;'
            + '  gap: 2px;'
            + '}'
            + '#tiltcheck-floaty .tc-stat-label {'
            + '  color: ' + BRAND.colors.textMuted + ';'
            + '  font-size: 10px;'
            + '  text-transform: uppercase;'
            + '  letter-spacing: 0.5px;'
            + '}'
            + '#tiltcheck-floaty .tc-stat-value {'
            + '  color: ' + BRAND.colors.primary + ';'
            + '  font-weight: 700;'
            + '  font-size: 12px;'
            + '  text-shadow: 0 0 8px ' + BRAND.colors.primary + '40;'
            + '}'
            + '#tiltcheck-floaty .tc-footer {'
            + '  display: flex;'
            + '  justify-content: center;'
            + '  padding: 8px;'
            + '  border-top: 1px solid ' + BRAND.colors.border + ';'
            + '  background: ' + BRAND.colors.surface + ';'
            + '  gap: 12px;'
            + '}'
            + '#tiltcheck-floaty .tc-link {'
            + '  color: ' + BRAND.colors.textMuted + ';'
            + '  font-size: 10px;'
            + '  text-decoration: none;'
            + '  transition: color 0.15s;'
            + '}'
            + '#tiltcheck-floaty .tc-link:hover { '
            + '  color: ' + BRAND.colors.primary + ';'
            + '}'
            + '#tiltcheck-floaty .tc-footer-sub {'
            + '  color: ' + BRAND.colors.textMuted + ';'
            + '  font-size: 9px;'
            + '  font-style: italic;'
            + '}'
            + '#tiltcheck-floaty .tc-log-toggle {'
            + '  display: flex;'
            + '  align-items: center;'
            + '  justify-content: space-between;'
            + '  padding: 8px 14px;'
            + '  background: ' + BRAND.colors.surface + ';'
            + '  border-top: 1px solid ' + BRAND.colors.border + ';'
            + '  cursor: pointer;'
            + '  transition: background 0.15s;'
            + '}'
            + '#tiltcheck-floaty .tc-log-toggle:hover { background: ' + BRAND.colors.border + '; }'
            + '#tiltcheck-floaty .tc-log-toggle-text {'
            + '  font-size: 10px;'
            + '  color: ' + BRAND.colors.textMuted + ';'
            + '  text-transform: uppercase;'
            + '  letter-spacing: 0.5px;'
            + '}'
            + '#tiltcheck-floaty .tc-log-toggle-icon {'
            + '  font-size: 10px;'
            + '  color: ' + BRAND.colors.textMuted + ';'
            + '  transition: transform 0.2s;'
            + '}'
            + '#tiltcheck-floaty .tc-log-toggle.open .tc-log-toggle-icon {'
            + '  transform: rotate(180deg);'
            + '}'
            + '#tiltcheck-floaty .tc-log {'
            + '  max-height: 0;'
            + '  overflow: hidden;'
            + '  transition: max-height 0.25s ease-out;'
            + '  background: #0a0a0f;'
            + '}'
            + '#tiltcheck-floaty .tc-log.open {'
            + '  max-height: 140px;'
            + '}'
            + '#tiltcheck-floaty .tc-log-inner {'
            + '  padding: 8px;'
            + '  max-height: 140px;'
            + '  overflow-y: auto;'
            + '  font-family: Monaco, Consolas, monospace;'
            + '  font-size: 10px;'
            + '  line-height: 1.4;'
            + '}'
            + '#tiltcheck-floaty .tc-log-inner::-webkit-scrollbar {'
            + '  width: 4px;'
            + '}'
            + '#tiltcheck-floaty .tc-log-inner::-webkit-scrollbar-track {'
            + '  background: #0a0a0f;'
            + '}'
            + '#tiltcheck-floaty .tc-log-inner::-webkit-scrollbar-thumb {'
            + '  background: ' + BRAND.colors.border + ';'
            + '  border-radius: 2px;'
            + '}'
            + '#tiltcheck-floaty .tc-log-entry {'
            + '  padding: 3px 0;'
            + '  color: ' + BRAND.colors.textMuted + ';'
            + '  display: flex;'
            + '  gap: 6px;'
            + '}'
            + '#tiltcheck-floaty .tc-log-entry.success { color: ' + BRAND.colors.primary + '; }'
            + '#tiltcheck-floaty .tc-log-entry.profit { color: ' + BRAND.colors.primary + '; }'
            + '#tiltcheck-floaty .tc-log-entry.bigwin { '
            + '  color: ' + BRAND.colors.warning + ';'
            + '  text-shadow: 0 0 8px ' + BRAND.colors.warning + '40;'
            + '}'
            + '#tiltcheck-floaty .tc-log-entry.warning { color: ' + BRAND.colors.warning + '; }'
            + '#tiltcheck-floaty .tc-log-entry.error { color: ' + BRAND.colors.error + '; }'
            + '#tiltcheck-floaty .tc-log-time {'
            + '  color: #4a4a4f;'
            + '  flex-shrink: 0;'
            + '}'
            + '#tiltcheck-floaty .tc-log-empty {'
            + '  color: #4a4a4f;'
            + '  font-style: italic;'
            + '  text-align: center;'
            + '  padding: 8px;'
            + '}'
            + '#tiltcheck-floaty.mini {'
            + '  min-width: auto;'
            + '  max-width: none;'
            + '  border-radius: 24px;'
            + '}'
            + '#tiltcheck-floaty.mini .tc-header {'
            + '  border-radius: 24px;'
            + '  padding: 8px 14px;'
            + '  border-bottom: none;'
            + '}'
            + '#tiltcheck-floaty.mini .tc-content,'
            + '#tiltcheck-floaty.mini .tc-log-toggle,'
            + '#tiltcheck-floaty.mini .tc-log,'
            + '#tiltcheck-floaty.mini .tc-footer { display: none; }'
            + '#tiltcheck-floaty.mini .tc-title span { display: none; }'
            + '#tiltcheck-stealth {'
            + '  position: fixed;'
            + '  bottom: 14px;'
            + '  right: 14px;'
            + '  width: 10px;'
            + '  height: 10px;'
            + '  border-radius: 50%;'
            + '  background: #4a5568;'
            + '  cursor: pointer;'
            + '  z-index: 999999;'
            + '  transition: all 0.2s;'
            + '  box-shadow: 0 0 8px rgba(0,0,0,0.5);'
            + '}'
            + '#tiltcheck-stealth:hover {'
            + '  transform: scale(2);'
            + '  box-shadow: 0 0 16px ' + BRAND.colors.primary + ';'
            + '}'
            + '#tiltcheck-stealth.running { '
            + '  background: ' + BRAND.colors.primary + ';'
            + '  box-shadow: 0 0 12px ' + BRAND.colors.primary + ';'
            + '}'
            + '#tiltcheck-stealth.hidden { display: none; }'
            + '@media (max-width: 500px) {'
            + '  #tiltcheck-floaty {'
            + '    right: 10px !important;'
            + '    left: 10px !important;'
            + '    max-width: none;'
            + '    min-width: auto;'
            + '  }'
            + '}'
            + '@keyframes tc-glow {'
            + '  0%, 100% { box-shadow: 0 4px 30px rgba(0, 255, 245, 0.15), 0 0 60px rgba(177, 0, 255, 0.1); }'
            + '  50% { box-shadow: 0 4px 40px rgba(0, 255, 245, 0.25), 0 0 80px rgba(177, 0, 255, 0.2); }'
            + '}'
            + '#tiltcheck-floaty.running {'
            + '  animation: tc-glow 2s ease-in-out infinite;'
            + '}';
        document.head.appendChild(style);

        var widget = document.createElement('div');
        widget.id = 'tiltcheck-floaty';

        var stealthDot = document.createElement('div');
        stealthDot.id = 'tiltcheck-stealth';
        stealthDot.className = 'hidden';
        stealthDot.title = 'TiltCheck Vault (click to expand)';
        document.body.appendChild(stealthDot);

        var header = document.createElement('div');
        header.className = 'tc-header';
        header.innerHTML = ''
            + '<div class="tc-brand">'
            + '  <div class="tc-status-dot"></div>'
            + '  <div class="tc-logo">TC</div>'
            + '  <div class="tc-title"><span>TiltCheck Vault</span></div>'
            + '</div>'
            + '<div class="tc-header-btns">'
            + '  <button class="tc-header-btn" id="tcMinBtn" title="Minimize">−</button>'
            + '  <button class="tc-header-btn" id="tcStealthBtn" title="Stealth Mode">○</button>'
            + '  <button class="tc-header-btn" id="tcCloseBtn" title="Close">×</button>'
            + '</div>';
        widget.appendChild(header);

        var params = getParams();
        var content = document.createElement('div');
        content.className = 'tc-content';
        content.innerHTML = ''
            + '<div class="tc-row">'
            + '  <span class="tc-label">Save %</span>'
            + '  <input type="number" id="vaultSaveAmount" min="0" max="1" step="0.01" value="' + params.saveAmount + '">'
            + '</div>'
            + '<div class="tc-row">'
            + '  <span class="tc-label">Big Win Threshold</span>'
            + '  <input type="number" id="vaultBigWinThreshold" min="1" step="0.1" value="' + params.bigWinThreshold + '">'
            + '</div>'
            + '<div class="tc-row">'
            + '  <span class="tc-label">Big Win Multiplier</span>'
            + '  <input type="number" id="vaultBigWinMultiplier" min="1" step="0.1" value="' + params.bigWinMultiplier + '">'
            + '</div>'
            + '<div class="tc-row">'
            + '  <span class="tc-label">Check Interval (sec)</span>'
            + '  <input type="number" id="vaultCheckInterval" min="10" step="1" value="' + params.checkInterval + '">'
            + '</div>'
            + '<div class="tc-row">'
            + '  <span class="tc-label">Share anonymous stats</span>'
            + '  <input type="checkbox" id="vaultAnalyticsOptIn"' + (config.analyticsOptIn ? ' checked' : '') + ' style="accent-color:' + BRAND.colors.primary + '; width:16px; height:16px; cursor:pointer;">'
            + '</div>'
            + '<div class="tc-btn-row">'
            + '  <button class="tc-btn primary" id="vaultStartBtn">Start</button>'
            + '  <button class="tc-btn danger" id="vaultStopBtn" disabled>Stop</button>'
            + '</div>'
            + '<div class="tc-stats">'
            + '  <div class="tc-stat">'
            + '    <span class="tc-stat-label">Vault Balance</span>'
            + '    <span class="tc-stat-value" id="tcVaultBal">0.00</span>'
            + '  </div>'
            + '  <div class="tc-stat">'
            + '    <span class="tc-stat-label">Actions/hr</span>'
            + '    <span class="tc-stat-value" id="tcVaultCount">0/50</span>'
            + '  </div>'
            + '</div>';
        widget.appendChild(content);

        var logToggle = document.createElement('div');
        logToggle.className = 'tc-log-toggle';
        logToggle.innerHTML = ''
            + '<span class="tc-log-toggle-text">Activity Log</span>'
            + '<span class="tc-log-toggle-icon">▼</span>';
        widget.appendChild(logToggle);

        var logPanel = document.createElement('div');
        logPanel.className = 'tc-log';
        logPanel.innerHTML = '<div class="tc-log-inner" id="tcLogInner"><div class="tc-log-empty">No activity yet...</div></div>';
        widget.appendChild(logPanel);

        var logInner = logPanel.querySelector('#tcLogInner');

        logToggle.onclick = function() {
            logToggle.classList.toggle('open');
            logPanel.classList.toggle('open');
        };

        function formatTime(date) {
            var h = date.getHours().toString().padStart(2, '0');
            var m = date.getMinutes().toString().padStart(2, '0');
            var s = date.getSeconds().toString().padStart(2, '0');
            return h + ':' + m + ':' + s;
        }

        function addLogEntry(entry) {
            var empty = logInner.querySelector('.tc-log-empty');
            if (empty) empty.remove();

            var div = document.createElement('div');
            div.className = 'tc-log-entry ' + entry.type;
            div.innerHTML = '<span class="tc-log-time">' + formatTime(entry.time) + '</span><span>' + entry.message + '</span>';
            logInner.insertBefore(div, logInner.firstChild);

            while (logInner.children.length > 20) {
                logInner.removeChild(logInner.lastChild);
            }
        }

        onLogUpdate = addLogEntry;

        var footer = document.createElement('div');
        footer.className = 'tc-footer';
        footer.innerHTML = ''
            + '<a href="' + BRAND.discord + '" target="_blank" class="tc-link">Discord</a>'
            + '<a href="' + BRAND.website + '" target="_blank" class="tc-link">tiltcheck.me</a>'
            + '<span class="tc-footer-sub">Made for Degens. By Degens. <3</span>';
        widget.appendChild(footer);

        var vaultBalEl = content.querySelector('#tcVaultBal');
        vaultDisplay._el = vaultBalEl;
        vaultDisplay.render();

        var statusDot = widget.querySelector('.tc-status-dot');
        var minBtn = widget.querySelector('#tcMinBtn');
        var stealthBtn = widget.querySelector('#tcStealthBtn');
        var closeBtn = widget.querySelector('#tcCloseBtn');

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

        minBtn.onclick = function(e) {
            e.stopPropagation();
            setViewMode(currentViewMode === 'mini' ? 'full' : 'mini');
            minBtn.textContent = currentViewMode === 'mini' ? '+' : '−';
            minBtn.title = currentViewMode === 'mini' ? 'Expand' : 'Minimize';
        };

        stealthBtn.onclick = function(e) {
            e.stopPropagation();
            setViewMode('stealth');
        };

        stealthDot.onclick = function() {
            setViewMode('full');
            minBtn.textContent = '−';
        };

        closeBtn.onclick = function() {
            widget.remove();
            stealthDot.remove();
        };

        var isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
        header.addEventListener('mousedown', function(e) {
            if (e.target.closest('.tc-header-btns')) return;
            isDragging = true;
            dragOffsetX = e.clientX - widget.getBoundingClientRect().left;
            dragOffsetY = e.clientY - widget.getBoundingClientRect().top;
            e.preventDefault();
        });
        document.addEventListener('mousemove', function(e) {
            if (!isDragging) return;
            var newLeft = e.clientX - dragOffsetX;
            var newTop = e.clientY - dragOffsetY;
            newLeft = Math.max(0, Math.min(window.innerWidth - widget.offsetWidth, newLeft));
            newTop = Math.max(0, Math.min(window.innerHeight - widget.offsetHeight, newTop));
            widget.style.left = newLeft + 'px';
            widget.style.top = newTop + 'px';
            widget.style.right = 'auto';
        });
        document.addEventListener('mouseup', function() { isDragging = false; });

        var startBtn = content.querySelector('#vaultStartBtn');
        var stopBtn = content.querySelector('#vaultStopBtn');
        var vaultCountEl = content.querySelector('#tcVaultCount');

        function updateVaultCountUI() {
            var count = getVaultCountLastHour();
            vaultCountEl.textContent = count + '/50';
            vaultCountEl.style.color = count >= 50 ? BRAND.colors.error : count >= 40 ? BRAND.colors.warning : BRAND.colors.primary;
        }
        window.__updateVaultCountUI = updateVaultCountUI;
        updateVaultCountUI();
        setInterval(updateVaultCountUI, 10000);

        function setRunningState(isRunning) {
            statusDot.classList.toggle('running', isRunning);
            stealthDot.classList.toggle('running', isRunning);
            startBtn.disabled = isRunning;
            stopBtn.disabled = !isRunning;
            widget.classList.toggle('running', isRunning);
        }

        startBtn.onclick = function() {
            setRunningState(true);
            startCallback();
            updateVaultCountUI();
        };
        stopBtn.onclick = function() {
            setRunningState(false);
            stopCallback();
            updateVaultCountUI();
        };

        content.querySelector('#vaultSaveAmount').onchange = function() {
            var v = parseFloat(this.value);
            if (isNaN(v) || v < 0) v = 0;
            if (v > 1) v = 1;
            setParams({saveAmount: v});
            this.value = v;
        };
        content.querySelector('#vaultBigWinThreshold').onchange = function() {
            var v = parseFloat(this.value);
            if (isNaN(v) || v < 1) v = 1;
            setParams({bigWinThreshold: v});
            this.value = v;
        };
        content.querySelector('#vaultBigWinMultiplier').onchange = function() {
            var v = parseFloat(this.value);
            if (isNaN(v) || v < 1) v = 1;
            setParams({bigWinMultiplier: v});
            this.value = v;
        };
        content.querySelector('#vaultCheckInterval').onchange = function() {
            var v = parseInt(this.value, 10);
            if (isNaN(v) || v < 10) v = 10;
            setParams({checkInterval: v});
            this.value = v;
        };
        content.querySelector('#vaultAnalyticsOptIn').onchange = function() {
            config.analyticsOptIn = this.checked;
            saveConfig(config);
        };

        document.body.appendChild(widget);

        return {
            setStatus: function(txt, color) {},
            setRunning: setRunningState,
            updateVaultCount: updateVaultCountUI
        };
    }

    // --- Main logic ---
    var vaultInterval = null;
    var vaultDisplay = null;
    var stakeApi = null;
    var activeCurrency = null;
    var apiBalanceInterval = null;
    var oldBalance = 0;
    var isProcessing = false;
    var isInitialized = false;
    var balanceChecks = 0;
    var lastDepositDetected = 0;
    var lastDepositAmount = 0;
    var lastBalance = 0;
    var lastVaultedDeposit = 0;
    var running = false;
    var uiWidget = null;

    function refreshApiBalanceAsync() {
        try {
            if (!stakeApi) stakeApi = new StakeApi();
            var cur = (activeCurrency || getCurrency() || '').toLowerCase();
            if (!cur) return;
            stakeApi.getBalances().then(function(resp) {
                var balances = resp && resp.data && resp.data.user ? resp.data.user.balances : undefined;
                if (!Array.isArray(balances)) return;
                var bal = balances.find(function(x) { return x && x.available && x.available.currency && x.available.currency.toLowerCase() === cur; });
                var amt = bal ? bal.available.amount : undefined;
                var n = typeof amt === 'number' ? amt : parseFloat(amt);
                if (isNaN(n) || n < 0) return;
                if (!getCurrentBalance._api) getCurrentBalance._api = {};
                getCurrentBalance._api[cur] = n;
            });
        } catch (e) {}
    };

    function startApiBalancePolling() {
        if (apiBalanceInterval) clearInterval(apiBalanceInterval);
        apiBalanceInterval = setInterval(refreshApiBalanceAsync, 5000);
        refreshApiBalanceAsync();
    }

    function stopApiBalancePolling() {
        if (apiBalanceInterval) clearInterval(apiBalanceInterval);
        apiBalanceInterval = null;
    }

    function getParams() {
        return {
            saveAmount: SAVE_AMOUNT,
            bigWinThreshold: BIG_WIN_THRESHOLD,
            bigWinMultiplier: BIG_WIN_MULTIPLIER,
            checkInterval: Math.round(CHECK_INTERVAL / 1000)
        };
    }
    function setParams(obj) {
        if (obj.saveAmount !== undefined) SAVE_AMOUNT = obj.saveAmount;
        if (obj.bigWinThreshold !== undefined) BIG_WIN_THRESHOLD = obj.bigWinThreshold;
        if (obj.bigWinMultiplier !== undefined) BIG_WIN_MULTIPLIER = obj.bigWinMultiplier;
        if (obj.checkInterval !== undefined) CHECK_INTERVAL = obj.checkInterval * 1000;

        config = {
            saveAmount: SAVE_AMOUNT,
            bigWinThreshold: BIG_WIN_THRESHOLD,
            bigWinMultiplier: BIG_WIN_MULTIPLIER,
            checkInterval: CHECK_INTERVAL
        };
        saveConfig(config);

        if (running) {
            stopVaultScript();
            startVaultScript();
        }
    }

    function checkCurrencyChange() {
        getCurrency.cached = null;
        getCurrency.cacheTime = null;
        var newCurrency = getCurrency();
        if (newCurrency !== activeCurrency) {
            log('Currency changed: ' + activeCurrency + ' → ' + newCurrency);
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
        var cur = getCurrentBalance();
        if (cur > 0) {
            oldBalance = cur;
            if (!isInitialized && balanceChecks++ >= MIN_BALANCE_CHECKS) {
                isInitialized = true;
                log('Initial balance: ' + oldBalance.toFixed(8) + ' ' + activeCurrency);
            }
        }
    }

    async function processDeposit(amount, isBigWin) {
        if (amount < 1e-8 || isProcessing) return;
        if (!canVaultNow()) {
            logActivity(pickFlavor(FLAVOR.rateLimit), 'warning');
            if (uiWidget && typeof uiWidget.updateVaultCount === "function") uiWidget.updateVaultCount();
            return;
        }
        isProcessing = true;
        var pct = (SAVE_AMOUNT * (isBigWin ? BIG_WIN_MULTIPLIER : 1) * 100).toFixed(0);
        var flavor = pickFlavor(isBigWin ? FLAVOR.bigWin : FLAVOR.profit);
        logActivity(flavor + ' Vaulting ' + pct + '%: ' + amount.toFixed(6) + ' ' + activeCurrency.toUpperCase(), isBigWin ? 'bigwin' : 'profit');
        try {
            var resp = await stakeApi.depositToVault(activeCurrency, amount);
            isProcessing = false;
            if (resp && resp.data && resp.data.createVaultDeposit) {
                vaultDisplay.update(amount);
                vaultActionTimestamps.push(Date.now());
                saveRateLimitData(vaultActionTimestamps);
                oldBalance = getCurrentBalance();
                if (uiWidget && typeof uiWidget.updateVaultCount === "function") uiWidget.updateVaultCount();
                logActivity('Secured ' + amount.toFixed(6) + ' ' + activeCurrency.toUpperCase(), 'success');
            } else {
                logActivity('Vault failed - may be rate limited', 'error');
            }
        } catch (e) {
            isProcessing = false;
            logActivity('Vault error: ' + (e.message || 'unknown'), 'error');
        }
    }

    function initializeBalance() {
        updateCurrentBalance();
        var tries = 0;
        var intv = setInterval(function() {
            updateCurrentBalance();
            if (++tries >= BALANCE_INIT_RETRIES) {
                clearInterval(intv);
                if (oldBalance > 0) {
                    isInitialized = true;
                    log('Initialized with starting balance: ' + oldBalance.toFixed(8) + ' ' + activeCurrency);
                } else {
                    log('Unable to detect starting balance! Using current balance.');
                    var cur = getCurrentBalance();
                    if (cur > 0) {
                        oldBalance = cur;
                        isInitialized = true;
                        log('Last attempt balance: ' + oldBalance.toFixed(8) + ' ' + activeCurrency);
                    }
                }
            }
        }, 1000);
    }

    function detectDepositEvent() {
        var found = false;
        var depositAmount = 0;
        var possibleSelectors = [
            '[data-testid*="notification"]',
            '[class*="notification"]',
            '[class*="transaction"]',
            '[class*="history"]',
            '[class*="activity"]'
        ];
        for (var i = 0; i < possibleSelectors.length; i++) {
            var sel = possibleSelectors[i];
            var nodes = document.querySelectorAll(sel);
            for (var j = 0; j < nodes.length; j++) {
                var node = nodes[j];
                var txt = (node.textContent || '');
                var lower = txt.toLowerCase();
                if (lower.indexOf('deposit') !== -1 && /\d/.test(lower)) {
                    var amt = parseStakeAmount(txt);
                    if (!isNaN(amt) && amt > 0) {
                        depositAmount = amt;
                        found = true;
                        break;
                    }
                }
            }
            if (found) break;
        }
        if (found) {
            lastDepositDetected = Date.now();
            lastDepositAmount = depositAmount;
            return depositAmount;
        }
        return 0;
    }

    function checkBalanceChanges() {
        if (checkCurrencyChange()) return;
        var cur = getCurrentBalance();
        if (!isInitialized) return updateCurrentBalance();

        var depositAmt = detectDepositEvent();
        if (depositAmt > 0) {
            if (cur - lastBalance >= depositAmt * 0.95 && lastVaultedDeposit !== depositAmt) {
                var toVault = depositAmt * SAVE_AMOUNT;
                logActivity(pickFlavor(FLAVOR.deposit) + ' +' + depositAmt.toFixed(4) + ' ' + activeCurrency.toUpperCase(), 'info');
                processDeposit(toVault, false);
                lastVaultedDeposit = depositAmt;
                oldBalance = cur;
            }
        } else if (cur > oldBalance) {
            var profit = cur - oldBalance;
            var isBig = cur > oldBalance * BIG_WIN_THRESHOLD;
            var depAmt = profit * SAVE_AMOUNT * (isBig ? BIG_WIN_MULTIPLIER : 1);
            processDeposit(depAmt, isBig);
            oldBalance = cur;
        } else if (cur < oldBalance) {
            oldBalance = cur;
        }
        lastBalance = cur;
        if (uiWidget && typeof uiWidget.updateVaultCount === "function") uiWidget.updateVaultCount();
    }

    function startVaultScript() {
        if (running) return;
        isScriptInitialized = true;
        running = true;
        sendAnalyticsPing('start');
        logActivity(pickFlavor(FLAVOR.start), 'success');
        logActivity('Watching ' + getCurrency().toUpperCase() + ' on ' + (isStakeUS ? 'Stake.us' : 'Stake.com'), 'info');
        if (!vaultDisplay) vaultDisplay = new VaultDisplay();
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
        vaultActionTimestamps = [];
        initializeBalance();
        vaultInterval = setInterval(checkBalanceChanges, CHECK_INTERVAL);
        if (uiWidget) {
            uiWidget.setStatus('Running', '#00c4a7');
            uiWidget.setRunning(true);
            if (typeof uiWidget.updateVaultCount === "function") uiWidget.updateVaultCount();
        }
    }
    function stopVaultScript() {
        if (!running) return;
        sendAnalyticsPing('stop');
        running = false;
        isScriptInitialized = false;
        if (vaultInterval) clearInterval(vaultInterval);
        vaultInterval = null;
        stopApiBalancePolling();
        if (vaultDisplay) vaultDisplay.reset();
        if (uiWidget) {
            uiWidget.setStatus('Stopped', '#fff');
            uiWidget.setRunning(false);
            if (typeof uiWidget.updateVaultCount === "function") uiWidget.updateVaultCount();
        }
        logActivity(pickFlavor(FLAVOR.stop), 'info');
    }

    // --- UI Widget setup (floaty) ---
    setTimeout(function() {
        if (!uiWidget) {
            if (!vaultDisplay) vaultDisplay = new VaultDisplay();
            uiWidget = createVaultFloatyUI(
                startVaultScript,
                stopVaultScript,
                getParams,
                setParams,
                vaultDisplay
            );
            vaultDisplay.setCurrency(getCurrency());
        }
    }, INIT_DELAY);

})();
