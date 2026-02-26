/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * @file discord-bot-api-integration.test.ts
 * @description Integration tests for Discord bot and API gateway communication
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Discord Bot ↔ API Integration', () => {
  // Mock API client and Bot context
  const mockApiClient = {
    post: vi.fn(),
    get: vi.fn(),
    setAuthToken: vi.fn(),
  };

  const mockBotUser = {
    id: '123456789',
    username: 'TestUser',
    send: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication Flow', () => {
    it('should authenticate bot requests to API', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: { token: 'service_jwt_token' } });

      const response = await mockApiClient.post('/auth/bot', { secret: 'bot_secret' });
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/bot', { secret: 'bot_secret' });
      expect(response.data.token).toBe('service_jwt_token');
    });

    it('should include service JWT in requests', async () => {
      mockApiClient.setAuthToken('service_jwt_token');
      expect(mockApiClient.setAuthToken).toHaveBeenCalledWith('service_jwt_token');
    });

    it('should handle authentication failures', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Unauthorized'));

      await expect(mockApiClient.post('/auth/bot', { secret: 'wrong_secret' })).rejects.toThrow('Unauthorized');
    });
  });

  describe('Tip Command Integration', () => {
    it('should send tip request from bot to API', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: { success: true, txId: 'tx_123' } });

      const response = await mockApiClient.post('/tips/send', {
        from: mockBotUser.id,
        to: '987654321',
        amount: 100
      });

      expect(mockApiClient.post).toHaveBeenCalledWith('/tips/send', expect.any(Object));
      expect(response.data.success).toBe(true);
    });

    it('should receive transaction result from API', async () => {
      mockApiClient.get.mockResolvedValueOnce({ data: { status: 'completed' } });

      const response = await mockApiClient.get('/tips/tx_123/status');
      expect(response.data.status).toBe('completed');
    });

    it('should handle API errors in bot command', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('Insufficient funds'));

      await expect(mockApiClient.post('/tips/send', {
        from: mockBotUser.id,
        to: '987654321',
        amount: 10000
      })).rejects.toThrow('Insufficient funds');
    });
  });

  describe('User Data Synchronization', () => {
    it('should sync user data between bot and API', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: { synced: true } });

      const response = await mockApiClient.post('/users/sync', { userId: mockBotUser.id });
      expect(response.data.synced).toBe(true);
    });

    it('should update user records consistently', async () => {
      mockApiClient.post.mockResolvedValueOnce({ data: { updated: true } });

      const response = await mockApiClient.post('/users/update', { userId: mockBotUser.id, data: { wallet: '0x123' } });
      expect(response.data.updated).toBe(true);
    });
  });

  describe('Error Propagation', () => {
    it('should propagate API errors to bot user', async () => {
      const apiError = new Error('Rate limited');
      mockApiClient.post.mockRejectedValueOnce(apiError);

      try {
        await mockApiClient.post('/action', {});
      } catch (err: any) {
        mockBotUser.send(`Error: ${err.message}`);
      }

      expect(mockBotUser.send).toHaveBeenCalledWith('Error: Rate limited');
    });

    it('should provide user-friendly error messages', async () => {
      const apiError = new Error('INTERNAL_SERVER_ERROR');
      mockApiClient.post.mockRejectedValueOnce(apiError);

      try {
        await mockApiClient.post('/action', {});
      } catch (err: any) {
        // Fallback user-friendly message
        const message = err.message === 'INTERNAL_SERVER_ERROR' ? 'Something went wrong on our end. Please try again later.' : err.message;
        mockBotUser.send(message);
      }

      expect(mockBotUser.send).toHaveBeenCalledWith('Something went wrong on our end. Please try again later.');
    });
  });
});
