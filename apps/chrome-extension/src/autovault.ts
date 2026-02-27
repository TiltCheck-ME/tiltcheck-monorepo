/**
 * AutoVault Engine for Stake.com
 *
 * Automatically vaults a percentage of profits to protect winnings.
 * Ported from the Tampermonkey autovaulter script by Ruby (stakestats.net).
 * Uses Stake's native GraphQL API via session cookie.
 */

// --- Types ---

export interface AutoVaultConfig {
  saveAmount: number;       // 0-1, default 0.1 (10%)
  bigWinThreshold: number;  // multiplier threshold, default 5
  bigWinMultiplier: number; // vault multiplier for big wins, default 3
  checkInterval: number;    // seconds, default 90
}

export interface LogEntry {
  time: Date;
  message: string;
  type: 'info' | 'success' | 'warning' | 'profit' | 'bigwin' | 'error';
}

export interface AutoVaultCallbacks {
  onLogEntry: (entry: LogEntry) => void;
  onVaultCountUpdate: (count: number, max: number) => void;
  onVaultedUpdate: (amount: number, currency: string) => void;
  onRunningChange: (running: boolean) => void;
}

// --- Constants ---

const STAKE_DOMAINS = [
  'stake.com', 'stake.bet', 'stake.games',
  'staketr.com', 'staketr2.com', 'staketr3.com', 'staketr4.com',
  'stake.bz', 'stake.us', 'stake.pet'
];

const DEFAULT_CONFIG: AutoVaultConfig = {
  saveAmount: 0.1,
  bigWinThreshold: 5,
  bigWinMultiplier: 3,
  checkInterval: 90,
};

const MIN_BALANCE_CHECKS = 2;
const DEPOSIT_VAULT_PERCENTAGE = 0.2;
const CURRENCY_CACHE_TIMEOUT = 5000;
const BALANCE_INIT_RETRIES = 5;
const RATE_LIMIT_MAX = 50;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

const DEFAULT_CURRENCY = 'bnb';
const DEFAULT_US_CURRENCY = 'sc';

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

const FLAVOR = {
  profit: ['Positive difference,', 'Profit detected'],
  bigWin: ['Big win detected', 'Large profit'],
  deposit: ['Deposit detected'],
  start: ['AutoVault started', 'Monitoring active'],
  stop: ['AutoVault stopped', 'Monitoring paused'],
  rateLimit: [
    'Rate limited, vaulting paused. Please wait until it resets',
    'Limit reached, vaulting paused. Please wait until it resets'
  ]
};

// --- Helpers ---

export function isStakeDomain(hostname?: string): boolean {
  const h = (hostname || window.location.hostname).toLowerCase();
  return STAKE_DOMAINS.some(d => h === d || h.endsWith('.' + d));
}

function isStakeUS(hostname?: string): boolean {
  return (hostname || window.location.hostname).toLowerCase().endsWith('.us');
}

function pickFlavor(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getCookie(name: string): string {
  const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
  return m ? m.pop()!.replace(/"/g, '') : '';
}

export function parseStakeAmount(text: string | null | undefined): number {
  if (!text) return NaN;
  const raw = String(text).replace(/\u00a0/g, ' ').trim();
  if (!raw) return NaN;
  if (/[•*]+/.test(raw)) return NaN;

  const m = raw.match(/[-+]?\d[\d\s,.'']*(?:[.,]\d+)?[kmbt]?/i);
  if (!m) return NaN;

  let token = m[0].trim();
  const suffixMatch = token.match(/[kmbt]$/i);
  const suffix = suffixMatch ? suffixMatch[0].toLowerCase() : '';
  token = token.replace(/[kmbt]$/i, '').trim();
  token = token.replace(/[\s'']/g, '');

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

// --- StakeApi ---

class StakeApi {
  private apiUrl: string;
  private headers: Record<string, string>;

  constructor() {
    this.apiUrl = window.location.origin + '/_api/graphql';
    const accessToken = getCookie('session');
    this.headers = {
      'content-type': 'application/json',
      'x-access-token': accessToken,
      'x-language': 'en'
    };
  }

  private async call(body: string, opName?: string): Promise<any> {
    const headers: Record<string, string> = { ...this.headers };
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
      if (!res.ok) {
        return { error: true, status: res.status, message: res.statusText };
      }
      return res.json();
    } catch (e: any) {
      return { error: true, message: e.message, type: 'network' };
    }
  }

  async getBalances(): Promise<any> {
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

  async depositToVault(currency: string, amount: number): Promise<any> {
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
      variables: { currency, amount }
    };
    return this.call(JSON.stringify(q), 'CreateVaultDeposit');
  }
}

// --- Currency Detection ---

let currencyCache: { value: string; time: number } | null = null;

function detectCurrencyFromBalanceBar(): string | null {
  const el =
    document.querySelector('[data-testid="coin-toggle"]') ||
    document.querySelector('[data-testid="balance-toggle"]');
  if (!el) return null;
  const txt = (el.textContent || '').trim();
  const m = txt.match(/\b[A-Z]{2,5}\b/);
  return m ? m[0].toLowerCase() : null;
}

function getCurrency(): string {
  const now = Date.now();
  if (currencyCache && (now - currencyCache.time < CURRENCY_CACHE_TIMEOUT)) {
    return currencyCache.value;
  }

  const el = document.querySelector('[data-active-currency]');
  if (el) {
    const c = el.getAttribute('data-active-currency');
    if (c) {
      currencyCache = { value: c.toLowerCase(), time: now };
      return currencyCache.value;
    }
  }

  const fromBar = detectCurrencyFromBalanceBar();
  if (fromBar) {
    currencyCache = { value: fromBar, time: now };
    return fromBar;
  }

  const defaultCurr = isStakeUS() ? DEFAULT_US_CURRENCY : DEFAULT_CURRENCY;
  currencyCache = { value: defaultCurr, time: now };
  return defaultCurr;
}

// --- Balance Reading ---

let apiBalanceCache: Record<string, number> = {};
let workingSelector: string | null = null;
let lastKnownBalance = 0;
let balanceWarned = false;

function getCurrentBalance(activeCurrency: string): number {
  const curCode = activeCurrency.toLowerCase();
  const uiCode = (detectCurrencyFromBalanceBar() || '').toLowerCase();

  // If UI shows a different currency, use API cache
  if (curCode && uiCode && uiCode !== curCode) {
    const apiVal = apiBalanceCache[curCode];
    if (typeof apiVal === 'number' && apiVal >= 0) return apiVal;
  }

  for (const selector of BALANCE_SELECTORS) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        const val = parseStakeAmount(el.textContent);
        if (!isNaN(val) && val >= 0) {
          if (workingSelector !== selector) {
            workingSelector = selector;
          }
          lastKnownBalance = val;
          return val;
        }
      }
    } catch {
      // continue
    }
  }

  // Fallback to API cache
  if (curCode) {
    const apiVal = apiBalanceCache[curCode];
    if (typeof apiVal === 'number' && apiVal >= 0) return apiVal;
  }

  if (!balanceWarned) {
    balanceWarned = true;
  }

  return lastKnownBalance || 0;
}

// --- Rate Limiting ---

function loadRateLimitData(): number[] {
  const saved = sessionStorage.getItem('autovault-ratelimit');
  if (saved) {
    try {
      const data: number[] = JSON.parse(saved);
      return data.filter(ts => Date.now() - ts < RATE_LIMIT_WINDOW);
    } catch {
      // ignore
    }
  }
  return [];
}

function saveRateLimitData(timestamps: number[]): void {
  sessionStorage.setItem('autovault-ratelimit', JSON.stringify(timestamps));
}

// --- AutoVault Engine ---

export class AutoVaultEngine {
  private config: AutoVaultConfig;
  private callbacks: AutoVaultCallbacks;
  private running = false;
  private stakeApi: StakeApi | null = null;
  private activeCurrency = '';
  private oldBalance = 0;
  private lastBalance = 0;
  private isProcessing = false;
  private isInitialized = false;
  private balanceChecks = 0;
  private lastDepositDetected = 0;
  private lastDepositAmount = 0;
  private lastVaultedDeposit = 0;
  private vaultInterval: ReturnType<typeof setInterval> | null = null;
  private apiBalanceInterval: ReturnType<typeof setInterval> | null = null;
  private vaultCountInterval: ReturnType<typeof setInterval> | null = null;
  private vaultActionTimestamps: number[] = [];
  private sessionVaulted = 0;

  constructor(callbacks: AutoVaultCallbacks) {
    this.callbacks = callbacks;
    this.config = { ...DEFAULT_CONFIG };
    this.loadConfig();
  }

  // --- Config persistence ---

  private loadConfig(): void {
    // Try chrome.storage.local first, fall back to sync load from localStorage
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.get(['autovault-config'], (result) => {
        if (result['autovault-config']) {
          try {
            const saved = result['autovault-config'];
            this.config = { ...DEFAULT_CONFIG, ...saved };
          } catch {
            // use defaults
          }
        }
      });
    } else {
      // Fallback for when chrome.storage is unavailable
      const saved = localStorage.getItem('autovault-config');
      if (saved) {
        try {
          this.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
        } catch {
          // use defaults
        }
      }
    }
  }

  private saveConfig(): void {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      chrome.storage.local.set({ 'autovault-config': this.config });
    } else {
      localStorage.setItem('autovault-config', JSON.stringify(this.config));
    }
  }

  // --- Session vaulted tracking ---

  private sessionStorageKey(): string {
    return `autovault-vaulted-session:${this.activeCurrency}`;
  }

  private loadSessionVaulted(): void {
    try {
      const raw = sessionStorage.getItem(this.sessionStorageKey());
      const v = parseFloat(raw || '0');
      this.sessionVaulted = !isNaN(v) && v >= 0 ? v : 0;
    } catch {
      this.sessionVaulted = 0;
    }
  }

  private saveSessionVaulted(): void {
    try {
      sessionStorage.setItem(this.sessionStorageKey(), String(this.sessionVaulted));
    } catch {
      // ignore
    }
  }

  // --- Logging ---

  private log(message: string, type: LogEntry['type'] = 'info'): void {
    const entry: LogEntry = { time: new Date(), message, type };
    this.callbacks.onLogEntry(entry);
  }

  // --- API balance polling ---

  private async refreshApiBalance(): Promise<void> {
    try {
      if (!this.stakeApi) this.stakeApi = new StakeApi();
      const cur = this.activeCurrency.toLowerCase();
      if (!cur) return;
      const resp = await this.stakeApi.getBalances();
      const balances = resp?.data?.user?.balances;
      if (!Array.isArray(balances)) return;
      const bal = balances.find((x: any) => x?.available?.currency?.toLowerCase() === cur);
      const amt = bal?.available?.amount;
      const n = typeof amt === 'number' ? amt : parseFloat(amt);
      if (!isNaN(n) && n >= 0) {
        apiBalanceCache[cur] = n;
      }
    } catch {
      // ignore
    }
  }

  private startApiBalancePolling(): void {
    if (this.apiBalanceInterval) clearInterval(this.apiBalanceInterval);
    this.apiBalanceInterval = setInterval(() => this.refreshApiBalance(), 5000);
    this.refreshApiBalance();
  }

  private stopApiBalancePolling(): void {
    if (this.apiBalanceInterval) clearInterval(this.apiBalanceInterval);
    this.apiBalanceInterval = null;
  }

  // --- Rate limiting ---

  private canVaultNow(): boolean {
    const now = Date.now();
    this.vaultActionTimestamps = this.vaultActionTimestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
    saveRateLimitData(this.vaultActionTimestamps);
    return this.vaultActionTimestamps.length < RATE_LIMIT_MAX;
  }

  private getVaultCountLastHour(): number {
    const now = Date.now();
    this.vaultActionTimestamps = this.vaultActionTimestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
    return this.vaultActionTimestamps.length;
  }

  // --- Currency change detection ---

  private checkCurrencyChange(): boolean {
    currencyCache = null;
    const newCurrency = getCurrency();
    if (newCurrency !== this.activeCurrency) {
      this.log(`Currency changed: ${this.activeCurrency} → ${newCurrency}`, 'info');
      this.activeCurrency = newCurrency;
      this.startApiBalancePolling();
      this.loadSessionVaulted();
      this.sessionVaulted = 0;
      this.saveSessionVaulted();
      this.isInitialized = false;
      this.balanceChecks = 0;
      this.updateCurrentBalance();
      this.callbacks.onVaultedUpdate(this.sessionVaulted, this.activeCurrency);
      return true;
    }
    return false;
  }

  // --- Balance tracking ---

  private updateCurrentBalance(): void {
    const cur = getCurrentBalance(this.activeCurrency);
    if (cur > 0) {
      this.oldBalance = cur;
      if (!this.isInitialized && this.balanceChecks++ >= MIN_BALANCE_CHECKS) {
        this.isInitialized = true;
        this.log(`Initial balance: ${this.oldBalance.toFixed(8)} ${this.activeCurrency.toUpperCase()}`, 'info');
      }
    }
  }

  private initializeBalance(): void {
    this.updateCurrentBalance();
    let tries = 0;
    const intv = setInterval(() => {
      if (!this.running) { clearInterval(intv); return; }
      this.updateCurrentBalance();
      if (++tries >= BALANCE_INIT_RETRIES) {
        clearInterval(intv);
        if (this.oldBalance > 0) {
          this.isInitialized = true;
          this.log(`Initialized with starting balance: ${this.oldBalance.toFixed(8)} ${this.activeCurrency}`, 'info');
        } else {
          const cur = getCurrentBalance(this.activeCurrency);
          if (cur > 0) {
            this.oldBalance = cur;
            this.isInitialized = true;
            this.log(`Last attempt balance: ${this.oldBalance.toFixed(8)} ${this.activeCurrency}`, 'info');
          } else {
            this.log('Unable to detect starting balance', 'warning');
          }
        }
      }
    }, 1000);
  }

  // --- Deposit detection ---

  private detectDepositEvent(): number {
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
            this.lastDepositDetected = Date.now();
            this.lastDepositAmount = amt;
            return amt;
          }
        }
      }
    }
    return 0;
  }

  // --- Vault deposit execution ---

  private async processDeposit(amount: number, isBigWin: boolean): Promise<void> {
    if (amount < 1e-8 || this.isProcessing) return;
    if (!this.canVaultNow()) {
      this.log(pickFlavor(FLAVOR.rateLimit), 'warning');
      this.callbacks.onVaultCountUpdate(this.getVaultCountLastHour(), RATE_LIMIT_MAX);
      return;
    }

    this.isProcessing = true;
    const pct = (this.config.saveAmount * (isBigWin ? this.config.bigWinMultiplier : 1) * 100).toFixed(0);
    const flavor = pickFlavor(isBigWin ? FLAVOR.bigWin : FLAVOR.profit);
    this.log(`${flavor} Vaulting ${pct}%: ${amount.toFixed(6)} ${this.activeCurrency.toUpperCase()}`, isBigWin ? 'bigwin' : 'profit');

    try {
      if (!this.stakeApi) this.stakeApi = new StakeApi();
      const resp = await this.stakeApi.depositToVault(this.activeCurrency, amount);
      this.isProcessing = false;

      if (resp?.data?.createVaultDeposit) {
        this.sessionVaulted += amount;
        this.saveSessionVaulted();
        this.vaultActionTimestamps.push(Date.now());
        saveRateLimitData(this.vaultActionTimestamps);
        this.oldBalance = getCurrentBalance(this.activeCurrency);
        this.callbacks.onVaultCountUpdate(this.getVaultCountLastHour(), RATE_LIMIT_MAX);
        this.callbacks.onVaultedUpdate(this.sessionVaulted, this.activeCurrency);
        this.log(`Secured ${amount.toFixed(6)} ${this.activeCurrency.toUpperCase()}`, 'success');
      } else {
        this.log('Vault failed - may be rate limited', 'error');
      }
    } catch (e: any) {
      this.isProcessing = false;
      this.log('Vault error: ' + (e.message || 'unknown'), 'error');
    }
  }

  // --- Main balance check loop ---

  private checkBalanceChanges(): void {
    if (this.checkCurrencyChange()) return;
    const cur = getCurrentBalance(this.activeCurrency);

    if (!this.isInitialized) {
      this.updateCurrentBalance();
      return;
    }

    const depositAmt = this.detectDepositEvent();
    if (depositAmt > 0) {
      if (cur - this.lastBalance >= depositAmt * 0.95 && this.lastVaultedDeposit !== depositAmt) {
        const toVault = depositAmt * this.config.saveAmount;
        this.log(`${pickFlavor(FLAVOR.deposit)} +${depositAmt.toFixed(4)} ${this.activeCurrency.toUpperCase()}`, 'info');
        this.processDeposit(toVault, false);
        this.lastVaultedDeposit = depositAmt;
        this.oldBalance = cur;
      }
    } else if (cur > this.oldBalance) {
      const profit = cur - this.oldBalance;
      const isBig = cur > this.oldBalance * this.config.bigWinThreshold;
      const depAmt = profit * this.config.saveAmount * (isBig ? this.config.bigWinMultiplier : 1);
      this.processDeposit(depAmt, isBig);
      this.oldBalance = cur;
    } else if (cur < this.oldBalance) {
      this.oldBalance = cur;
    }

    this.lastBalance = cur;
    this.callbacks.onVaultCountUpdate(this.getVaultCountLastHour(), RATE_LIMIT_MAX);
  }

  // --- Public API ---

  start(): void {
    if (this.running) return;
    this.running = true;

    this.stakeApi = new StakeApi();
    this.activeCurrency = getCurrency();
    this.startApiBalancePolling();
    this.loadSessionVaulted();
    this.sessionVaulted = 0;
    this.saveSessionVaulted();
    this.oldBalance = 0;
    this.isProcessing = false;
    this.isInitialized = false;
    this.balanceChecks = 0;
    this.lastDepositDetected = 0;
    this.lastDepositAmount = 0;
    this.lastBalance = getCurrentBalance(this.activeCurrency);
    this.lastVaultedDeposit = 0;
    this.vaultActionTimestamps = loadRateLimitData();

    this.initializeBalance();
    this.vaultInterval = setInterval(() => this.checkBalanceChanges(), this.config.checkInterval * 1000);

    // Periodic vault count UI update
    this.vaultCountInterval = setInterval(() => {
      this.callbacks.onVaultCountUpdate(this.getVaultCountLastHour(), RATE_LIMIT_MAX);
    }, 10000);

    this.callbacks.onRunningChange(true);
    this.callbacks.onVaultedUpdate(this.sessionVaulted, this.activeCurrency);
    this.callbacks.onVaultCountUpdate(this.getVaultCountLastHour(), RATE_LIMIT_MAX);

    this.log(pickFlavor(FLAVOR.start), 'success');
    this.log(`Watching ${this.activeCurrency.toUpperCase()} on ${isStakeUS() ? 'Stake.us' : 'Stake.com'}`, 'info');
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.vaultInterval) clearInterval(this.vaultInterval);
    this.vaultInterval = null;
    if (this.vaultCountInterval) clearInterval(this.vaultCountInterval);
    this.vaultCountInterval = null;
    this.stopApiBalancePolling();

    this.callbacks.onRunningChange(false);
    this.log(pickFlavor(FLAVOR.stop), 'info');
  }

  isRunning(): boolean {
    return this.running;
  }

  getConfig(): AutoVaultConfig {
    return { ...this.config };
  }

  setConfig(partial: Partial<AutoVaultConfig>): void {
    this.config = { ...this.config, ...partial };
    this.saveConfig();

    // Restart interval if running and checkInterval changed
    if (this.running && partial.checkInterval !== undefined) {
      this.stop();
      this.start();
    }
  }

  getSessionVaulted(): number {
    return this.sessionVaulted;
  }

  getActiveCurrency(): string {
    return this.activeCurrency || getCurrency();
  }
}
