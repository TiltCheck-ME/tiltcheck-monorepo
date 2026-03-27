/* © 2026 TiltCheck Ecosystem. All Rights Reserved. */

/**
 * Reality Check Sensor Core
 * 
 * High-precision sensory input for gambling behavior.
 * We don't just "scrape" — we analyze the game state in real-time.
 */

export interface RoundData {
  bet: number;
  win: number;
  balance: number;
  timestamp: number;
  gameId: string;
  metadata?: any;
}

export abstract class BaseSensor {
  protected lastBalance: number | null = null;
  protected lastRoundTime: number = 0;
  protected debounceMs: number = 800;

  constructor(protected casinoId: string) {}

  /**
   * Initialize the sensor internals
   */
  abstract initialize(): Promise<void>;

  /**
   * Start watching for game rounds
   */
  abstract start(callback: (round: RoundData) => void): void;

  /**
   * Stop watching
   */
  abstract stop(): void;

  /**
   * Manual extraction of current state
   */
  abstract snapshot(): RoundData | null;

  protected parseCurrency(text: string | null): number {
    if (!text) return 0;
    // Remove symbols and commas, handle decimals
    const cleaned = text.replace(/[^0-9.-]/g, '');
    const val = parseFloat(cleaned);
    return isNaN(val) ? 0 : val;
  }
}
