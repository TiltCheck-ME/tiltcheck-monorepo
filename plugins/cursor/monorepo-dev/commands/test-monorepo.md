---
name: test-monorepo
description: Run root vitest suite (builds database package first)
---

# Test monorepo

From repo root:

```bash
pnpm test
```

Builds `@tiltcheck/database` first. For a single package:

```bash
pnpm --filter @tiltcheck/<package> test
```
