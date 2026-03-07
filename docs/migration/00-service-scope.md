# Service Scope Confirmation (Wave 1)

Last updated: 2026-03-07
Owner: project owner

## Purpose

Define which services are in active migration scope for the first GCP wave, based on repository deployment artifacts.

## Evidence Sources

- `DEPLOYMENT_PLAN.md` (VPS-free MVP scope)
- `docker-compose.mvp.yml` (lean runtime)
- `docker-compose.yml` (full legacy stack)

## Wave 1 (Confirmed Active for Migration)

- `apps/web` (landing and tool pages)
- `apps/api` (auth and API routes)
- `apps/discord-bot` (core Discord commands)
- `apps/trust-rollup` (optional dependency service; include in wave 1 template, deploy when required)
- `packages/comic-generator` (already has Cloud Run deploy precedent)

## Deferred (Not in Wave 1)

- `apps/dashboard`
- `apps/user-dashboard`
- `apps/game-arena`
- `apps/control-room`
- `apps/reverse-proxy` (replaced by managed ingress/load balancing on GCP)

## Decision Notes

- `DEPLOYMENT_PLAN.md` explicitly limits MVP to `web`, `api`, `discord-bot`, and optional `trust-rollup`.
- `docker-compose.mvp.yml` aligns with that reduced scope.
- Full compose stack is retained as legacy/reference, not initial migration target.

## Done Criteria

- [x] Wave 1 services identified.
- [x] Deferred services identified.
- [x] Source-of-truth references recorded.
