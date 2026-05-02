© 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-02

Quick guide: end-to-end load tests for game-arena

Files in this folder:
- load_test.js — k6 scenario that simulates players joining, polling snapshots, and answering.
- benchmark_example.md — sample results and what to look for.

Local run (recommended with docker-compose):
1. From repo root: docker-compose -f docker-compose.loadtests.yml up --build
   - This will start Redis, build & run the game-arena app, and run k6 which executes load_test.js.

Manual run (iterate quickly):
1. Start redis and api services only: docker-compose -f docker-compose.loadtests.yml up --build redis api
2. Run k6 from host: docker run --rm -v "${PWD}/apps/game-arena/tests:/scripts:ro" --network host grafana/k6 run /scripts/load_test.js

CI notes:
- In CI prefer running k6 against a staging deployment (set TARGET_URL to your staging API) rather than building the app inside CI.
- If you must build in CI, ensure Docker-in-Docker or the runner supports docker-compose build.

What these tests exercise
- Timers: Ensure scheduled rounds and per-player timers don't drift under load.
- Snapshot persistence: Polling snapshots validates that persisted state is readable under concurrent access.
- Scheduler: Heavy join/answer traffic exercises the internal scheduler and prize queue processing.
- Prize queue: Submitting answers and completing rounds should enqueue/dequeue prizes; watch for backlog growth.
