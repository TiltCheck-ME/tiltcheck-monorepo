# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-17
# TiltCheck Activity - Production HUD Host
# Multi-stage build: Node.js builds the Vite app, nginx serves the static output.

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable && corepack prepare pnpm@10.29.1 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/activity/package.json ./apps/activity/package.json
RUN pnpm fetch
COPY . .
RUN pnpm install --frozen-lockfile --filter @tiltcheck/activity...

RUN pnpm --filter @tiltcheck/activity build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:alpine

RUN apk add --no-cache gettext

COPY --from=build /app/apps/activity/dist /usr/share/nginx/html
COPY apps/activity/nginx.default.conf.template /etc/nginx/templates/default.conf.template
COPY apps/activity/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV API_UPSTREAM=http://api:3001
ENV ARENA_UPSTREAM=http://game-arena:8080

EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint.sh"]
