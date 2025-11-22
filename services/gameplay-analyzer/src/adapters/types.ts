import { ulid } from 'ulid';

export interface NormalizedSpinEvent {
  id: string;
  ts: number;
  bet: number;
  payout: number;
  symbols?: string[];
  raw?: any;
}

type AdapterFn = (raw: any) => NormalizedSpinEvent;

// Specific casino adapters (heuristic mappings). Replace with precise schemas when available.
const stakeAdapter: AdapterFn = (raw) => {
  // Expected fields (hypothetical): roundId, createdAt, wager, payout, symbols[]
  return {
    id: (raw.roundId || raw.round_id || ulid()).toString(),
    ts: parseTimestamp(raw.createdAt || raw.created_at || raw.ts),
    bet: parseNumber(raw.wager),
    payout: parseNumber(raw.payout),
    symbols: Array.isArray(raw.symbols) ? raw.symbols.map((s: any)=>String(s)) : undefined,
    raw
  };
};

const rollbitAdapter: AdapterFn = (raw) => {
  // Expected fields (hypothetical): id, time, amountBet, amountWon, grid[]
  let payout = parseNumber(raw.amountWon);
  if (!payout && raw.multiplier && raw.amountBet) payout = parseNumber(raw.amountBet) * parseNumber(raw.multiplier);
  return {
    id: (raw.id || ulid()).toString(),
    ts: parseTimestamp(raw.time || raw.timestamp),
    bet: parseNumber(raw.amountBet),
    payout,
    symbols: Array.isArray(raw.grid) ? raw.grid.map((g: any)=>String(g)) : undefined,
    raw
  };
};

const adapters: Record<string, AdapterFn> = {
  'stake': stakeAdapter,
  'rollbit': rollbitAdapter,
};

// Heuristic extraction helpers
function pick(props: string[], src: any): any {
  for (const p of props) {
    if (src == null) continue;
    if (src[p] !== undefined && src[p] !== null) return src[p];
  }
  return undefined;
}

function parseNumber(v: any): number {
  if (v === undefined || v === null || v === '') return 0;
  if (typeof v === 'number') return v;
  const cleaned = String(v).replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function parseTimestamp(raw: any): number {
  if (raw === undefined || raw === null) return Date.now();
  if (typeof raw === 'number') {
    // Heuristic: if it's seconds (10 digits) convert to ms
    if (raw < 2e10) return raw * 1000; // treat as seconds
    return raw;
  }
  if (typeof raw === 'string') {
    const asNum = parseFloat(raw);
    if (!isNaN(asNum) && asNum > 1000000) {
      // Could be seconds or ms
      if (asNum < 2e10) return asNum * 1000; // seconds
      return asNum; // ms epoch
    }
    const dt = Date.parse(raw);
    if (!isNaN(dt)) return dt;
  }
  return Date.now();
}

function fallbackNormalize(raw: any): NormalizedSpinEvent {
  const id = (pick(['id','spin_id','roundId','round_id'], raw) || ulid()).toString();
  const ts = parseTimestamp(pick(['ts','time','timestamp','created_at'], raw));
  const bet = parseNumber(pick(['bet','wager','stake','amountBet','amount_bet'], raw));
  let payout = parseNumber(pick(['payout','win','amountWon','amount_won','profit'], raw));
  // If payout missing but multiplier present compute payout = bet * multiplier
  if (!payout && bet) {
    const mult = parseNumber(pick(['mult','multiplier','x','factor'], raw));
    if (mult) payout = bet * mult;
  }
  const symbolsRaw = pick(['symbols','reels','grid','board'], raw);
  let symbols: string[] | undefined = undefined;
  if (Array.isArray(symbolsRaw)) symbols = symbolsRaw.map(x => String(x));
  return { id, ts, bet, payout, symbols, raw };
}

export function normalizeSpinEvent(raw: any, casinoId: string): NormalizedSpinEvent {
  const adapter = adapters[casinoId];
  try {
    if (adapter) return adapter(raw);
    return fallbackNormalize(raw);
  } catch (e) {
    console.warn('[Adapters] Failed to normalize spin via adapter; using fallback', e);
    return fallbackNormalize(raw);
  }
}

export function registerCasinoAdapter(casinoId: string, fn: AdapterFn) {
  adapters[casinoId] = fn;
}

export function listAdapters() {
  return Object.keys(adapters);
}/**
 * Casino Adapter Interface
 * Defines contract for parsing casino-specific CSV formats into normalized spin records
 */

export interface SpinRecordRaw {
  spin_id?: string;
  ts?: string;
  bet: string;
  win: string;
  outcome?: string;
}

export interface SpinRecordNormalized {
  id: string;
  ts: number; // epoch ms
  bet: number;
  win: number;
  outcome?: string;
}

export interface CasinoAdapter {
  /** Unique identifier for this casino */
  id: string;
  
  /** Human-readable name */
  name: string;
  
  /** Expected CSV delimiter (default: auto-detect) */
  delimiter?: string;
  
  /** Column name mappings: adapter field → CSV column name */
  columnMap: {
    spin_id?: string | string[];
    ts?: string | string[];
    bet: string | string[];
    win: string | string[];
    outcome?: string | string[];
  };
  
  /**
   * Parse raw CSV row values into normalized spin
   * @param row Key-value pairs from CSV (headers already parsed)
   */
  parse(row: Record<string, string>): SpinRecordNormalized;
  
  /**
   * Validate row before parsing (optional)
   * @returns true if valid, false to skip row
   */
  validate?(row: Record<string, string>): boolean;
  
  /**
   * Detect if this adapter should handle given CSV headers
   * @param headers Array of column names from first row
   */
  matchHeaders?(headers: string[]): boolean;
}

export interface AdapterRegistry {
  register(adapter: CasinoAdapter): void;
  get(casinoId: string): CasinoAdapter | undefined;
  detect(headers: string[]): CasinoAdapter | undefined;
  list(): CasinoAdapter[];
}
