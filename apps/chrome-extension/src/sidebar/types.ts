import { OnboardingStatus } from '@tiltcheck/types';

export interface SidebarUI {
  syncAccountUi(): void;
  showMainContent(): void;
  addFeedMessage(msg: string): void;
  getStorage(keys: string[]): Promise<Record<string, any>>;
  setStorage(data: Partial<OnboardingStatus> | Record<string, any>): Promise<void>;
  updateStatus(message: string, type: 'success' | 'warning' | 'thinking' | 'danger' | 'info'): void;
  updateRealityCheck(active: boolean): void;
  updateLicense(data: any): void;
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
