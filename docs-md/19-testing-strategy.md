# TiltCheck Testing Strategy

## Goals
- Catch regressions early with fast unit tests.
- Validate event flows with lightweight integration tests.
- Keep tests cheap to run (no real network or wallets).

## Stack
- Test runner: Vitest (root config)
- Env: Node
- Coverage: V8

## Conventions
- Test files: `**/tests/**/*.test.ts`
- Unit tests: close to implementation (e.g., `modules/suslink/tests/`)
- Integration tests: use the real `eventRouter` and in-memory data

## Patterns
- Prefer dependency-free logic in modules; mock only boundaries.
- For event flows, publish events and assert on `eventRouter.getHistory()`.
- Avoid timeouts; prefer deterministic sequences and small `setTimeout(0)` waits.

## Examples
- SusLink: Validate `LinkScanner.quickCheck` and `scan` risk outputs.
- Event Router: Subscribe, publish, ensure history captured and handlers fire.

## Commands
```bash
pnpm test         # run all tests once
pnpm test:watch   # watch mode
pnpm coverage     # generate coverage report
```

## What Not To Do
- No live HTTP or Discord calls in tests.
- No filesystem writes outside temp dirs.
- No secret or token usage.

## Future
- Add factories for common test events.
- Add contract tests for new modules via shared fixtures.
