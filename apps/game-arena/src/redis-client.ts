// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-18

import Redis from 'ioredis';

const redisUrl = process.env.GAME_ARENA_TRIVIA_REDIS_URL || process.env.REDIS_URL || null;
let _client: Redis | null = null;

if (redisUrl) {
  _client = new Redis(redisUrl);
  _client.on('error', (err) => console.warn('[TriviaRedis] Redis client error:', err));
}

export const redisClient = {
  isAvailable(): boolean {
    return !!_client && _client.status === 'ready';
  },

  async getSnapshot(key: string): Promise<string | null> {
    if (!_client) return null;
    return _client.get(key);
  },

  async setSnapshot(key: string, json: string): Promise<void> {
    if (!_client) throw new Error('Redis client not available');
    await _client.set(key, json);
  },

  async publish(channel: string, message: unknown): Promise<void> {
    if (!_client) throw new Error('Redis client not available');
    await _client.publish(channel, typeof message === 'string' ? message : JSON.stringify(message));
  },

  raw(): Redis | null {
    return _client;
  },

  async quit(): Promise<void> {
    if (_client) {
      await _client.quit();
      _client = null;
    }
  },
};
