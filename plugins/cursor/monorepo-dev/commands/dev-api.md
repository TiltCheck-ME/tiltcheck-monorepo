---
name: dev-api
description: Start the Express API gateway (port 8080)
---

# Dev API

From repo root:

```bash
pnpm --filter @tiltcheck/api dev
```

Loads `../../.env` from repo root. Port **8080**. DB connection errors without Postgres are non-fatal for HTTP.
