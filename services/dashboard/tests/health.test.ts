import { describe, it, expect, vi } from 'vitest';

// Mock express to avoid external dependency and real HTTP server
vi.mock('express', () => {
  const routes: any[] = [];
  const app = {
    use: vi.fn(),
    get: vi.fn((path: string, handler: Function) => { routes.push({ method: 'GET', path, handler }); }),
    post: vi.fn((path: string, handler: Function) => { routes.push({ method: 'POST', path, handler }); }),
    listen: vi.fn((_port: number, cb?: () => void) => ({ address: () => ({ port: 0 }), close: (cb2?: () => void) => cb2 && cb2() })),
    _routes: routes,
  } as any;
  const express = () => app;
  (express as any).json = () => (req: any, res: any, next: any) => next && next();
  return { default: express };
});

describe('health endpoint', () => {
  it('exposes retentionDays from env', async () => {
    process.env.DASHBOARD_EVENTS_KEEP_DAYS = '9';
    const mod = await import('../src/server');
    const app: any = mod.createServer();
    const route = app._routes.find((r: any) => r.method === 'GET' && r.path === '/api/health');
    let captured: any = null;
    await route.handler({}, { json: (data: any) => { captured = data; } });
    expect(captured.retentionDays).toBe(9);
    delete process.env.DASHBOARD_EVENTS_KEEP_DAYS;
  });
});
