// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
/**
 * vault-rule-engine.ts
 * Evaluates active vault rules against incoming win events and
 * returns vault action recommendations.
 */

export type VaultRuleType =
  | 'percent_of_win'
  | 'fixed_per_threshold'
  | 'balance_ceiling'
  | 'session_profit_lock';

export type VaultRuleCasinoTarget =
  | 'all'
  | 'stake'
  | 'roobet'
  | 'bcgame'
  | 'rollbit'
  | 'gamdom'
  | 'shuffle';

export interface VaultRule {
  id: string;
  user_id: string;
  type: VaultRuleType;
  enabled: boolean;
  casino: VaultRuleCasinoTarget;
  percent?: number | null;
  fixed_amount?: number | null;
  threshold_amount?: number | null;
  ceiling_amount?: number | null;
  profit_target?: number | null;
  min_win_amount?: number | null;
  cooldown_ms?: number | null;
  label?: string | null;
}

export interface CasinoWinEvent {
  casino: string;
  game_id?: string;
  win_amount: number;
  balance_after: number;
  session_profit: number;
  currency: string;
  timestamp: number;
}

export interface VaultActionResult {
  rule_id: string;
  rule_label: string | null;
  vault_amount: number;
  reason: string;
  currency: string;
}

interface RuleState {
  running_total: number;
  last_vault_ts: number;
}

const STORAGE_KEY = 'vault_rule_state';

async function loadState(): Promise<Record<string, RuleState>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEY, (data) => {
      resolve((data[STORAGE_KEY] as Record<string, RuleState>) ?? {});
    });
  });
}

async function saveState(state: Record<string, RuleState>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: state }, resolve);
  });
}

function casinoMatches(ruleCasino: VaultRuleCasinoTarget, eventCasino: string): boolean {
  if (ruleCasino === 'all') return true;
  return eventCasino.toLowerCase().includes(ruleCasino);
}

function cooldownOk(state: RuleState | undefined, cooldownMs: number | null | undefined, now: number): boolean {
  if (!cooldownMs || !state) return true;
  return now - (state.last_vault_ts ?? 0) >= cooldownMs;
}

export class VaultRuleEngine {
  private rules: VaultRule[];

  constructor(rules: VaultRule[]) {
    this.rules = rules.filter((r) => r.enabled);
  }

  updateRules(rules: VaultRule[]): void {
    this.rules = rules.filter((r) => r.enabled);
  }

  async evaluate(event: CasinoWinEvent): Promise<VaultActionResult[]> {
    const now = event.timestamp || Date.now();
    const state = await loadState();
    const results: VaultActionResult[] = [];

    for (const rule of this.rules) {
      if (!casinoMatches(rule.casino, event.casino)) continue;
      if (rule.min_win_amount && event.win_amount < rule.min_win_amount) continue;
      if (!cooldownOk(state[rule.id], rule.cooldown_ms, now)) continue;

      let vault_amount = 0;
      let reason = '';

      switch (rule.type) {
        case 'percent_of_win': {
          if (!rule.percent) break;
          vault_amount = +(event.win_amount * (rule.percent / 100)).toFixed(8);
          reason = `${rule.percent}% of ${event.win_amount} ${event.currency} win`;
          break;
        }

        case 'fixed_per_threshold': {
          if (!rule.fixed_amount || !rule.threshold_amount) break;
          const ruleState = state[rule.id] ?? { running_total: 0, last_vault_ts: 0 };
          ruleState.running_total += event.win_amount;
          if (ruleState.running_total >= rule.threshold_amount) {
            vault_amount = rule.fixed_amount;
            reason = `Fixed $${rule.fixed_amount} after $${rule.threshold_amount} cumulative wins`;
            ruleState.running_total = 0;
          }
          state[rule.id] = ruleState;
          break;
        }

        case 'balance_ceiling': {
          if (!rule.ceiling_amount) break;
          const excess = event.balance_after - rule.ceiling_amount;
          if (excess > 0) {
            vault_amount = +excess.toFixed(8);
            reason = `Balance $${event.balance_after} exceeds ceiling $${rule.ceiling_amount}`;
          }
          break;
        }

        case 'session_profit_lock': {
          if (!rule.profit_target) break;
          if (event.session_profit >= rule.profit_target) {
            vault_amount = +event.session_profit.toFixed(8);
            reason = `Session profit $${event.session_profit} hit target $${rule.profit_target}`;
          }
          break;
        }
      }

      if (vault_amount > 0) {
        state[rule.id] = {
          ...(state[rule.id] ?? { running_total: 0 }),
          last_vault_ts: now,
        };
        results.push({
          rule_id: rule.id,
          rule_label: rule.label ?? null,
          vault_amount,
          reason,
          currency: event.currency,
        });
      }
    }

    await saveState(state);
    return results;
  }

  async resetSessionState(): Promise<void> {
    const state = await loadState();
    for (const rule of this.rules) {
      if (rule.type === 'session_profit_lock') {
        delete state[rule.id];
      }
    }
    await saveState(state);
  }
}
