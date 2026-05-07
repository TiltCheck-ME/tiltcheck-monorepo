<!-- © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-07 -->

# `apps/tiltcheck-activity` (DEPRECATED)

This app is an older standalone TiltCheck Discord Activity shell.

## Status

- **Deprecated:** do not deploy this to production.
- **Keep:** only for reference while migrating any unique UI bits into `apps/activity`.

## What to use instead

- **Primary TiltCheck Activity (production):** `apps/activity` (served from `activity.tiltcheck.me`)
- **Degens games Activity:** `apps/degens-activity` (should have its own dedicated hostname + deploy)

## Why this exists

The repo historically accumulated multiple Activity shells. We are intentionally standardizing on **two** Activities to avoid operator confusion and “which URL is the real one” bugs.

