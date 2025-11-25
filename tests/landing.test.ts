import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { createServer } from 'net';

/**
 * Helper to find an available port
 */
function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error('Failed to get port')));
      }
    });
    server.on('error', reject);
  });
}

/**
 * Helper to wait for the server to be ready by polling the health endpoint
 */
async function waitForServer(url: string, maxAttempts = 30, intervalMs = 200): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${url}/health`);
      if (res.ok) {
        return;
      }
    } catch {
      // Server not ready yet, continue polling
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Server at ${url} did not become ready after ${maxAttempts * intervalMs}ms`);
}

describe('Landing Server Integration', () => {
  let serverProcess: ChildProcess | null = null;
  let PORT: number;
  let baseURL: string;

  beforeAll(async () => {
    // Get an available port to avoid conflicts with parallel tests
    PORT = await getAvailablePort();
    baseURL = `http://localhost:${PORT}`;

    // Start landing server on the dynamically assigned port
    serverProcess = spawn('node', ['services/landing/server.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: { 
        ...process.env, 
        PORT: PORT.toString(),
        LANDING_LOG_PATH: `/tmp/landing-test-${PORT}.log`,
        ADMIN_IP_1: '127.0.0.1',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      console.error('Server error:', data.toString());
    });

    // Wait for server to be ready by polling health endpoint
    await waitForServer(baseURL);
  });

  afterAll(async () => {
    if (serverProcess) {
      // Send SIGTERM and wait for process to exit
      await new Promise<void>((resolve) => {
        // Register exit handler before killing to avoid race condition
        const onExit = () => {
          clearTimeout(fallbackTimeout);
          resolve();
        };
        serverProcess!.once('exit', onExit);
        
        // Send graceful shutdown signal
        serverProcess!.kill('SIGTERM');
        
        // Fallback timeout if process doesn't exit gracefully
        const fallbackTimeout = setTimeout(() => {
          if (serverProcess!.exitCode === null) {
            // Process hasn't exited yet, force kill
            serverProcess!.kill('SIGKILL');
          }
          resolve();
        }, 2000);
      });
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
