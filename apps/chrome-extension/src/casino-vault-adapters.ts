// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
/**
 * casino-vault-adapters.ts
 * Adapter pattern for casino-specific vault mechanics.
 * DOM-based fallback for casinos without a public API.
 */

export interface CasinoVaultAdapter {
  name: string;
  domains: string[];
  canDetectBalance(): boolean;
  getBalance(): Promise<number | null>;
  getLastWinAmount(): Promise<number | null>;
  vaultAmount(amount: number, currency?: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Stake.com — GraphQL API (session cookie)
// ---------------------------------------------------------------------------
export class StakeVaultAdapter implements CasinoVaultAdapter {
  name = 'stake';
  domains = ['stake.com', 'stake.us'];

  canDetectBalance(): boolean {
    return true;
  }

  async getBalance(): Promise<number | null> {
    try {
      const res = await fetch('https://api.stake.com/graphql', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query { user { balances { available { amount currency { name } } } } }`,
        }),
      });
      const json = await res.json();
      const balances: { available: { amount: number } }[] =
        json?.data?.user?.balances ?? [];
      return balances[0]?.available?.amount ?? null;
    } catch {
      return null;
    }
  }

  async getLastWinAmount(): Promise<number | null> {
    return null;
  }

  async vaultAmount(amount: number, _currency = 'usd'): Promise<boolean> {
    try {
      const res = await fetch('https://api.stake.com/graphql', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation createVaultDeposit($amount: Float!) {
            createVaultDeposit(amount: $amount) { id amount }
          }`,
          variables: { amount },
        }),
      });
      const json = await res.json();
      return !!json?.data?.createVaultDeposit?.id;
    } catch {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Generic DOM adapter — fuzzy-clicks vault/safe/save buttons
// ---------------------------------------------------------------------------
export class GenericDOMVaultAdapter implements CasinoVaultAdapter {
  name: string;
  domains: string[];

  constructor(name: string, domains: string[]) {
    this.name = name;
    this.domains = domains;
  }

  canDetectBalance(): boolean {
    return false;
  }

  async getBalance(): Promise<number | null> {
    return null;
  }

  async getLastWinAmount(): Promise<number | null> {
    return null;
  }

  async vaultAmount(_amount: number, _currency?: string): Promise<boolean> {
    const keywords = ['vault', 'safe', 'save funds', 'lock', 'stash'];
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('button, [role="button"]'));

    for (const btn of buttons) {
      const text = (btn.textContent ?? '').trim().toLowerCase();
      if (keywords.some((k) => text.includes(k))) {
        btn.click();
        return true;
      }
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// Registry — picks the right adapter for the current hostname
// ---------------------------------------------------------------------------
const ADAPTERS: CasinoVaultAdapter[] = [
  new StakeVaultAdapter(),
  new GenericDOMVaultAdapter('roobet', ['roobet.com']),
  new GenericDOMVaultAdapter('bcgame', ['bc.game']),
  new GenericDOMVaultAdapter('rollbit', ['rollbit.com']),
  new GenericDOMVaultAdapter('gamdom', ['gamdom.com']),
  new GenericDOMVaultAdapter('shuffle', ['shuffle.com']),
];

export function getAdapterForHost(hostname: string): CasinoVaultAdapter | null {
  for (const adapter of ADAPTERS) {
    if (adapter.domains.some((d) => hostname.includes(d))) return adapter;
  }
  return null;
}

export function getCasinoName(hostname: string): string {
  const adapter = getAdapterForHost(hostname);
  return adapter?.name ?? 'unknown';
}
