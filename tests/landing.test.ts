import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';

describe('Landing Server Integration', () => {
  let serverProcess: any;
  const PORT = 8081; // Use different port to avoid conflicts
  const baseURL = `http://localhost:${PORT}`;

  beforeAll(async () => {
    // Start landing server on alternate port
    return new Promise((resolve, reject) => {
      serverProcess = spawn('node', ['services/landing/server.js'], {
        cwd: path.resolve(__dirname, '..'),
        env: { 
          ...process.env, 
          PORT: PORT.toString(),
          LANDING_LOG_PATH: '/tmp/landing-test.log',
          ADMIN_IP_1: '127.0.0.1',
        },
      });

      serverProcess.stdout.on('data', (data: Buffer) => {
        if (data.toString().includes('listening on port')) {
          setTimeout(resolve, 500); // Give server time to fully start
        }
      });

      serverProcess.stderr.on('data', (data: Buffer) => {
        console.error('Server error:', data.toString());
      });

      setTimeout(() => reject(new Error('Server start timeout')), 5000);
    });
  });

  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });

  describe('Public Endpoints', () => {
    it('GET /health returns 200 with status ok', async () => {
      const res = await fetch(`${baseURL}/health`);
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.status).toBe('ok');
      expect(json.service).toBe('landing');
      expect(json.ts).toBeTypeOf('number');
    });

    it('GET /metrics returns JSON with service, ts, topPaths, topUAs', async () => {
      const res = await fetch(`${baseURL}/metrics`);
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.service).toBe('landing');
      expect(json.ts).toBeTypeOf('number');
      expect(Array.isArray(json.topPaths)).toBe(true);
      expect(Array.isArray(json.topUAs)).toBe(true);
    });

    it('GET /data/casino_data_latest.csv serves CSV or 404', async () => {
      const res = await fetch(`${baseURL}/data/casino_data_latest.csv`);
      // Either 200 with CSV or 404 if no data exists
      expect([200, 404]).toContain(res.status);
      if (res.status === 200) {
        const text = await res.text();
        expect(text.length).toBeGreaterThan(0);
      }
    });

    it('GET / returns HTML homepage', async () => {
      const res = await fetch(`${baseURL}/`);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('<!DOCTYPE html>');
    });
  });

  describe('Admin Routes - IP Allowlist', () => {
    it('GET /control-room allows localhost (200)', async () => {
      const res = await fetch(`${baseURL}/control-room`);
      // Localhost should be in allowlist by default
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text).toContain('<!DOCTYPE html>');
    });

    it('GET /admin/status allows localhost and returns service list', async () => {
      const res = await fetch(`${baseURL}/admin/status`);
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.timestamp).toBeTypeOf('number');
      expect(Array.isArray(json.services)).toBe(true);
      expect(json.services.length).toBeGreaterThan(0);
      expect(json.metrics.uptime).toBeTypeOf('number');
    });

    it('GET /admin/sitemap allows localhost and returns site structure', async () => {
      const res = await fetch(`${baseURL}/admin/sitemap`);
      expect(res.status).toBe(200);
      const json: any = await res.json();
      expect(json.timestamp).toBeTypeOf('number');
      expect(json.stats).toBeDefined();
      expect(json.structure).toBeDefined();
      expect(json.deployment).toBeDefined();
    });

    // Note: Testing unauthorized IP requires proxy/network manipulation
    // Skipping in integration test - covered by manual testing
  });

  describe('404 Handler', () => {
    it('GET /nonexistent returns 404 JSON', async () => {
      const res = await fetch(`${baseURL}/nonexistent-route-12345`);
      expect(res.status).toBe(404);
      const json: any = await res.json();
      expect(json.error).toBe('Not Found');
      expect(json.path).toBe('/nonexistent-route-12345');
    });
  });
});
