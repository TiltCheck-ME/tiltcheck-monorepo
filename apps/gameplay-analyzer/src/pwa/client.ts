// v0.1.0 — 2026-02-25
/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * PWA Client for GameplayAnalyzer
 *
 * Provides a mobile-friendly interface for tracking gameplay
 * without requiring a browser extension.
 * 
 * Features:
 * - Quick spin logging with preset amounts
 * - Offline support with IndexedDB storage
 * - Background sync when connection restored
 * - Real-time anomaly notifications
 * - Battery-aware polling
 * 
 * Note: This module is designed to run in a browser environment.
 * It uses DOM APIs (window, navigator, indexedDB) that are not
 * available in Node.js.
 */

import type { MobileAnomalySummary, AnalysisReport } from '../types.js';

/**
 * PWA Client Configuration
 */
export interface PWAClientConfig {
  /** API endpoint for the gameplay analyzer service */
  apiEndpoint: string;
  /** User identifier */
  userId: string;
  /** Casino identifier */
  casinoId: string;
  /** Game identifier */
  gameId: string;
  /** Enable offline storage */
  offlineEnabled: boolean;
  /** Batch size before auto-sync */
  batchSize: number;
  /** Callback when anomaly detected */
  onAnomalyDetected?: (summary: MobileAnomalySummary) => void;
  /** Callback when sync completes */
  onSyncComplete?: (report: AnalysisReport | null) => void;
}

/**
 * Stored spin for offline support
 */
interface StoredSpin {
  id: string;
  wager: number;
  payout: number;
  timestamp: number;
  synced: boolean;
}

/**
 * PWA Client for GameplayAnalyzer
 */
export class GameplayPWAClient {
  private config: PWAClientConfig;
  private spinBuffer: StoredSpin[] = [];
  private sessionId: string;
  private db: IDBDatabase | null = null;
  private isOnline: boolean = true;
  private pollInterval: number | null = null;

  constructor(config: Partial<PWAClientConfig> & Pick<PWAClientConfig, 'userId' | 'casinoId' | 'gameId'>) {
    this.config = {
      apiEndpoint: '/api/gameplay',
      offlineEnabled: true,
      batchSize: 25,
      ...config,
    };
    this.sessionId = this.generateSessionId();
    
    // Initialize
    this.init();
  }

  /**
   * Initialize the PWA client
   */
  private async init(): Promise<void> {
    // Setup online/offline detection
    this.isOnline = navigator.onLine;
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Initialize IndexedDB for offline storage
    if (this.config.offlineEnabled) {
      await this.initDatabase();
    }

    // Register service worker for background sync
    await this.registerServiceWorker();

    // Start battery-aware polling
    this.startPolling();
  }

  /**
   * Record a spin result
   */
  async recordSpin(wager: number, payout: number): Promise<void> {
    const spin: StoredSpin = {
      id: `${this.sessionId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      wager,
      payout,
      timestamp: Date.now(),
      synced: false,
    };

    this.spinBuffer.push(spin);

    // Store offline if enabled
    if (this.config.offlineEnabled && this.db) {
      await this.storeSpin(spin);
    }

    // Trigger sync if batch size reached
    if (this.spinBuffer.length >= this.config.batchSize) {
      await this.syncSpins();
    }
  }

  /**
   * Quick record with preset wager (for fast mobile input)
   */
  async quickRecord(wager: number, multiplier: number): Promise<void> {
    const payout = wager * multiplier;
    await this.recordSpin(wager, payout);
  }

  /**
   * Record a loss
   */
  async recordLoss(wager: number): Promise<void> {
    await this.recordSpin(wager, 0);
  }

  /**
   * Record a win with multiplier
   */
  async recordWin(wager: number, multiplier: number): Promise<void> {
    await this.recordSpin(wager, wager * multiplier);
  }

  /**
   * Sync pending spins to server
   */
  async syncSpins(): Promise<AnalysisReport | null> {
    if (!this.isOnline) {
      // Queue for background sync
      await this.queueBackgroundSync();
      return null;
    }

    const unsynced = this.spinBuffer.filter(s => !s.synced);
    if (unsynced.length === 0) return null;

    try {
      // Compress spins for transmission
      const compressed = unsynced
        .map(s => `${s.wager}|${s.payout}|${s.timestamp}`)
        .join(';');

      const response = await fetch(`${this.config.apiEndpoint}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          userId: this.config.userId,
          casinoId: this.config.casinoId,
          gameId: this.config.gameId,
          spins: compressed,
        }),
        // Keep connection alive for background
        keepalive: true,
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const result = await response.json();

      // Mark spins as synced
      for (const spin of unsynced) {
        spin.synced = true;
        if (this.db) {
          await this.updateSpinSyncStatus(spin.id, true);
        }
      }

      // Clear synced spins from buffer
      this.spinBuffer = this.spinBuffer.filter(s => !s.synced);

      // Notify if anomaly detected
      if (result.summary && result.summary.af > 0 && this.config.onAnomalyDetected) {
        this.config.onAnomalyDetected(result.summary);
      }

      // Notify sync complete
      if (this.config.onSyncComplete) {
        this.config.onSyncComplete(result.report);
      }

      return result.report;
    } catch (error) {
      console.error('[GameplayPWA] Sync failed:', error);
      // Will retry on next batch or when online
      return null;
    }
  }

  /**
   * Get current session stats
   */
  getSessionStats(): {
    spinCount: number;
    totalWagered: number;
    totalPayout: number;
    sessionRTP: number;
    pendingSync: number;
  } {
    const totalWagered = this.spinBuffer.reduce((sum, s) => sum + s.wager, 0);
    const totalPayout = this.spinBuffer.reduce((sum, s) => sum + s.payout, 0);
    
    return {
      spinCount: this.spinBuffer.length,
      totalWagered,
      totalPayout,
      sessionRTP: totalWagered > 0 ? (totalPayout / totalWagered) * 100 : 0,
      pendingSync: this.spinBuffer.filter(s => !s.synced).length,
    };
  }

  /**
   * End session and get final analysis
   */
  async endSession(): Promise<AnalysisReport | null> {
    // Force sync remaining spins
    const report = await this.syncSpins();

    // Stop polling
    this.stopPolling();

    // Request final analysis
    try {
      const response = await fetch(`${this.config.apiEndpoint}/session/${this.sessionId}/end`, {
        method: 'POST',
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('[GameplayPWA] End session failed:', error);
    }

    return report;
  }

  /**
   * Start a new session
   */
  startNewSession(): void {
    this.spinBuffer = [];
    this.sessionId = this.generateSessionId();
    this.startPolling();
  }

  // ============================================
  // OFFLINE SUPPORT
  // ============================================

  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('GameplayAnalyzer', 1);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('spins')) {
          const store = db.createObjectStore('spins', { keyPath: 'id' });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private async storeSpin(spin: StoredSpin): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['spins'], 'readwrite');
      const store = transaction.objectStore('spins');
      const request = store.add(spin);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async updateSpinSyncStatus(id: string, synced: boolean): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['spins'], 'readwrite');
      const store = transaction.objectStore('spins');
      const request = store.get(id);

      request.onsuccess = () => {
        const spin = request.result;
        if (spin) {
          spin.synced = synced;
          store.put(spin);
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async loadUnsyncedSpins(): Promise<StoredSpin[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['spins'], 'readonly');
      const store = transaction.objectStore('spins');
      const index = store.index('synced');
      const request = index.getAll(IDBKeyRange.only(false));

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // ============================================
  // SERVICE WORKER & BACKGROUND SYNC
  // ============================================

  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('[GameplayPWA] Service Workers not supported');
      return;
    }

    try {
      await navigator.serviceWorker.register('/gameplay-sw.js');
      console.log('[GameplayPWA] Service Worker registered');

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_COMPLETE') {
          this.handleSyncComplete(event.data.report);
        }
      });
    } catch (error) {
      console.error('[GameplayPWA] Service Worker registration failed:', error);
    }
  }

  private async queueBackgroundSync(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('sync' in ServiceWorkerRegistration.prototype)) {
      console.warn('[GameplayPWA] Background Sync not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register('gameplay-sync');
      console.log('[GameplayPWA] Background sync queued');
    } catch (error) {
      console.error('[GameplayPWA] Failed to queue background sync:', error);
    }
  }

  private handleSyncComplete(report: AnalysisReport | null): void {
    if (this.config.onSyncComplete) {
      this.config.onSyncComplete(report);
    }
  }

  // ============================================
  // ONLINE/OFFLINE HANDLING
  // ============================================

  private async handleOnline(): Promise<void> {
    console.log('[GameplayPWA] Back online');
    this.isOnline = true;

    // Load any unsynced spins from IndexedDB
    if (this.config.offlineEnabled) {
      const unsynced = await this.loadUnsyncedSpins();
      for (const spin of unsynced) {
        if (!this.spinBuffer.find(s => s.id === spin.id)) {
          this.spinBuffer.push(spin);
        }
      }
    }

    // Sync immediately
    await this.syncSpins();
  }

  private handleOffline(): void {
    console.log('[GameplayPWA] Offline');
    this.isOnline = false;
  }

  // ============================================
  // BATTERY-AWARE POLLING
  // ============================================

  private async startPolling(): Promise<void> {
    const interval = await this.getOptimalPollInterval();
    
    this.pollInterval = window.setInterval(async () => {
      if (this.spinBuffer.filter(s => !s.synced).length > 0) {
        await this.syncSpins();
      }
    }, interval);
  }

  private stopPolling(): void {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private async getOptimalPollInterval(): Promise<number> {
    // Default: 30 seconds
    let interval = 30000;

    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        
        if (battery.level < 0.2 && !battery.charging) {
          interval = 120000; // 2 minutes on low battery
        } else if (battery.level < 0.5 && !battery.charging) {
          interval = 60000; // 1 minute on medium battery
        }
      }
    } catch {
      // Battery API not available
    }

    return interval;
  }

  // ============================================
  // UTILITIES
  // ============================================

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Check if PWA is installed
   */
  static isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }

  /**
   * Prompt to install PWA
   */
  static async promptInstall(): Promise<boolean> {
    const deferredPrompt = (window as any).deferredPrompt;
    
    if (!deferredPrompt) {
      console.log('[GameplayPWA] Install prompt not available');
      return false;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    return outcome === 'accepted';
  }
}

/**
 * Quick Bet Tracker UI Helper
 * Provides preset buttons for common betting scenarios
 */
export class QuickBetTracker {
  private client: GameplayPWAClient;
  private currentWager: number = 1;
  private presets: number[] = [0.5, 1, 2, 5, 10, 25, 50, 100];

  constructor(client: GameplayPWAClient) {
    this.client = client;
  }

  setWager(amount: number): void {
    this.currentWager = amount;
  }

  getWager(): number {
    return this.currentWager;
  }

  getPresets(): number[] {
    return this.presets;
  }

  async loss(): Promise<void> {
    await this.client.recordLoss(this.currentWager);
  }

  async win(multiplier: number): Promise<void> {
    await this.client.recordWin(this.currentWager, multiplier);
  }

  async bigWin(): Promise<void> {
    await this.win(10);
  }

  async megaWin(): Promise<void> {
    await this.win(50);
  }

  async epicWin(): Promise<void> {
    await this.win(100);
  }

  // Common slot multipliers
  async x2(): Promise<void> { await this.win(2); }
  async x3(): Promise<void> { await this.win(3); }
  async x5(): Promise<void> { await this.win(5); }
  async x10(): Promise<void> { await this.win(10); }
  async x20(): Promise<void> { await this.win(20); }
  async x50(): Promise<void> { await this.win(50); }
  async x100(): Promise<void> { await this.win(100); }
}
