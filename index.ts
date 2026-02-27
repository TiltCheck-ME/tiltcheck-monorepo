// v0.1.0 — 2026-02-25
/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */

import { Request, Response, NextFunction } from 'express';

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found' });
};

export type Middleware = (req: Request, res: Response, next: NextFunction) => void;

/**
 * Runtime constant to ensure this file is emitted as a module.
 */
export const EXPRESS_UTILS_VERSION = '0.1.0';