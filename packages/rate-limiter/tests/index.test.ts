import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRateLimiter } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(overrides: Partial<{ ip: string; headers: Record<string, string> }> = {}) {
  return {
    ip: '127.0.0.1',
    headers: {},
    ...overrides,
  };
}

function makeRes() {
  const res = {
    _status: 0,
    _body: null as unknown,
    _headers: {} as Record<string, string>,
    statusCode: 200,
    status(code: number) {
      res._status = code;
      res.statusCode = code;
      return res;
    },
    json(body: unknown) {
      res._body = body;
    },
    setHeader(name: string, value: string) {
      res._headers[name.toLowerCase()] = value;
    },
  };
  return res;
}

function makeNext() {
  const fn = vi.fn();
  return fn;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createRateLimiter', () => {
  it('throws for invalid windowMs', () => {
    expect(() => createRateLimiter({ windowMs: 0, max: 10 })).toThrow(RangeError);
    expect(() => createRateLimiter({ windowMs: -1000, max: 10 })).toThrow(RangeError);
  });

  it('throws for invalid max', () => {
    expect(() => createRateLimiter({ windowMs: 1000, max: 0 })).toThrow(RangeError);
    expect(() => createRateLimiter({ windowMs: 1000, max: -5 })).toThrow(RangeError);
  });

  it('allows requests below the limit', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
    const req = makeReq();

    for (let i = 0; i < 3; i++) {
      const next = makeNext();
      const res = makeRes();
      limiter(req, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res._status).toBe(0); // status() not called
    }
  });

  it('blocks the request that exceeds the limit and returns 429', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    const req = makeReq();

    // First two succeed
    limiter(req, makeRes(), makeNext());
    limiter(req, makeRes(), makeNext());

    // Third should be blocked
    const res = makeRes();
    const next = makeNext();
    limiter(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(429);
    expect((res._body as { error: string }).error).toBe('Too Many Requests');
    expect(typeof (res._body as { retryAfter: number }).retryAfter).toBe('number');
    expect((res._body as { retryAfter: number }).retryAfter).toBeGreaterThan(0);
  });

  it('sets the Retry-After header when blocked', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });
    const req = makeReq();

    limiter(req, makeRes(), makeNext()); // consume the single slot

    const res = makeRes();
    limiter(req, res, makeNext());

    expect(res._headers['retry-after']).toBeDefined();
    expect(Number(res._headers['retry-after'])).toBeGreaterThan(0);
  });

  it('isolates limits by IP address', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });

    const req1 = makeReq({ ip: '1.1.1.1' });
    const req2 = makeReq({ ip: '2.2.2.2' });

    const next1 = makeNext();
    limiter(req1, makeRes(), next1);
    expect(next1).toHaveBeenCalledOnce();

    // req2 should still be allowed even though req1 hit the limit
    const next2 = makeNext();
    limiter(req2, makeRes(), next2);
    expect(next2).toHaveBeenCalledOnce();

    // req1 is now blocked
    const next1b = makeNext();
    const res1b = makeRes();
    limiter(req1, res1b, next1b);
    expect(next1b).not.toHaveBeenCalled();
    expect(res1b._status).toBe(429);
  });

  it('uses x-forwarded-for header as key when present', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });

    const req = makeReq({ headers: { 'x-forwarded-for': '10.0.0.5, 192.168.1.1' } });

    limiter(req, makeRes(), makeNext()); // consume slot for 10.0.0.5

    const res = makeRes();
    const next = makeNext();
    limiter(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(429);
  });

  it('supports a custom keyFn', () => {
    const limiter = createRateLimiter({
      windowMs: 60_000,
      max: 1,
      keyFn: (req) => (req.headers['x-user-id'] as string) ?? 'anon',
    });

    const reqA = makeReq({ headers: { 'x-user-id': 'user-a' } });
    const reqB = makeReq({ headers: { 'x-user-id': 'user-b' } });

    limiter(reqA, makeRes(), makeNext()); // user-a hits max

    const nextA = makeNext();
    const resA = makeRes();
    limiter(reqA, resA, nextA);
    expect(nextA).not.toHaveBeenCalled();
    expect(resA._status).toBe(429);

    // user-b is unaffected
    const nextB = makeNext();
    limiter(reqB, makeRes(), nextB);
    expect(nextB).toHaveBeenCalledOnce();
  });

  it('resets the window after windowMs elapses', async () => {
    const windowMs = 50; // very short window for testing
    const limiter = createRateLimiter({ windowMs, max: 1 });
    const req = makeReq();

    limiter(req, makeRes(), makeNext()); // fills the window

    // Wait for the window to expire
    await new Promise((resolve) => setTimeout(resolve, windowMs + 10));

    const next = makeNext();
    const res = makeRes();
    limiter(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res._status).toBe(0);
  });

  it('handles unknown IP gracefully (falls back to "unknown")', () => {
    const limiter = createRateLimiter({ windowMs: 60_000, max: 2 });
    const req = { headers: {} }; // no ip, no x-forwarded-for

    const next1 = makeNext();
    limiter(req, makeRes(), next1);
    expect(next1).toHaveBeenCalledOnce();

    const next2 = makeNext();
    limiter(req, makeRes(), next2);
    expect(next2).toHaveBeenCalledOnce();

    // Now blocked under key "unknown"
    const next3 = makeNext();
    const res3 = makeRes();
    limiter(req, res3, next3);
    expect(next3).not.toHaveBeenCalled();
    expect(res3._status).toBe(429);
  });
});
