# Docker Build Fix - December 8, 2025

## Problem
The Docker build was failing with these errors:
1. **Event Handler Error**: "Event handlers cannot be passed to Client Component props"
2. **Build Timeouts**: Static page generation timing out (60+ seconds per page)
3. **ESLint Warnings**: Deprecated ESLint options (non-blocking)

## Root Cause
The dashboard page (`apps/dashboard/src/app/page.tsx`) was using a React interactive component pattern (onClick handler on the PWA install button) without declaring itself as a Client Component. In Next.js 14's App Router:

- Server Components (default) cannot have event handlers
- Client Components must be explicitly marked with `'use client'`

The onClick handler violated this rule, causing Next.js to throw an error during static generation, which then caused multiple retries and timeouts.

## Solution
Added `'use client'` directive to the top of `apps/dashboard/src/app/page.tsx`.

**File Changed**: `apps/dashboard/src/app/page.tsx`

```diff
+'use client';
+
 import Link from 'next/link';
```

This single-line fix tells Next.js that this component uses client-side interactivity.

## Results
✅ **Build now succeeds** - No more Client Component prop errors  
✅ **No timeouts** - Static page generation completes in <5 seconds  
✅ **All tests passing** - 777/777 tests still pass  
✅ **Zero breaking changes** - Fully backward compatible  

## Test Results
```
Test Files: 69 passed (69)
Tests: 777 passed (777)
Duration: 13.04s
Build Time: ~2 minutes (down from timeout)
```

## Deployment
- ✅ Code committed to `main` branch
- ✅ Pushed to GitHub
- ✅ Ready for Vercel/Railway deployment

## Next Steps
1. Deploy to Vercel: `vercel --prod`
2. Deploy backend to Railway
3. Deploy Discord bot to Railway
4. Test OAuth flow end-to-end

---
**Commit**: `d9e7543`  
**Author**: TiltCheck Development Agent  
**Date**: 2025-12-08
