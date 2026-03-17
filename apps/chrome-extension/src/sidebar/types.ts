export interface SidebarUI {
  syncAccountUi(): void;
  showMainContent(): void;
  addFeedMessage(msg: string): void;
  getStorage(keys: string[]): Promise<any>;
  setStorage(data: any): Promise<void>;
  updateStatus(message: string, type: 'success' | 'warning' | 'thinking' | 'danger'): void;
  openPremium?(): Promise<void>;
}

export interface SessionStats {
  startTime: number;
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  currentBalance: number;
}
