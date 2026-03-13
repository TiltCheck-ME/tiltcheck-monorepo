/* Copyright (c) 2026 TiltCheck. All rights reserved. */
// v1.1.0 — 2026-02-26
/**
 * @tiltcheck/api - Central API Gateway
 *
 * The single entry point for all TiltCheck API calls.
 * Handles authentication, session management, and request forwarding.
 */

import { app } from './app.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`[API Gateway] Running on http://${HOST}:${PORT}`);
  console.log(`[API Gateway] Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

