// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-15
// Next.js instrumentation hook — runs once per server boot, before any route handling.
// See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  // Only initialise Sentry on the Node.js runtime (server-side).
  // Edge runtime has a separate @sentry/nextjs path; add that here if edge routes are added.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { init } = await import('@sentry/nextjs');
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

    if (!dsn) {
      console.warn('[Sentry] No DSN configured — error tracking is disabled. Set NEXT_PUBLIC_SENTRY_DSN to enable.');
      return;
    }

    init({
      dsn,
      environment: process.env.NODE_ENV ?? 'development',
      serverName: 'web',
      // Capture 100% of traces in production; dial down if volume gets heavy.
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
      // Reduce noise from expected errors.
      ignoreErrors: [
        'NEXT_NOT_FOUND',
        'NEXT_REDIRECT',
      ],
    });
  }
}
