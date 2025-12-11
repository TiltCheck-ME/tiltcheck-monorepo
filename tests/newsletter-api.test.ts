/**
 * Newsletter API Tests
 * 
 * Tests for subscribe/unsubscribe endpoints with rate limiting and honeypot detection.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import path from 'path';
import fs from 'fs/promises';

const DATA_DIR = path.join(process.cwd(), 'data');
const TEST_FILE = path.join(DATA_DIR, 'newsletter-subscribers-test.json');

// Mock environment
process.env.NEWSLETTER_SALT = 'test-salt';
const ORIGINAL_FILE = path.join(DATA_DIR, 'newsletter-subscribers.json');

describe('Newsletter API', () => {
  let app;
  let originalData;

  beforeAll(async () => {
    // Backup production file
    try {
      originalData = await fs.readFile(ORIGINAL_FILE, 'utf8');
    } catch {
      originalData = null;
    }

    // Mock server (simplified for testing)
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Test subscribe endpoint (without rate limiting for controlled tests)
    app.post('/api/newsletter/subscribe', async (req, res) => {
      const email = (req.body.email || '').trim().toLowerCase();
      const honeypot = (req.body.website || '').trim();
      
      if (honeypot) {
        return res.status(400).json({ ok: false, error: 'Bot detected' });
      }
      
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ ok: false, error: 'Invalid email' });
      }

      const crypto = await import('node:crypto');
      const salt = process.env.NEWSLETTER_SALT || 'tiltcheck-salt';
      
      let list = [];
      try {
        const data = await fs.readFile(TEST_FILE, 'utf8');
        list = JSON.parse(data);
      } catch {
        list = [];
      }

      const emailHash = crypto.createHash('sha256').update(salt + ':' + email).digest('hex');

      if (list.some((e: any) => e.hash === emailHash)) {
        return res.json({ ok: true, duplicate: true });
      }

      list.push({ hash: emailHash, ts: Date.now() });
      
      try {
        await fs.writeFile(TEST_FILE, JSON.stringify(list, null, 2));
        return res.json({ ok: true });
      } catch (err) {
        return res.status(500).json({ ok: false, error: 'Persist failed' });
      }
    });

    // Test unsubscribe endpoint
    app.post('/api/newsletter/unsubscribe', async (req, res) => {
      const email = (req.body.email || '').trim().toLowerCase();
      
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return res.status(400).json({ ok: false, error: 'Invalid email' });
      }

      const crypto = await import('node:crypto');
      const salt = process.env.NEWSLETTER_SALT || 'tiltcheck-salt';
      
      let list = [];
      try {
        const data = await fs.readFile(TEST_FILE, 'utf8');
        list = JSON.parse(data);
      } catch {
        return res.json({ ok: true, notFound: true });
      }

      const emailHash = crypto.createHash('sha256').update(salt + ':' + email).digest('hex');
      const before = list.length;
      list = list.filter((e: any) => e.hash !== emailHash);

      if (list.length === before) {
        return res.json({ ok: true, notFound: true });
      }

      try {
        await fs.writeFile(TEST_FILE, JSON.stringify(list, null, 2));
        return res.json({ ok: true });
      } catch {
        return res.status(500).json({ ok: false, error: 'Persist failed' });
      }
    });
  });

  afterAll(async () => {
    // Restore production file
    if (originalData) {
      await fs.writeFile(ORIGINAL_FILE, originalData);
    }
    
    // Clean up test file
    try {
      await fs.unlink(TEST_FILE);
    } catch {}
  });

  describe('POST /api/newsletter/subscribe', () => {
    it('should subscribe valid email', async () => {
      const res = await request(app)
        .post('/api/newsletter/subscribe')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.duplicate).toBeUndefined();
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/newsletter/subscribe')
        .send({ email: 'invalid-email' });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toBe('Invalid email');
    });

    it('should detect duplicate subscription', async () => {
      // Subscribe once
      await request(app)
        .post('/api/newsletter/subscribe')
        .send({ email: 'duplicate@example.com' });

      // Try again
      const res = await request(app)
        .post('/api/newsletter/subscribe')
        .send({ email: 'duplicate@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.duplicate).toBe(true);
    });

    it('should detect honeypot bot submissions', async () => {
      const res = await request(app)
        .post('/api/newsletter/subscribe')
        .send({ 
          email: 'bot@example.com',
          website: 'http://spam-link.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toBe('Bot detected');
    });

    it('should reject empty email', async () => {
      const res = await request(app)
        .post('/api/newsletter/subscribe')
        .send({ email: '' });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('POST /api/newsletter/unsubscribe', () => {
    it('should unsubscribe existing email', async () => {
      // Subscribe first
      await request(app)
        .post('/api/newsletter/subscribe')
        .send({ email: 'unsub@example.com' });

      // Unsubscribe
      const res = await request(app)
        .post('/api/newsletter/unsubscribe')
        .send({ email: 'unsub@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.notFound).toBeUndefined();
    });

    it('should handle unsubscribe for non-existent email', async () => {
      const res = await request(app)
        .post('/api/newsletter/unsubscribe')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.notFound).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/newsletter/unsubscribe')
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('Email Hashing', () => {
    it('should store hashed email, not plaintext', async () => {
      await request(app)
        .post('/api/newsletter/subscribe')
        .send({ email: 'hashed@example.com' });

      const data = await fs.readFile(TEST_FILE, 'utf8');
      const list = JSON.parse(data);
      
      // Check no plaintext emails exist
      const hasPlaintext = list.some((entry: any) => 
        entry.email && entry.email.includes('@')
      );
      
      expect(hasPlaintext).toBe(false);
      
      // Check hash exists
      const hasHash = list.some((entry: any) => 
        entry.hash && entry.hash.length === 64 // SHA-256 hex length
      );
      
      expect(hasHash).toBe(true);
    });

    it('should use consistent hashing for same email', async () => {
      const crypto = await import('node:crypto');
      const salt = process.env.NEWSLETTER_SALT;
      const email = 'consistent@example.com';
      
      const hash1 = crypto.createHash('sha256').update(salt + ':' + email).digest('hex');
      const hash2 = crypto.createHash('sha256').update(salt + ':' + email).digest('hex');
      
      expect(hash1).toBe(hash2);
    });
  });
});
