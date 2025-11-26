import { describe, it, expect } from 'vitest';
import { ProvablyFairVerifier } from '../src/provably-fair/verifier.js';
import type { ProvablyFairBet } from '../src/provably-fair/types.js';

describe('ProvablyFairVerifier', () => {
  const verifier = new ProvablyFairVerifier();

  describe('verifySingleSeed', () => {
    it('should verify a Plinko bet with manual seed input', () => {
      const result = verifier.verifySingleSeed({
        serverSeed: 'abc123def456',
        serverSeedHash: '0000000000000000000000000000000000000000000000000000000006b93ac3',
        clientSeed: 'my-client-seed',
        nonce: 1,
        game: 'plinko',
        wager: 1.00,
        claimedMultiplier: 110,
        gameParams: {
          rows: 16,
          risk: 'high',
        },
      });

      expect(result.bet.game).toBe('plinko');
      expect(result.bet.wager).toBe(1.00);
      expect(result.calculatedOutcome).toBeDefined();
      expect(result.calculatedOutcome.hash).toBeDefined();
      expect(result.message).toBeDefined();
    });

    it('should verify a Dice bet', () => {
      const result = verifier.verifySingleSeed({
        serverSeed: 'server-seed-123',
        serverSeedHash: 'hashed-seed',
        clientSeed: 'client-seed-456',
        nonce: 5,
        game: 'dice',
        wager: 10.00,
        claimedMultiplier: 2.0,
        gameParams: {
          target: 50,
          rollOver: true,
        },
      });

      expect(result.bet.game).toBe('dice');
      expect(result.calculatedOutcome.result).toBeDefined();
    });

    it('should verify a Keno bet', () => {
      const result = verifier.verifySingleSeed({
        serverSeed: 'keno-server-seed',
        serverSeedHash: 'keno-hash',
        clientSeed: 'keno-client',
        nonce: 10,
        game: 'keno',
        wager: 5.00,
        claimedMultiplier: 3.8,
        gameParams: {
          kenoSelections: [5, 12, 23, 31, 40],
        },
      });

      expect(result.bet.game).toBe('keno');
      expect(result.calculatedOutcome).toBeDefined();
    });
  });

  describe('verifyBatch', () => {
    it('should verify multiple bets and generate summary', () => {
      const bets: ProvablyFairBet[] = [
        {
          betId: 'bet-1',
          game: 'plinko',
          serverSeed: 'seed1',
          serverSeedHash: 'hash1',
          clientSeed: 'client1',
          nonce: 1,
          wager: 1.00,
          claimedPayout: 2.00,
          claimedMultiplier: 2.0,
          timestamp: Date.now(),
          rows: 16,
          risk: 'medium',
        },
        {
          betId: 'bet-2',
          game: 'plinko',
          serverSeed: 'seed2',
          serverSeedHash: 'hash2',
          clientSeed: 'client2',
          nonce: 2,
          wager: 1.00,
          claimedPayout: 0.50,
          claimedMultiplier: 0.5,
          timestamp: Date.now(),
          rows: 16,
          risk: 'medium',
        },
      ];

      const result = verifier.verifyBatch(bets);

      expect(result.totalBets).toBe(2);
      expect(result.totalWagered).toBe(2.00);
      expect(result.totalClaimedPayout).toBe(2.50);
      expect(result.betResults.length).toBe(2);
      expect(result.summary).toBeDefined();
      expect(result.claimedRTP).toBeGreaterThan(0);
    });
  });

  describe('parseArchive', () => {
    it('should parse JSON format archive', () => {
      const jsonData = JSON.stringify([
        {
          betId: 'json-bet-1',
          game: 'plinko',
          serverSeed: 'ss1',
          serverSeedHash: 'ssh1',
          clientSeed: 'cs1',
          nonce: 1,
          wager: 5.00,
          payout: 10.00,
          multiplier: 2.0,
        },
        {
          betId: 'json-bet-2',
          game: 'dice',
          serverSeed: 'ss2',
          serverSeedHash: 'ssh2',
          clientSeed: 'cs2',
          nonce: 2,
          wager: 10.00,
          payout: 0,
          multiplier: 0,
        },
      ]);

      const result = verifier.parseArchive(jsonData, {
        format: 'json',
        casinoId: 'test-casino',
      });

      expect(result.bets.length).toBe(2);
      expect(result.errors.length).toBe(0);
      expect(result.metadata.format).toBe('json');
      expect(result.metadata.successfulRows).toBe(2);
    });

    it('should parse CSV format archive', () => {
      const csvData = `bet_id,game,server_seed,server_seed_hash,client_seed,nonce,wager,payout,multiplier
csv-bet-1,plinko,ss1,ssh1,cs1,1,1.00,2.00,2.0
csv-bet-2,dice,ss2,ssh2,cs2,2,5.00,0,0`;

      const result = verifier.parseArchive(csvData, {
        format: 'csv',
        casinoId: 'test-casino',
      });

      expect(result.bets.length).toBe(2);
      expect(result.metadata.format).toBe('csv');
    });

    it('should handle invalid JSON gracefully', () => {
      const result = verifier.parseArchive('not valid json {{{', {
        format: 'json',
        casinoId: 'test',
      });

      expect(result.bets.length).toBe(0);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].error).toContain('Invalid JSON');
    });
  });

  describe('getSupportedGames', () => {
    it('should return list of supported games', () => {
      const games = verifier.getSupportedGames();

      expect(games).toContain('plinko');
      expect(games).toContain('keno');
      expect(games).toContain('mines');
      expect(games).toContain('dice');
      expect(games).toContain('limbo');
    });
  });

  describe('getSupportedFormats', () => {
    it('should return list of supported archive formats', () => {
      const formats = verifier.getSupportedFormats();

      expect(formats).toContain('csv');
      expect(formats).toContain('json');
      expect(formats).toContain('stake_csv');
      expect(formats).toContain('bc_game_csv');
      expect(formats).toContain('roobet_csv');
    });
  });

  describe('Plinko outcome calculation', () => {
    it('should calculate path and bucket for Plinko', () => {
      const result = verifier.verifySingleSeed({
        serverSeed: 'test-server-seed',
        serverSeedHash: 'test-hash',
        clientSeed: 'test-client-seed',
        nonce: 1,
        game: 'plinko',
        wager: 1.00,
        claimedMultiplier: 1.0,
        gameParams: {
          rows: 8,
          risk: 'low',
        },
      });

      const outcome = result.calculatedOutcome as any;
      expect(outcome.result.path).toBeDefined();
      expect(outcome.result.path.length).toBe(8);
      expect(outcome.result.bucket).toBeGreaterThanOrEqual(0);
      expect(outcome.result.bucket).toBeLessThanOrEqual(8);
    });
  });
});
