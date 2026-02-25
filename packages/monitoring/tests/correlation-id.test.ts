import { describe, it, expect, vi } from 'vitest';
import { correlationIdMiddleware } from '../src/correlation-id';
import type { Request, Response, NextFunction } from 'express';

describe('Correlation ID Middleware', () => {
    it('should add a correlation ID to the request and response', () => {
        const middleware = correlationIdMiddleware();
        const req = {
            get: vi.fn().mockReturnValue(undefined),
            headers: {},
        } as unknown as Request;
        const res = {
            setHeader: vi.fn(),
        } as unknown as Response;
        const next = vi.fn() as NextFunction;

        middleware(req, res, next);

        expect(req.id).toBeDefined();
        expect(typeof req.id).toBe('string');
        expect(req.headers['x-correlation-id']).toBe(req.id);
        expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', req.id);
        expect(req.log).toBeDefined();
        expect(next).toHaveBeenCalled();
    });

    it('should use an existing correlation ID from headers', () => {
        const existingId = 'existing-id';
        const middleware = correlationIdMiddleware();
        const req = {
            get: vi.fn().mockReturnValue(existingId),
            headers: { 'x-correlation-id': existingId },
        } as unknown as Request;
        const res = {
            setHeader: vi.fn(),
        } as unknown as Response;
        const next = vi.fn() as NextFunction;

        middleware(req, res, next);

        expect(req.id).toBe(existingId);
        expect(req.headers['x-correlation-id']).toBe(existingId);
        expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', existingId);
        expect(next).toHaveBeenCalled();
    });

    it('should use a custom header name if provided', () => {
        const headerName = 'x-custom-id';
        const middleware = correlationIdMiddleware({ headerName });
        const req = {
            get: vi.fn().mockReturnValue(undefined),
            headers: {},
        } as unknown as Request;
        const res = {
            setHeader: vi.fn(),
        } as unknown as Response;
        const next = vi.fn() as NextFunction;

        middleware(req, res, next);

        expect(req.headers[headerName]).toBe(req.id);
        expect(res.setHeader).toHaveBeenCalledWith(headerName, req.id);
    });

    it('should use a custom ID generator if provided', () => {
        const customId = 'custom-generated-id';
        const generateId = vi.fn().mockReturnValue(customId);
        const middleware = correlationIdMiddleware({ generateId });
        const req = {
            get: vi.fn().mockReturnValue(undefined),
            headers: {},
        } as unknown as Request;
        const res = {
            setHeader: vi.fn(),
        } as unknown as Response;
        const next = vi.fn() as NextFunction;

        middleware(req, res, next);

        expect(req.id).toBe(customId);
        expect(generateId).toHaveBeenCalled();
    });
});
