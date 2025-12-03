# Deprecated Packages

This directory contains deprecated packages that are no longer actively used but are kept for reference.

## `/packages/database`

**Deprecated:** 2024-12-03
**Replaced by:** `/packages/db`

The old database package used Supabase for database access. This has been replaced by `/packages/db` which uses Neon PostgreSQL directly.

### Migration Guide

Replace imports from `@tiltcheck/database` with `@tiltcheck/db`:

```typescript
// OLD
import { query } from '@tiltcheck/database';

// NEW
import { query } from '@tiltcheck/db';
```

**DO NOT** use any packages in this directory for new development.
