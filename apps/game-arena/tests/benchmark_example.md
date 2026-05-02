© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-02

Example benchmark (sample run)
- Scenario: ramp to 1000 VUs over 10 minutes
- Duration: ~13 minutes

Summary metrics
- Total requests: 1,234,567
- 95th percentile request duration: 420ms
- Error rate: 0.4% (mostly 5xx when the scheduler backlog spiked)
- Redis latency (observed in logs): occasional spikes to 40-60ms under peak load
- Prize-queue processing backlog at peak: 1,200 items (cleared within 90s after peak)

Interpretation & next steps
- 95th percentile under 500ms meets the default threshold, but spikes and error rate warrant investigation.
- Scheduler: backlog during peaks indicates prize queue processing doesn't scale linearly with users. Consider batching prize work or adding workers.
- Redis: consider monitoring and upgrading instance type or using Redis cluster if persistence/latency are bottlenecks.

How to reproduce
- Use docker-compose.loadtests.yml and the provided k6 script. Adjust VUs/stages in apps/game-arena/tests/load_test.js.
- Run with adequate CPU/memory on the host or CI runner. Track Redis metrics and the game-arena logs.
