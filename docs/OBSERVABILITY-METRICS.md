© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-02

Observability: Trivia metrics and Sentry

This document describes how to scrape Prometheus metrics exposed by the Game Arena (trivia) service and the Sentry instrumentation added for persistence errors.

Endpoints
- Game Arena metrics: GET /metrics (prometheus text format)
- Game Arena health: GET /health
- Persistence snapshot status (programmatic): triviaManager.getPersistenceStatus() (internal API)

Metrics added (prometheus names)
- trivia_snapshot_saves_total
  - Counter: increments each time a trivia snapshot is durably saved (Redis or file).
- trivia_snapshot_restore_sources_total{source}
  - Counter: increments when a snapshot is restored (labels: source="redis" or source="file").
- trivia_persistence_errors_total{operation}
  - Counter: increments when persistence operations fail (labels: operation="persist"|"restore").
- trivia_timer_lag_seconds
  - Gauge: measures observed timer lag (seconds) during restore (positive if scheduled time is in the future, negative if in the past).
- trivia_answers_submitted_total
  - Counter: total answers submitted (use rate() in Prometheus to compute answers/sec).
- trivia_active_games
  - Gauge: current number of active trivia games (0 or 1 for the current implementation).

How to scrape
- Configure Prometheus to scrape the Game Arena service at /metrics. Example scrape config:

  - job_name: 'tiltcheck-game-arena'
    metrics_path: /metrics
    static_configs:
      - targets: ['game-arena:8080']

- Use Prometheus queries to derive useful signals:
  - Answers per second: rate(trivia_answers_submitted_total[1m])
  - Snapshot saves: increase(trivia_snapshot_saves_total[1d])
  - Persistence errors: increase(trivia_persistence_errors_total[1d])
  - Active games: trivia_active_games

Sentry
- The trivia persistence code will capture exceptions to Sentry if SENTRY_DSN is provided in the environment. This includes Redis restore failures, migration failures, and persistence errors.
- To enable Sentry set SENTRY_DSN in the runtime environment.

Notes
- The metrics are registered on the prom-client global registry and exposed via the /metrics endpoint of the Game Arena service.
- The answers/sec signal is derived from a counter; use Prometheus' rate() function.
- No credentials or secrets are committed. Set SENTRY_DSN in runtime environment only.

