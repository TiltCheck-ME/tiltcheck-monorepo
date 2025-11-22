import { ulid } from 'ulid';
// Specific casino adapters (heuristic mappings). Replace with precise schemas when available.
const stakeAdapter = (raw) => {
    // Expected fields (hypothetical): roundId, createdAt, wager, payout, symbols[]
    return {
        id: (raw.roundId || raw.round_id || ulid()).toString(),
        ts: parseTimestamp(raw.createdAt || raw.created_at || raw.ts),
        bet: parseNumber(raw.wager),
        payout: parseNumber(raw.payout),
        symbols: Array.isArray(raw.symbols) ? raw.symbols.map((s) => String(s)) : undefined,
        raw
    };
};
const rollbitAdapter = (raw) => {
    // Expected fields (hypothetical): id, time, amountBet, amountWon, grid[]
    let payout = parseNumber(raw.amountWon);
    if (!payout && raw.multiplier && raw.amountBet)
        payout = parseNumber(raw.amountBet) * parseNumber(raw.multiplier);
    return {
        id: (raw.id || ulid()).toString(),
        ts: parseTimestamp(raw.time || raw.timestamp),
        bet: parseNumber(raw.amountBet),
        payout,
        symbols: Array.isArray(raw.grid) ? raw.grid.map((g) => String(g)) : undefined,
        raw
    };
};
const adapters = {
    'stake': stakeAdapter,
    'rollbit': rollbitAdapter,
};
// Heuristic extraction helpers
function pick(props, src) {
    for (const p of props) {
        if (src == null)
            continue;
        if (src[p] !== undefined && src[p] !== null)
            return src[p];
    }
    return undefined;
}
function parseNumber(v) {
    if (v === undefined || v === null || v === '')
        return 0;
    if (typeof v === 'number')
        return v;
    const cleaned = String(v).replace(/[^0-9.-]/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
}
function parseTimestamp(raw) {
    if (raw === undefined || raw === null)
        return Date.now();
    if (typeof raw === 'number') {
        // Heuristic: if it's seconds (10 digits) convert to ms
        if (raw < 2e10)
            return raw * 1000; // treat as seconds
        return raw;
    }
    if (typeof raw === 'string') {
        const asNum = parseFloat(raw);
        if (!isNaN(asNum) && asNum > 1000000) {
            // Could be seconds or ms
            if (asNum < 2e10)
                return asNum * 1000; // seconds
            return asNum; // ms epoch
        }
        const dt = Date.parse(raw);
        if (!isNaN(dt))
            return dt;
    }
    return Date.now();
}
function fallbackNormalize(raw) {
    const id = (pick(['id', 'spin_id', 'roundId', 'round_id'], raw) || ulid()).toString();
    const ts = parseTimestamp(pick(['ts', 'time', 'timestamp', 'created_at'], raw));
    const bet = parseNumber(pick(['bet', 'wager', 'stake', 'amountBet', 'amount_bet'], raw));
    let payout = parseNumber(pick(['payout', 'win', 'amountWon', 'amount_won', 'profit'], raw));
    // If payout missing but multiplier present compute payout = bet * multiplier
    if (!payout && bet) {
        const mult = parseNumber(pick(['mult', 'multiplier', 'x', 'factor'], raw));
        if (mult)
            payout = bet * mult;
    }
    const symbolsRaw = pick(['symbols', 'reels', 'grid', 'board'], raw);
    let symbols = undefined;
    if (Array.isArray(symbolsRaw))
        symbols = symbolsRaw.map(x => String(x));
    return { id, ts, bet, payout, symbols, raw };
}
export function normalizeSpinEvent(raw, casinoId) {
    const adapter = adapters[casinoId];
    try {
        if (adapter)
            return adapter(raw);
        return fallbackNormalize(raw);
    }
    catch (e) {
        console.warn('[Adapters] Failed to normalize spin via adapter; using fallback', e);
        return fallbackNormalize(raw);
    }
}
export function registerCasinoAdapter(casinoId, fn) {
    adapters[casinoId] = fn;
}
export function listAdapters() {
    return Object.keys(adapters);
} /**
 * Casino Adapter Interface
 * Defines contract for parsing casino-specific CSV formats into normalized spin records
 */
