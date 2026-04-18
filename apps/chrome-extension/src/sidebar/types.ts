/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18 */
import { OnboardingStatus } from '@tiltcheck/types';
import type { CasinoVerification } from '../license-verifier.js';

export interface SidebarUI {
  syncAccountUi(): void;
  showMainContent(): void;
  addFeedMessage(msg: string): void;
  getStorage(keys: string[]): Promise<Record<string, any>>;
  setStorage(data: Partial<OnboardingStatus> | Record<string, any>): Promise<void>;
  updateStatus(message: string, type: 'success' | 'warning' | 'thinking' | 'danger' | 'info'): void;
  updateRealityCheck(active: boolean): void;
  updateLicense(data: CasinoVerification | null): void;
  updateTilt(score: number, indicators: string[]): void;
  updateStats(stats: Partial<SessionStats>): void;
  notifyBuddy(event: string, data: any): void;
  openPremium?(): Promise<void>;
}

export interface SessionStats {
  startTime: number;
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  currentBalance: number;
}
