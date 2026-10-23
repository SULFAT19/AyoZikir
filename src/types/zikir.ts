export type ZikirCategory = string;

export interface ZikirItem {
  id: string;
  title: string;
  category: string;
  order: number;
  arabic: string;
  latin: string;
  translation: string;
  dalil: string;
  fadhilah?: string;
  targetCount: number;
  repeatNote?: string;
  source?: string;
}

export interface RangkaianItem {
  id: string;
  title: string;
  description: string;
  iconEmoji: string;
  zikirIds: string[];
  order: number;
  colorTheme?: string;
}

export interface GoogleSheetConfig {
  webAppUrl: string; // Google Apps Script Web App URL
  sheetCsvUrl?: string; // Optional CSV export URL
  autoSync: boolean;
  lastSyncedAt?: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  errorMessage?: string;
}

export interface UserStats {
  totalCountsToday: number;
  totalCompletedSessions: number;
  lastActiveDate: string;
  streakDays: number;
}
