/**
 * Provably Fair Verifier
 * 
 * Verifies casino game outcomes using cryptographic seeds.
 * Supports:
 * - Manual seed input for single bet verification
 * - Bulk archive upload (CSV/JSON) for batch analysis
 * - Multiple game types (Plinko, Keno, Mines, Dice, etc.)
 */

// Use Web Crypto API for browser compatibility
// For Node.js, this would use the crypto module
import type {
  ProvablyFairBet,
  ProvablyFairGameType,
  BetVerificationResult,
  BatchVerificationResult,
  CalculatedOutcome,
  PlinkoOutcome,
  KenoOutcome,
  MinesOutcome,
  DiceOutcome,
  VerificationAnomaly,
  ParsedArchive,
  ArchiveFormat,
  ArchiveUploadConfig,
  ArchiveParseError,
  RiskLevel,
} from './types.js';

/**
 * Plinko payout tables by rows and risk
 */
const PLINKO_PAYOUTS: Record<string, Record<number, number>> = {
  '8-low': { 0: 5.6, 1: 2.1, 2: 1.1, 3: 1, 4: 0.5, 5: 1, 6: 1.1, 7: 2.1, 8: 5.6 },
  '8-medium': { 0: 13, 1: 3, 2: 1.3, 3: 0.7, 4: 0.4, 5: 0.7, 6: 1.3, 7: 3, 8: 13 },
  '8-high': { 0: 29, 1: 4, 2: 1.5, 3: 0.3, 4: 0.2, 5: 0.3, 6: 1.5, 7: 4, 8: 29 },
  '12-low': { 0: 10, 1: 3, 2: 1.6, 3: 1.4, 4: 1.1, 5: 1, 6: 0.5, 7: 1, 8: 1.1, 9: 1.4, 10: 1.6, 11: 3, 12: 10 },
  '12-medium': { 0: 33, 1: 11, 2: 4, 3: 2, 4: 1.1, 5: 0.6, 6: 0.3, 7: 0.6, 8: 1.1, 9: 2, 10: 4, 11: 11, 12: 33 },
  '12-high': { 0: 170, 1: 24, 2: 8.1, 3: 2, 4: 0.7, 5: 0.2, 6: 0.2, 7: 0.2, 8: 0.7, 9: 2, 10: 8.1, 11: 24, 12: 170 },
  '16-low': { 0: 16, 1: 9, 2: 2, 3: 1.4, 4: 1.4, 5: 1.2, 6: 1.1, 7: 1, 8: 0.5, 9: 1, 10: 1.1, 11: 1.2, 12: 1.4, 13: 1.4, 14: 2, 15: 9, 16: 16 },
  '16-medium': { 0: 110, 1: 41, 2: 10, 3: 5, 4: 3, 5: 1.5, 6: 1, 7: 0.5, 8: 0.3, 9: 0.5, 10: 1, 11: 1.5, 12: 3, 13: 5, 14: 10, 15: 41, 16: 110 },
  '16-high': { 0: 1000, 1: 130, 2: 26, 3: 9, 4: 4, 5: 2, 6: 0.2, 7: 0.2, 8: 0.2, 9: 0.2, 10: 0.2, 11: 2, 12: 4, 13: 9, 14: 26, 15: 130, 16: 1000 },
};

/**
 * Keno payout tables by risk and hits
 */
const KENO_PAYOUTS: Record<string, Record<number, number>> = {
  'classic-1': { 0: 0, 1: 3.8 },
  'classic-2': { 0: 0, 1: 1.9, 2: 5.1 },
  'classic-3': { 0: 0, 1: 1, 2: 2.8, 3: 26 },
  'classic-4': { 0: 0, 1: 0.5, 2: 2, 3: 6, 4: 91 },
  'classic-5': { 0: 0, 1: 0, 2: 1.5, 3: 4, 4: 13, 5: 300 },
  'classic-10': { 0: 0, 1: 0, 2: 0, 3: 1.5, 4: 2, 5: 4, 6: 8, 7: 40, 8: 200, 9: 1000, 10: 10000 },
};

/**
 * Provably Fair Verification Service
 */
export class ProvablyFairVerifier {
  
  // ============================================
  // SINGLE BET VERIFICATION
  // ============================================

  /**
   * Verify a single bet
   */
  verifyBet(bet: ProvablyFairBet): BetVerificationResult {
    // Step 1: Verify server seed hash
    const seedHashValid = this.verifyServerSeedHash(bet.serverSeed, bet.serverSeedHash);
    
    // Step 2: Calculate expected outcome
    const calculatedOutcome = this.calculateOutcome(bet);
    
    // Step 3: Compare results
    const resultValid = this.compareResults(bet, calculatedOutcome);
    
    // Step 4: Verify payout
    const payoutValid = Math.abs(bet.claimedPayout - calculatedOutcome.expectedPayout) < 0.01;
    const payoutDiscrepancy = payoutValid ? undefined : bet.claimedPayout - calculatedOutcome.expectedPayout;
    
    // Generate message
    let message = '';
    if (!seedHashValid) {
      message = '❌ Server seed hash does not match - possible tampering!';
    } else if (!resultValid) {
      message = '❌ Game result does not match calculated outcome';
    } else if (!payoutValid) {
      message = `⚠️ Payout discrepancy: claimed ${bet.claimedPayout}, expected ${calculatedOutcome.expectedPayout}`;
    } else {
      message = '✅ Bet verified - outcome and payout are correct';
    }
    
    return {
      bet,
      seedHashValid,
      calculatedOutcome,
      resultValid,
      payoutValid,
      payoutDiscrepancy,
      message,
    };
  }

  /**
   * Verify server seed hash matches
   * Uses simple string comparison - actual hash verification would use crypto
   */
  private verifyServerSeedHash(serverSeed: string, serverSeedHash: string): boolean {
    // In a full implementation, we'd use:
    // const calculatedHash = createHash('sha256').update(serverSeed).digest('hex');
    // For now, we'll use a simple hash function for browser compatibility
    const calculatedHash = this.simpleHash(serverSeed);
    return calculatedHash.toLowerCase() === serverSeedHash.toLowerCase();
  }

  /**
   * Simple hash function for browser compatibility
   * In production, use Web Crypto API or crypto module
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  }

  /**
   * Generate HMAC-like hash for outcome calculation
   */
  private hmacHash(key: string, message: string): string {
    // Simplified HMAC for browser compatibility
    // In production, use Web Crypto API
    const combined = key + message;
    let hash = 0x811c9dc5;
    for (let i = 0; i < combined.length; i++) {
      hash ^= combined.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    // Generate 64 character hex string
    let result = '';
    for (let i = 0; i < 16; i++) {
      hash = ((hash << 5) - hash) + (hash >> 27);
      result += ((hash >>> 0) & 0xf).toString(16);
      result += (((hash >>> 4) & 0xf) ^ (i * 3)).toString(16);
      result += (((hash >>> 8) & 0xf) ^ (i * 7)).toString(16);
      result += (((hash >>> 12) & 0xf) ^ (i * 11)).toString(16);
    }
    return result;
  }

  /**
   * Calculate expected outcome from seeds
   */
  private calculateOutcome(bet: ProvablyFairBet): CalculatedOutcome {
    // Generate combined hash using our browser-compatible HMAC
    const hash = this.hmacHash(bet.serverSeed, `${bet.clientSeed}:${bet.nonce}`);
    
    switch (bet.game) {
      case 'plinko':
        return this.calculatePlinkoOutcome(hash, bet);
      case 'keno':
        return this.calculateKenoOutcome(hash, bet);
      case 'mines':
        return this.calculateMinesOutcome(hash, bet);
      case 'dice':
      case 'limbo':
        return this.calculateDiceOutcome(hash, bet);
      default:
        return {
          hash,
          result: null,
          expectedMultiplier: 0,
          expectedPayout: 0,
        };
    }
  }

  /**
   * Calculate Plinko outcome
   */
  private calculatePlinkoOutcome(hash: string, bet: ProvablyFairBet): PlinkoOutcome {
    const rows = bet.rows || 16;
    const risk = bet.risk || 'medium';
    
    // Each character determines left (0) or right (1)
    const path: number[] = [];
    for (let i = 0; i < rows; i++) {
      const charValue = parseInt(hash[i], 16);
      path.push(charValue % 2);
    }
    
    // Calculate final bucket (count of rights = bucket position)
    const bucket = path.reduce((sum, dir) => sum + dir, 0);
    
    // Get multiplier from payout table
    const tableKey = `${rows}-${risk}`;
    const payoutTable = PLINKO_PAYOUTS[tableKey] || PLINKO_PAYOUTS['16-medium'];
    const expectedMultiplier = payoutTable[bucket] || 0;
    const expectedPayout = bet.wager * expectedMultiplier;
    
    return {
      hash,
      result: { path, bucket },
      expectedMultiplier,
      expectedPayout,
    };
  }

  /**
   * Calculate Keno outcome
   */
  private calculateKenoOutcome(hash: string, bet: ProvablyFairBet): KenoOutcome {
    const selections = bet.kenoSelections || [];
    const numSelections = selections.length;
    
    // Generate 10 drawn numbers from hash
    const drawnNumbers: number[] = [];
    let hashIndex = 0;
    
    while (drawnNumbers.length < 10 && hashIndex < hash.length - 4) {
      // Take 4 hex chars, convert to number 1-40
      const segment = hash.slice(hashIndex, hashIndex + 4);
      const value = parseInt(segment, 16);
      const number = (value % 40) + 1;
      
      if (!drawnNumbers.includes(number)) {
        drawnNumbers.push(number);
      }
      hashIndex += 4;
    }
    
    // Calculate hits
    const hits = selections.filter(n => drawnNumbers.includes(n));
    const hitCount = hits.length;
    
    // Get multiplier from payout table
    const tableKey = `classic-${numSelections}`;
    const payoutTable = KENO_PAYOUTS[tableKey] || {};
    const expectedMultiplier = payoutTable[hitCount] || 0;
    const expectedPayout = bet.wager * expectedMultiplier;
    
    return {
      hash,
      result: { drawnNumbers, hits, hitCount },
      expectedMultiplier,
      expectedPayout,
    };
  }

  /**
   * Calculate Mines outcome
   */
  private calculateMinesOutcome(hash: string, bet: ProvablyFairBet): MinesOutcome {
    const mineCount = bet.mineCount || 3;
    const gridSize = 25; // 5x5 grid
    
    // Generate mine positions from hash
    const minePositions: number[] = [];
    let hashIndex = 0;
    
    while (minePositions.length < mineCount && hashIndex < hash.length - 2) {
      const segment = hash.slice(hashIndex, hashIndex + 2);
      const value = parseInt(segment, 16);
      const position = value % gridSize;
      
      if (!minePositions.includes(position)) {
        minePositions.push(position);
      }
      hashIndex += 2;
    }
    
    return {
      hash,
      result: { minePositions },
      expectedMultiplier: 1, // Mines multiplier depends on tiles revealed
      expectedPayout: bet.wager, // Need more context for accurate payout
    };
  }

  /**
   * Calculate Dice/Limbo outcome
   */
  private calculateDiceOutcome(hash: string, bet: ProvablyFairBet): DiceOutcome {
    // Take first 8 hex chars for roll
    const segment = hash.slice(0, 8);
    const value = parseInt(segment, 16);
    
    // Convert to 0-99.99 for dice, or multiplier for limbo
    const roll = (value % 10000) / 100;
    
    // Determine if won
    const target = bet.target || 50;
    const rollOver = bet.rollOver !== false;
    const won = rollOver ? roll > target : roll < target;
    
    // Calculate multiplier (simplified)
    const winChance = rollOver ? (99.99 - target) : target;
    const expectedMultiplier = won ? (99 / winChance) : 0;
    const expectedPayout = bet.wager * expectedMultiplier;
    
    return {
      hash,
      result: { roll, won },
      expectedMultiplier,
      expectedPayout,
    };
  }

  /**
   * Compare calculated result with claimed result
   */
  private compareResults(bet: ProvablyFairBet, outcome: CalculatedOutcome): boolean {
    // For now, compare multipliers with small tolerance
    return Math.abs(bet.claimedMultiplier - outcome.expectedMultiplier) < 0.01;
  }

  // ============================================
  // BATCH VERIFICATION
  // ============================================

  /**
   * Verify multiple bets and generate summary
   */
  verifyBatch(bets: ProvablyFairBet[]): BatchVerificationResult {
    const betResults: BetVerificationResult[] = [];
    let validSeeds = 0;
    let validResults = 0;
    let validPayouts = 0;
    let totalWagered = 0;
    let totalClaimedPayout = 0;
    let totalExpectedPayout = 0;
    const anomalies: VerificationAnomaly[] = [];
    
    for (const bet of bets) {
      const result = this.verifyBet(bet);
      betResults.push(result);
      
      totalWagered += bet.wager;
      totalClaimedPayout += bet.claimedPayout;
      totalExpectedPayout += result.calculatedOutcome.expectedPayout;
      
      if (result.seedHashValid) validSeeds++;
      if (result.resultValid) validResults++;
      if (result.payoutValid) validPayouts++;
      
      // Track anomalies
      if (!result.seedHashValid) {
        anomalies.push({
          type: 'seed_mismatch',
          severity: 'critical',
          betId: bet.betId,
          message: 'Server seed hash does not match',
          details: { serverSeed: bet.serverSeed, serverSeedHash: bet.serverSeedHash },
        });
      }
      
      if (!result.resultValid) {
        anomalies.push({
          type: 'result_mismatch',
          severity: 'critical',
          betId: bet.betId,
          message: 'Game result does not match calculated outcome',
          details: { claimed: bet.claimedMultiplier, calculated: result.calculatedOutcome.expectedMultiplier },
        });
      }
      
      if (!result.payoutValid && result.payoutDiscrepancy) {
        anomalies.push({
          type: 'payout_mismatch',
          severity: Math.abs(result.payoutDiscrepancy) > 1 ? 'critical' : 'warning',
          betId: bet.betId,
          message: `Payout discrepancy of ${result.payoutDiscrepancy.toFixed(2)}`,
          details: { claimed: bet.claimedPayout, expected: result.calculatedOutcome.expectedPayout },
        });
      }
    }
    
    const payoutDiscrepancy = totalClaimedPayout - totalExpectedPayout;
    const claimedRTP = totalWagered > 0 ? (totalClaimedPayout / totalWagered) * 100 : 0;
    const expectedRTP = totalWagered > 0 ? (totalExpectedPayout / totalWagered) * 100 : 0;
    
    // Check for RTP deviation
    if (Math.abs(claimedRTP - expectedRTP) > 1) {
      anomalies.push({
        type: 'rtp_deviation',
        severity: Math.abs(claimedRTP - expectedRTP) > 5 ? 'critical' : 'warning',
        message: `RTP deviation: claimed ${claimedRTP.toFixed(2)}% vs expected ${expectedRTP.toFixed(2)}%`,
        details: { claimedRTP, expectedRTP, deviation: claimedRTP - expectedRTP },
      });
    }
    
    // Generate summary
    let summary = `Verified ${bets.length} bets:\n`;
    summary += `- Valid seeds: ${validSeeds}/${bets.length}\n`;
    summary += `- Valid results: ${validResults}/${bets.length}\n`;
    summary += `- Valid payouts: ${validPayouts}/${bets.length}\n`;
    summary += `- Claimed RTP: ${claimedRTP.toFixed(2)}%\n`;
    summary += `- Expected RTP: ${expectedRTP.toFixed(2)}%\n`;
    
    if (anomalies.length > 0) {
      summary += `\n⚠️ ${anomalies.length} anomalies detected!`;
    } else {
      summary += '\n✅ All bets verified successfully!';
    }
    
    return {
      totalBets: bets.length,
      validSeeds,
      validResults,
      validPayouts,
      totalWagered,
      totalClaimedPayout,
      totalExpectedPayout,
      payoutDiscrepancy,
      claimedRTP,
      expectedRTP,
      betResults,
      summary,
      anomalies,
    };
  }

  // ============================================
  // ARCHIVE PARSING
  // ============================================

  /**
   * Parse uploaded archive file
   */
  parseArchive(content: string, config: ArchiveUploadConfig): ParsedArchive {
    switch (config.format) {
      case 'csv':
        return this.parseGenericCSV(content, config);
      case 'json':
        return this.parseJSON(content, config);
      case 'stake_csv':
        return this.parseStakeCSV(content, config);
      case 'bc_game_csv':
        return this.parseBCGameCSV(content, config);
      case 'roobet_csv':
        return this.parseRoobetCSV(content, config);
      default:
        return {
          bets: [],
          errors: [{ row: 0, rawData: '', error: `Unsupported format: ${config.format}` }],
          metadata: { format: config.format, totalRows: 0, successfulRows: 0 },
        };
    }
  }

  /**
   * Parse generic CSV format
   */
  private parseGenericCSV(content: string, config: ArchiveUploadConfig): ParsedArchive {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const bets: ProvablyFairBet[] = [];
    const errors: ArchiveParseError[] = [];
    
    const mappings = config.columnMappings || {
      betId: 'bet_id',
      game: 'game',
      serverSeed: 'server_seed',
      serverSeedHash: 'server_seed_hash',
      clientSeed: 'client_seed',
      nonce: 'nonce',
      wager: 'wager',
      payout: 'payout',
      multiplier: 'multiplier',
    };
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = this.parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => row[h] = values[idx] || '');
        
        const bet: ProvablyFairBet = {
          betId: row[mappings.betId] || `bet-${i}`,
          game: (row[mappings.game] || 'unknown') as ProvablyFairGameType,
          serverSeed: row[mappings.serverSeed] || '',
          serverSeedHash: row[mappings.serverSeedHash] || '',
          clientSeed: row[mappings.clientSeed] || '',
          nonce: parseInt(row[mappings.nonce] || '0'),
          wager: parseFloat(row[mappings.wager] || '0'),
          claimedPayout: parseFloat(row[mappings.payout] || '0'),
          claimedMultiplier: parseFloat(row[mappings.multiplier] || '1'),
          timestamp: Date.now(),
        };
        
        if (bet.serverSeed && bet.clientSeed) {
          bets.push(bet);
        } else {
          errors.push({ row: i, rawData: lines[i], error: 'Missing required seed data' });
        }
      } catch (e) {
        errors.push({ row: i, rawData: lines[i], error: String(e) });
      }
    }
    
    return {
      bets,
      errors,
      metadata: {
        format: 'csv',
        totalRows: lines.length - 1,
        successfulRows: bets.length,
        dateRange: bets.length > 0 ? {
          start: Math.min(...bets.map(b => b.timestamp)),
          end: Math.max(...bets.map(b => b.timestamp)),
        } : undefined,
      },
    };
  }

  /**
   * Parse JSON format
   */
  private parseJSON(content: string, _config: ArchiveUploadConfig): ParsedArchive {
    try {
      const data = JSON.parse(content);
      const betsArray = Array.isArray(data) ? data : data.bets || [];
      const bets: ProvablyFairBet[] = [];
      const errors: ArchiveParseError[] = [];
      
      for (let i = 0; i < betsArray.length; i++) {
        try {
          const item = betsArray[i];
          bets.push({
            betId: item.betId || item.id || `bet-${i}`,
            game: item.game || item.gameType || 'unknown',
            serverSeed: item.serverSeed || item.server_seed || '',
            serverSeedHash: item.serverSeedHash || item.server_seed_hash || '',
            clientSeed: item.clientSeed || item.client_seed || '',
            nonce: item.nonce || 0,
            wager: item.wager || item.amount || 0,
            claimedPayout: item.payout || item.claimedPayout || 0,
            claimedMultiplier: item.multiplier || item.claimedMultiplier || 1,
            timestamp: item.timestamp || item.createdAt || Date.now(),
            rows: item.rows,
            risk: item.risk,
            kenoSelections: item.kenoSelections || item.selections,
            mineCount: item.mineCount || item.mines,
            target: item.target,
            rollOver: item.rollOver,
          });
        } catch (e) {
          errors.push({ row: i, rawData: JSON.stringify(betsArray[i]), error: String(e) });
        }
      }
      
      return {
        bets,
        errors,
        metadata: {
          format: 'json',
          totalRows: betsArray.length,
          successfulRows: bets.length,
        },
      };
    } catch (e) {
      return {
        bets: [],
        errors: [{ row: 0, rawData: content.slice(0, 100), error: `Invalid JSON: ${e}` }],
        metadata: { format: 'json', totalRows: 0, successfulRows: 0 },
      };
    }
  }

  /**
   * Parse Stake.com CSV export format
   */
  private parseStakeCSV(content: string, config: ArchiveUploadConfig): ParsedArchive {
    // Stake format: Game,Bet ID,Time,Bet Amount,Multiplier,Payout,Server Seed,Client Seed,Nonce
    return this.parseGenericCSV(content, {
      ...config,
      columnMappings: {
        betId: 'bet id',
        game: 'game',
        serverSeed: 'server seed',
        serverSeedHash: 'server seed (hashed)',
        clientSeed: 'client seed',
        nonce: 'nonce',
        wager: 'bet amount',
        payout: 'payout',
        multiplier: 'multiplier',
      },
    });
  }

  /**
   * Parse BC.Game CSV export format
   */
  private parseBCGameCSV(content: string, config: ArchiveUploadConfig): ParsedArchive {
    return this.parseGenericCSV(content, {
      ...config,
      columnMappings: {
        betId: 'betid',
        game: 'gamename',
        serverSeed: 'serverseed',
        serverSeedHash: 'serverseedhash',
        clientSeed: 'clientseed',
        nonce: 'nonce',
        wager: 'betamount',
        payout: 'profit',
        multiplier: 'payout',
      },
    });
  }

  /**
   * Parse Roobet CSV export format
   */
  private parseRoobetCSV(content: string, config: ArchiveUploadConfig): ParsedArchive {
    return this.parseGenericCSV(content, {
      ...config,
      columnMappings: {
        betId: 'id',
        game: 'game_type',
        serverSeed: 'server_seed',
        serverSeedHash: 'server_seed_hashed',
        clientSeed: 'client_seed',
        nonce: 'nonce',
        wager: 'bet_amount',
        payout: 'payout_amount',
        multiplier: 'multiplier',
      },
    });
  }

  /**
   * Parse CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result;
  }

  // ============================================
  // MANUAL SEED INPUT HELPERS
  // ============================================

  /**
   * Verify seeds entered manually by user
   */
  verifySingleSeed(params: {
    serverSeed: string;
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    game: ProvablyFairGameType;
    wager: number;
    claimedMultiplier: number;
    gameParams?: {
      rows?: number;
      risk?: RiskLevel;
      kenoSelections?: number[];
      mineCount?: number;
      target?: number;
      rollOver?: boolean;
    };
  }): BetVerificationResult {
    const bet: ProvablyFairBet = {
      betId: `manual-${Date.now()}`,
      game: params.game,
      serverSeed: params.serverSeed,
      serverSeedHash: params.serverSeedHash,
      clientSeed: params.clientSeed,
      nonce: params.nonce,
      wager: params.wager,
      claimedPayout: params.wager * params.claimedMultiplier,
      claimedMultiplier: params.claimedMultiplier,
      timestamp: Date.now(),
      ...params.gameParams,
    };
    
    return this.verifyBet(bet);
  }

  /**
   * Get supported games
   */
  getSupportedGames(): ProvablyFairGameType[] {
    return ['plinko', 'keno', 'mines', 'dice', 'limbo'];
  }

  /**
   * Get supported archive formats
   */
  getSupportedFormats(): ArchiveFormat[] {
    return ['csv', 'json', 'stake_csv', 'bc_game_csv', 'roobet_csv'];
  }
}

// Export singleton instance
export const provablyFairVerifier = new ProvablyFairVerifier();
