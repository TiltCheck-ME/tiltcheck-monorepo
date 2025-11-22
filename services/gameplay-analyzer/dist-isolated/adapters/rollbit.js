import { ulid } from 'ulid';
function parseNumber(val, fallback = 0) {
    if (!val)
        return fallback;
    const cleaned = val.replace(/[^0-9.-]/g, '');
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : fallback;
}
function parseTimestamp(val) {
    if (!val)
        return Date.now();
    const num = Number(val);
    if (Number.isFinite(num)) {
        return num < 1e12 ? num * 1000 : num;
    }
    const parsed = Date.parse(val);
    return isNaN(parsed) ? Date.now() : parsed;
}
function getColumnValue(row, keys) {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    for (const key of keyArray) {
        const normalized = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
        if (normalized && row[normalized])
            return row[normalized];
    }
    return undefined;
}
export const rollbitAdapter = {
    id: 'rollbit',
    name: 'Rollbit',
    delimiter: ',',
    columnMap: {
        spin_id: ['bet_id', 'id', 'transaction_id'],
        ts: ['created_at', 'timestamp', 'date'],
        bet: ['bet_amount', 'stake', 'wager'],
        win: ['win_amount', 'payout', 'profit'],
        outcome: ['result', 'outcome'],
    },
    matchHeaders(headers) {
        return headers.includes('bet_id') ||
            (headers.includes('bet_amount') && headers.includes('win_amount'));
    },
    validate(row) {
        const bet = parseNumber(getColumnValue(row, this.columnMap.bet));
        const win = parseNumber(getColumnValue(row, this.columnMap.win));
        if (bet < 0)
            return false;
        if (win < 0)
            return false;
        if (win > bet * 10000)
            return false;
        return true;
    },
    parse(row) {
        const spinId = getColumnValue(row, this.columnMap.spin_id);
        const ts = getColumnValue(row, this.columnMap.ts);
        const bet = getColumnValue(row, this.columnMap.bet);
        const win = getColumnValue(row, this.columnMap.win);
        const outcome = getColumnValue(row, this.columnMap.outcome);
        return {
            id: spinId?.trim() || ulid(),
            ts: parseTimestamp(ts),
            bet: parseNumber(bet),
            win: parseNumber(win),
            outcome: outcome?.trim(),
        };
    },
};
