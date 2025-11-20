// Placeholder database abstraction (swap later for real adapter: Supabase, PlanetScale, etc.)
export interface DBConfig {
  url?: string;
  apiKey?: string;
}

export class DatabaseClient {
  constructor(private config: DBConfig = {}) {
    void this.config; // Silence TS6138 unused warning (placeholder implementation)
  }

  connect(): void {
    // Placeholder connect method
    return;
  }

  async query(sql: string, params?: any[]): Promise<any> {
    void sql; void params; // Silence TS6133 unused warnings (placeholder implementation)
    return null;
  }

  async healthCheck() {
    return { ok: true, timestamp: Date.now() };
  }
}

export const db = new DatabaseClient();
