class AdapterRegistryImpl {
    adapters = new Map();
    register(adapter) {
        this.adapters.set(adapter.id, adapter);
        console.log(`[AdapterRegistry] Registered adapter: ${adapter.id} (${adapter.name})`);
    }
    get(casinoId) {
        return this.adapters.get(casinoId);
    }
    detect(headers) {
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
            const allPresent = requiredCols.every(col => normalized.some(h => h.includes(col.toLowerCase())));
            if (allPresent) {
                console.log(`[AdapterRegistry] Column-matched adapter: ${adapter.id}`);
                return adapter;
            }
        }
        return undefined;
    }
    list() {
        return Array.from(this.adapters.values());
    }
}
export const adapterRegistry = new AdapterRegistryImpl();
