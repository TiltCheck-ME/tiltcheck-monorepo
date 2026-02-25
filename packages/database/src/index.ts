/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * TiltCheck Database Client
 * Supabase integration for user stats, game history, and leaderboards
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DBConfig {
  url?: string;
  apiKey?: string;
}

export interface UserStats {
  discord_id: string;
  username: string;
  avatar: string | null;
  
  // Global stats
  total_games: number;
  total_wins: number;
  total_score: number;
  
  // Analytics
  wagered_amount_sol: number;
  deposited_amount_sol: number;
  lost_amount_sol: number;
  profit_sol: number;
  
  // DA&D stats
  dad_games: number;
  dad_wins: number;
  dad_score: number;
  
  // Poker stats
  poker_games: number;
  poker_wins: number;
  poker_chips_won: number;
  
  // Metadata
  last_played_at: string;
  created_at: string;
  updated_at: string;
}

export interface GameHistory {
  id: string;
  game_id: string;
  game_type: 'dad' | 'poker';
  platform: 'web' | 'discord';
  channel_id: string | null;
  
  winner_id: string | null;
  player_ids: string[];
  
  duration: number | null; // seconds
  completed_at: string;
}

export interface UserPreferences {
  discord_id: string;
  email_notifications: boolean;
  tilt_warnings: boolean;
  trust_updates: boolean;
  weekly_digest: boolean;
  updated_at: string;
}

export interface CreditBalance {
  discord_id: string;
  balance_lamports: number;
  wallet_address: string | null;
  last_activity_at: string;
  refund_mode: 'reset-on-activity' | 'hard-expiry';
  hard_expiry_at: string | null;
  inactivity_days: number;
  total_deposited_lamports: number;
  total_withdrawn_lamports: number;
  total_tipped_lamports: number;
  total_fees_lamports: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  discord_id: string;
  type: string;
  amount_lamports: number;
  balance_after_lamports: number;
  counterparty_id: string | null;
  on_chain_signature: string | null;
  memo: string | null;
  created_at: string;
}

export interface PendingTip {
  id: string;
  sender_id: string;
  recipient_id: string;
  amount_lamports: number;
  fee_lamports: number;
  expires_at: string;
  status: 'pending' | 'claimed' | 'refunded' | 'expired';
  created_at: string;
}

export interface DegenIdentity {
  discord_id: string;
  magic_address: string | null;
  primary_external_address: string | null;
  tos_accepted: boolean;
  tos_nft_minted: boolean;
  tos_nft_paid: boolean;
  tos_nft_signature: string | null;
  nft_savings_sol: number;
  trust_score: number;
  identity_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CasinoData {
  domain: string;
  name: string;
  license_info: any;
  claimed_rtp: number | null;
  verified_rtp: number | null;
  status: string;
  updated_at: string;
}

export class DatabaseClient {
  private supabase: SupabaseClient | null = null;

  constructor(config: DBConfig = {}) {
    
    // Initialize Supabase if credentials provided
    if (config.url && config.apiKey) {
      this.supabase = createClient(config.url, config.apiKey);
    }
  }

  /**
   * Check if database is connected
   */
  isConnected(): boolean {
    return this.supabase !== null;
  }

  /**
   * Connect to database (for compatibility)
   */
  async connect(): Promise<void> {
    // Connection is established in constructor
    // This method exists for compatibility with legacy code
    if (!this.supabase) {
      console.warn('DatabaseClient: No Supabase credentials provided');
    }
  }

  /**
   * Execute a query (for compatibility)
   */
  async query(_sql: string, _params?: any[]): Promise<any> {
    // This method exists for compatibility with legacy code
    // For Supabase, use the specific methods instead
    console.warn('DatabaseClient.query() is deprecated. Use specific methods instead.');
    return null;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ ok: boolean; timestamp: number; connected: boolean }> {
    if (!this.supabase) {
      return { ok: false, timestamp: Date.now(), connected: false };
    }

    try {
      // Simple query to check connection
      const { error } = await this.supabase.from('user_stats').select('count').limit(1);
      return { 
        ok: !error, 
        timestamp: Date.now(),
        connected: true
      };
    } catch (_error) {
      return { ok: false, timestamp: Date.now(), connected: true };
    }
  }

  /**
   * Get or create user stats
   */
  async getUserStats(discordId: string): Promise<UserStats | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('user_stats')
      .select('*')
      .eq('discord_id', discordId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user stats:', error);
      return null;
    }

    return data as UserStats | null;
  }

  /**
   * Create user stats entry
   */
  async createUserStats(discordId: string, username: string, avatar: string | null): Promise<UserStats | null> {
    if (!this.supabase) return null;

    const stats: Partial<UserStats> = {
      discord_id: discordId,
      username,
      avatar,
      total_games: 0,
      total_wins: 0,
      total_score: 0,
      dad_games: 0,
      dad_wins: 0,
      dad_score: 0,
      poker_games: 0,
      poker_wins: 0,
      poker_chips_won: 0,
    };

    const { data, error } = await this.supabase
      .from('user_stats')
      .insert(stats)
      .select()
      .single();

    if (error) {
      console.error('Error creating user stats:', error);
      return null;
    }

    return data as UserStats;
  }

  /**
   * Update user stats after a game
   */
  async updateUserStats(
    discordId: string,
    gameType: 'dad' | 'poker',
    updates: {
      won?: boolean;
      score?: number;
      chipsWon?: number;
    }
  ): Promise<UserStats | null> {
    if (!this.supabase) return null;

    // Get current stats
    const stats = await this.getUserStats(discordId);
    
    if (!stats) {
      return null;
    }

    // Calculate updates
    const increment: Partial<UserStats> = {
      total_games: stats.total_games + 1,
      last_played_at: new Date().toISOString(),
    };

    if (updates.won) {
      increment.total_wins = stats.total_wins + 1;
    }

    if (gameType === 'dad') {
      increment.dad_games = stats.dad_games + 1;
      if (updates.won) {
        increment.dad_wins = stats.dad_wins + 1;
      }
      if (updates.score !== undefined) {
        increment.dad_score = stats.dad_score + updates.score;
        increment.total_score = stats.total_score + updates.score;
      }
    } else if (gameType === 'poker') {
      increment.poker_games = stats.poker_games + 1;
      if (updates.won) {
        increment.poker_wins = stats.poker_wins + 1;
      }
      if (updates.chipsWon !== undefined) {
        increment.poker_chips_won = stats.poker_chips_won + updates.chipsWon;
      }
    }

    const { data, error } = await this.supabase
      .from('user_stats')
      .update(increment)
      .eq('discord_id', discordId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user stats:', error);
      return null;
    }

    return data as UserStats;
  }

  async updateUserAnalytics(
    discordId: string,
    updates: {
      wagered?: number;
      deposited?: number;
      lost?: number;
      profit?: number;
    }
  ): Promise<UserStats | null> {
    if (!this.supabase) return null;

    const { data: stats, error: fetchError } = await this.supabase
      .from('user_stats')
      .select('*')
      .eq('discord_id', discordId)
      .single();

    if (fetchError) return null;

    const currentStats = stats as UserStats;
    const increment: Partial<UserStats> = {
      wagered_amount_sol: currentStats.wagered_amount_sol + (updates.wagered || 0),
      deposited_amount_sol: currentStats.deposited_amount_sol + (updates.deposited || 0),
      lost_amount_sol: currentStats.lost_amount_sol + (updates.lost || 0),
      profit_sol: currentStats.profit_sol + (updates.profit || 0),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('user_stats')
      .update(increment)
      .eq('discord_id', discordId)
      .select()
      .single();

    if (error) {
      console.error('Error updating analytics:', error);
      return null;
    }

    return data as UserStats;
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    gameType?: 'dad' | 'poker',
    limit: number = 100
  ): Promise<UserStats[]> {
    if (!this.supabase) return [];

    let query = this.supabase
      .from('user_stats')
      .select('*');

    // Order by appropriate score
    if (gameType === 'dad') {
      query = query.order('dad_score', { ascending: false });
    } else if (gameType === 'poker') {
      query = query.order('poker_chips_won', { ascending: false });
    } else {
      query = query.order('total_score', { ascending: false });
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return data as UserStats[];
  }

  /**
   * Record game in history
   */
  async recordGame(gameHistory: Omit<GameHistory, 'id' | 'completed_at'>): Promise<GameHistory | null> {
    if (!this.supabase) return null;

    const record = {
      ...gameHistory,
      completed_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('game_history')
      .insert(record)
      .select()
      .single();

    if (error) {
      console.error('Error recording game history:', error);
      return null;
    }

    return data as GameHistory;
  }

  /**
   * Get game history for a user
   */
  async getUserGameHistory(discordId: string, limit: number = 50): Promise<GameHistory[]> {
    if (!this.supabase) return [];

    const { data, error } = await this.supabase
      .from('game_history')
      .select('*')
      .contains('player_ids', [discordId])
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching game history:', error);
      return [];
    }

    return data as GameHistory[];
  }

  /**
   * Get user preferences
   */
  async getUserPreferences(discordId: string): Promise<UserPreferences | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('user_preferences')
      .select('*')
      .eq('discord_id', discordId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user preferences:', error);
      return null;
    }

    return data as UserPreferences | null;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(discordId: string, preferences: Partial<Omit<UserPreferences, 'discord_id' | 'updated_at'>>): Promise<UserPreferences | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('user_preferences')
      .upsert({
        discord_id: discordId,
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating user preferences:', error);
      return null;
    }

    return data as UserPreferences;
  }

  /**
   * Get Supabase client for direct queries
   */
  getClient(): SupabaseClient | null {
    return this.supabase;
  }

  /**
   * Get or create Degen Identity
   */
  async getDegenIdentity(discordId: string): Promise<DegenIdentity | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('degen_identities')
      .select('*')
      .eq('discord_id', discordId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching degen identity:', error);
      return null;
    }

    return data as DegenIdentity | null;
  }

  /**
   * Upsert Degen Identity
   */
  async upsertDegenIdentity(identity: Partial<DegenIdentity> & { discord_id: string }): Promise<DegenIdentity | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('degen_identities')
      .upsert({
        ...identity,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting degen identity:', error);
      return null;
    }

    return data as DegenIdentity;
  }

  /**
   * Update trust score
   */
  async updateTrustScore(discordId: string, trustScore: number): Promise<boolean> {
    if (!this.supabase) return false;

    const { error } = await this.supabase
      .from('degen_identities')
      .update({ trust_score: trustScore, updated_at: new Date().toISOString() })
      .eq('discord_id', discordId);

    if (error) {
      console.error('Error updating trust score:', error);
      return false;
    }

    return true;
  }

  /**
   * Mint ToS NFT (Mock/Record)
   */
  async mintTosNft(discordId: string): Promise<boolean> {
    if (!this.supabase) return false;

    const { error } = await this.supabase
      .from('degen_identities')
      .update({ 
        tos_nft_minted: true, 
        updated_at: new Date().toISOString() 
      })
      .eq('discord_id', discordId);

    if (error) {
      console.error('Error recording NFT mint:', error);
      return false;
    }

    return true;
  }

  async markNftPaid(discordId: string, signature: string): Promise<boolean> {
    if (!this.supabase) return false;

    const { error } = await this.supabase
      .from('degen_identities')
      .update({ 
        tos_nft_paid: true,
        tos_nft_signature: signature,
        updated_at: new Date().toISOString() 
      })
      .eq('discord_id', discordId);

    if (error) {
      console.error('Error marking NFT paid:', error);
      return false;
    }

    return true;
  }

  async updateNftSavings(discordId: string, amountSol: number): Promise<number> {
    if (!this.supabase) return 0;

    const { data: identity } = await this.supabase
      .from('degen_identities')
      .select('nft_savings_sol')
      .eq('discord_id', discordId)
      .single();

    const currentSavings = Number(identity?.nft_savings_sol || 0);
    const newSavings = currentSavings + amountSol;

    await this.supabase
      .from('degen_identities')
      .update({ 
        nft_savings_sol: newSavings, 
        updated_at: new Date().toISOString() 
      })
      .eq('discord_id', discordId);

    return newSavings;
  }

  /**
   * Get casino data by domain
   */
  async getCasino(domain: string): Promise<CasinoData | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('casino_data')
      .select('*')
      .eq('domain', domain)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') { // PGRST116 is "Row not found"
        console.error('Error fetching casino data:', error);
      }
      return null;
    }

    return data as CasinoData;
  }

  // ============================================================
  // Credit System Methods
  // ============================================================

  async creditBalance(
    discordId: string,
    amountLamports: number,
    type: string,
    opts?: { memo?: string; counterpartyId?: string; signature?: string }
  ): Promise<{ newBalance: number; txId: string } | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase.rpc('credit_balance', {
      p_discord_id: discordId,
      p_amount: amountLamports,
      p_type: type,
      p_memo: opts?.memo ?? null,
      p_counterparty_id: opts?.counterpartyId ?? null,
      p_signature: opts?.signature ?? null,
    });

    if (error) {
      console.error('[DB] Error crediting balance:', error);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return { newBalance: row.new_balance, txId: row.tx_id };
  }

  async debitBalance(
    discordId: string,
    amountLamports: number,
    type: string,
    opts?: { memo?: string; counterpartyId?: string; signature?: string }
  ): Promise<{ newBalance: number; txId: string } | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase.rpc('debit_balance', {
      p_discord_id: discordId,
      p_amount: amountLamports,
      p_type: type,
      p_memo: opts?.memo ?? null,
      p_counterparty_id: opts?.counterpartyId ?? null,
      p_signature: opts?.signature ?? null,
    });

    if (error) {
      console.error('[DB] Error debiting balance:', error);
      return null;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return { newBalance: row.new_balance, txId: row.tx_id };
  }

  async getCreditBalance(discordId: string): Promise<CreditBalance | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('credit_balances')
      .select('*')
      .eq('discord_id', discordId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[DB] Error fetching credit balance:', error);
      return null;
    }

    return data as CreditBalance | null;
  }

  async registerCreditWallet(discordId: string, walletAddress: string): Promise<boolean> {
    if (!this.supabase) return false;

    const { error } = await this.supabase
      .from('credit_balances')
      .upsert({
        discord_id: discordId,
        wallet_address: walletAddress,
        last_activity_at: new Date().toISOString(),
      }, { onConflict: 'discord_id' });

    if (error) {
      console.error('[DB] Error registering credit wallet:', error);
      return false;
    }
    return true;
  }

  async updateRefundSettings(
    discordId: string,
    settings: { refundMode?: string; hardExpiryAt?: string | null; inactivityDays?: number }
  ): Promise<boolean> {
    if (!this.supabase) return false;

    const update: Record<string, any> = {};
    if (settings.refundMode !== undefined) update.refund_mode = settings.refundMode;
    if (settings.hardExpiryAt !== undefined) update.hard_expiry_at = settings.hardExpiryAt;
    if (settings.inactivityDays !== undefined) update.inactivity_days = settings.inactivityDays;

    const { error } = await this.supabase
      .from('credit_balances')
      .update(update)
      .eq('discord_id', discordId);

    if (error) {
      console.error('[DB] Error updating refund settings:', error);
      return false;
    }
    return true;
  }

  async getCreditTransactions(discordId: string, limit: number = 20): Promise<CreditTransaction[]> {
    if (!this.supabase) return [];

    const { data, error } = await this.supabase
      .from('credit_transactions')
      .select('*')
      .eq('discord_id', discordId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[DB] Error fetching credit transactions:', error);
      return [];
    }

    return data as CreditTransaction[];
  }

  async getStaleBalances(thresholdMs: number): Promise<CreditBalance[]> {
    if (!this.supabase) return [];

    const cutoff = new Date(Date.now() - thresholdMs).toISOString();

    const { data, error } = await this.supabase
      .from('credit_balances')
      .select('*')
      .gt('balance_lamports', 0)
      .lt('last_activity_at', cutoff);

    if (error) {
      console.error('[DB] Error fetching stale balances:', error);
      return [];
    }

    return data as CreditBalance[];
  }

  async createPendingTip(tip: {
    senderId: string;
    recipientId: string;
    amountLamports: number;
    feeLamports: number;
    expiresAt: string;
  }): Promise<PendingTip | null> {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('pending_tips')
      .insert({
        sender_id: tip.senderId,
        recipient_id: tip.recipientId,
        amount_lamports: tip.amountLamports,
        fee_lamports: tip.feeLamports,
        expires_at: tip.expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error('[DB] Error creating pending tip:', error);
      return null;
    }
    return data as PendingTip;
  }

  async getPendingTipsForRecipient(recipientId: string): Promise<PendingTip[]> {
    if (!this.supabase) return [];

    const { data, error } = await this.supabase
      .from('pending_tips')
      .select('*')
      .eq('recipient_id', recipientId)
      .eq('status', 'pending');

    if (error) {
      console.error('[DB] Error fetching pending tips:', error);
      return [];
    }
    return data as PendingTip[];
  }

  async claimPendingTip(tipId: string): Promise<boolean> {
    if (!this.supabase) return false;

    const { error } = await this.supabase
      .from('pending_tips')
      .update({ status: 'claimed' })
      .eq('id', tipId)
      .eq('status', 'pending');

    if (error) {
      console.error('[DB] Error claiming pending tip:', error);
      return false;
    }
    return true;
  }

  async getExpiredPendingTips(): Promise<PendingTip[]> {
    if (!this.supabase) return [];

    const { data, error } = await this.supabase
      .from('pending_tips')
      .select('*')
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('[DB] Error fetching expired tips:', error);
      return [];
    }
    return data as PendingTip[];
  }

  async markPendingTipRefunded(tipId: string): Promise<boolean> {
    if (!this.supabase) return false;

    const { error } = await this.supabase
      .from('pending_tips')
      .update({ status: 'refunded' })
      .eq('id', tipId);

    if (error) {
      console.error('[DB] Error marking tip refunded:', error);
      return false;
    }
    return true;
  }

  /**
   * Store a tilt detection event
   */
  async recordTiltEvent(data: {
    userId: string;
    timestamp: number;
    signals: any[];
    tiltScore: number;
    context?: 'discord-dm' | 'discord-guild';
  }): Promise<boolean> {
    if (!this.supabase) {
      console.warn('DatabaseClient: No database connected');
      return false;
    }

    try {
      const { error } = await this.supabase.from('tilt_events').insert({
        user_id: data.userId,
        timestamp: new Date(data.timestamp).toISOString(),
        signals: JSON.stringify(data.signals),
        tilt_score: data.tiltScore,
        context: data.context || 'discord-dm',
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('[DB] Error recording tilt event:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[DB] Error recording tilt event:', err);
      return false;
    }
  }

  /**
   * Get tilt event history for a user
   */
  async getTiltHistory(userId: string, options: {
    days?: number;
    limit?: number;
  } = {}): Promise<any[]> {
    if (!this.supabase) return [];

    try {
      const days = options.days || 7;
      const limit = Math.min(options.limit || 100, 500);

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('tilt_events')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[DB] Error fetching tilt history:', error);
        return [];
      }

      return (data || []).map(event => ({
        ...event,
        signals: typeof event.signals === 'string' ? JSON.parse(event.signals) : event.signals,
      }));
    } catch (err) {
      console.error('[DB] Error fetching tilt history:', err);
      return [];
    }
  }

  /**
   * Get tilt statistics for a user
   */
  async getTiltStats(userId: string): Promise<{
    totalEvents: number;
    averageTiltScore: number;
    maxTiltScore: number;
    lastEventAt: string | null;
    eventsLast24h: number;
    eventsLast7d: number;
  }> {
    if (!this.supabase) {
      return {
        totalEvents: 0,
        averageTiltScore: 0,
        maxTiltScore: 0,
        lastEventAt: null,
        eventsLast24h: 0,
        eventsLast7d: 0,
      };
    }

    try {
      const { data, error } = await this.supabase
        .from('tilt_events')
        .select('timestamp, tilt_score')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('[DB] Error fetching tilt stats:', error);
        return {
          totalEvents: 0,
          averageTiltScore: 0,
          maxTiltScore: 0,
          lastEventAt: null,
          eventsLast24h: 0,
          eventsLast7d: 0,
        };
      }

      const events = data || [];

      if (events.length === 0) {
        return {
          totalEvents: 0,
          averageTiltScore: 0,
          maxTiltScore: 0,
          lastEventAt: null,
          eventsLast24h: 0,
          eventsLast7d: 0,
        };
      }

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const scores = events.map(e => e.tilt_score).filter(s => s !== null);
      const averageTiltScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;
      const maxTiltScore = scores.length > 0 ? Math.max(...scores) : 0;

      const eventsLast24h = events.filter(e => new Date(e.timestamp) > last24h).length;
      const eventsLast7d = events.filter(e => new Date(e.timestamp) > last7d).length;

      return {
        totalEvents: events.length,
        averageTiltScore: parseFloat(averageTiltScore.toFixed(2)),
        maxTiltScore,
        lastEventAt: events[0]?.timestamp || null,
        eventsLast24h,
        eventsLast7d,
      };
    } catch (err) {
      console.error('[DB] Error calculating tilt stats:', err);
      return {
        totalEvents: 0,
        averageTiltScore: 0,
        maxTiltScore: 0,
        lastEventAt: null,
        eventsLast24h: 0,
        eventsLast7d: 0,
      };
    }
  }
}

// Export singleton instance
export const db = new DatabaseClient({
  url: process.env.SUPABASE_URL,
  apiKey: process.env.SUPABASE_ANON_KEY,
});

// Re-export Supabase types
export type { SupabaseClient } from '@supabase/supabase-js';
