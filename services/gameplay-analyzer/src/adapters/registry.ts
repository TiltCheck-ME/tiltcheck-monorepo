import { CasinoAdapter, AdapterRegistry } from './types.js';

class AdapterRegistryImpl implements AdapterRegistry {
  private adapters = new Map<string, CasinoAdapter>();
  
  register(adapter: CasinoAdapter): void {
    this.adapters.set(adapter.id, adapter);
    console.log(`[AdapterRegistry] Registered adapter: ${adapter.id} (${adapter.name})`);
  }
  
  get(casinoId: string): CasinoAdapter | undefined {
    return this.adapters.get(casinoId);
  }
  
  detect(headers: string[]): CasinoAdapter | undefined {
    const normalized = headers.map(h => h.toLowerCase().trim());
    
    for (const adapter of this.adapters.values()) {
      if (adapter.matchHeaders && adapter.matchHeaders(normalized)) {
        console.log(`[AdapterRegistry] Auto-detected adapter: ${adapter.id}`);
        return adapter;
      }
    }
    
    // Fallback: try column map matching
    for (const adapter of this.adapters.values()) {
      const requiredCols = [adapter.columnMap.bet, adapter.columnMap.win].flat().filter(Boolean);
      const allPresent = requiredCols.every(col => 
        normalized.some(h => h.includes(col.toLowerCase()))
      );
      if (allPresent) {
        console.log(`[AdapterRegistry] Column-matched adapter: ${adapter.id}`);
        return adapter;
      }
    }
    
    return undefined;
  }
  
  list(): CasinoAdapter[] {
    return Array.from(this.adapters.values());
  }
}

export const adapterRegistry = new AdapterRegistryImpl();
