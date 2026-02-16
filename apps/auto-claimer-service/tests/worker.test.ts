import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaimWorker } from '../src/worker.js';
import type { ClaimerDatabase, ClaimHistory } from '../src/types.js';

// Mock BullMQ
vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation(function(queueName, processor, options) {
    return {
      on: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    };
  }),
  Job: vi.fn(),
}));

// Mock the Stake module
vi.mock('@tiltcheck/stake', () => ({
  StakeClient: vi.fn().mockImplementation(function() {
    return {
      checkEligibility: vi.fn().mockResolvedValue({
        eligible: true,
        reason: 'Eligible',
      }),
      claimCode: vi.fn().mockResolvedValue({
        success: true,
        reward: {
          type: 'bonus',
          amount: 10,
          currency: 'USD',
        },
      }),
    };
  }),
}));

describe('ClaimWorker', () => {
  let database: ClaimerDatabase;
  let worker: ClaimWorker;

  beforeEach(() => {
    // Create a mock database
    database = {
      getUserApiKey: vi.fn().mockResolvedValue('test-api-key'),
      saveClaimHistory: vi.fn().mockResolvedValue(undefined),
      getClaimHistory: vi.fn().mockResolvedValue([]),
      checkRateLimit: vi.fn().mockResolvedValue(true),
      incrementRateLimit: vi.fn().mockResolvedValue(undefined),
    };

    worker = new ClaimWorker(database);
  });

  it('should create a worker instance', () => {
    expect(worker).toBeDefined();
  });

  it('should start and stop worker', async () => {
    await worker.start('redis://localhost:6379');
    await worker.stop();
  });

  it('should process a successful claim job', async () => {
    const job = {
      id: 'job-1',
      data: {
        userId: 'user-123',
        code: 'TESTCODE',
      },
    } as any;

    await worker.processJob(job);

    expect(database.checkRateLimit).toHaveBeenCalledWith('user-123');
    expect(database.getUserApiKey).toHaveBeenCalledWith('user-123');
    expect(database.saveClaimHistory).toHaveBeenCalled();
  });

  it('should handle rate limit exceeded', async () => {
    database.checkRateLimit = vi.fn().mockResolvedValue(false);

    const job = {
      id: 'job-2',
      data: {
        userId: 'user-456',
        code: 'TESTCODE',
      },
    } as any;

    await expect(worker.processJob(job)).rejects.toThrow('Rate limit exceeded');
    expect(database.saveClaimHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        reason: 'Rate limit exceeded',
      })
    );
  });

  it('should handle missing API key', async () => {
    database.getUserApiKey = vi.fn().mockResolvedValue(null);

    const job = {
      id: 'job-3',
      data: {
        userId: 'user-789',
        code: 'TESTCODE',
      },
    } as any;

    await expect(worker.processJob(job)).rejects.toThrow('API key not found');
    expect(database.saveClaimHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        reason: 'API key not found',
      })
    );
  });

  it('should handle user not eligible', async () => {
    const { StakeClient } = await import('@tiltcheck/stake');
    vi.mocked(StakeClient).mockImplementationOnce(function() {
      return {
        checkEligibility: vi.fn().mockResolvedValue({
          eligible: false,
          reason: 'Already claimed',
        }),
        claimCode: vi.fn(),
      } as any;
    });

    const job = {
      id: 'job-4',
      data: {
        userId: 'user-999',
        code: 'TESTCODE',
      },
    } as any;

    await worker.processJob(job);

    expect(database.saveClaimHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'skipped',
        reason: 'Already claimed',
      })
    );
  });

  it('should handle claim failure', async () => {
    const { StakeClient } = await import('@tiltcheck/stake');
    vi.mocked(StakeClient).mockImplementationOnce(function() {
      return {
        checkEligibility: vi.fn().mockResolvedValue({
          eligible: true,
        }),
        claimCode: vi.fn().mockResolvedValue({
          success: false,
          error: 'Code expired',
        }),
      } as any;
    });

    const job = {
      id: 'job-5',
      data: {
        userId: 'user-111',
        code: 'EXPIREDCODE',
      },
    } as any;

    await worker.processJob(job);

    expect(database.saveClaimHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        reason: 'Code expired',
      })
    );
  });

  it('should save reward information on successful claim', async () => {
    const { StakeClient } = await import('@tiltcheck/stake');
    vi.mocked(StakeClient).mockImplementationOnce(function() {
      return {
        checkEligibility: vi.fn().mockResolvedValue({
          eligible: true,
        }),
        claimCode: vi.fn().mockResolvedValue({
          success: true,
          reward: {
            type: 'freespins',
            amount: 50,
            currency: 'spins',
          },
        }),
      } as any;
    });

    const job = {
      id: 'job-6',
      data: {
        userId: 'user-222',
        code: 'SPINCODE',
      },
    } as any;

    await worker.processJob(job);

    expect(database.saveClaimHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'claimed',
        rewardType: 'freespins',
        rewardAmount: 50,
        rewardCurrency: 'spins',
      })
    );
  });

  it('should increment rate limit on processing', async () => {
    const job = {
      id: 'job-7',
      data: {
        userId: 'user-333',
        code: 'TESTCODE',
      },
    } as any;

    await worker.processJob(job);

    expect(database.incrementRateLimit).toHaveBeenCalledWith('user-333');
  });

  it('should handle unexpected errors', async () => {
    database.getUserApiKey = vi.fn().mockRejectedValue(new Error('Database connection failed'));

    const job = {
      id: 'job-8',
      data: {
        userId: 'user-444',
        code: 'TESTCODE',
      },
    } as any;

    await expect(worker.processJob(job)).rejects.toThrow('Database connection failed');
    expect(database.saveClaimHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        reason: 'Database connection failed',
      })
    );
  });
});
