# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
# TiltCheck Activity - Production HUD Host
# Multi-stage build: Node.js builds the Vite app, nginx serves the static output.

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Copy workspace manifests and lockfile first for better layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/activity/package.json ./apps/activity/package.json

# Install all workspace dependencies
RUN pnpm fetch
RUN pnpm install --no-frozen-lockfile

# Copy the full activity app source
COPY apps/activity/ ./apps/activity/

# Build the Vite app — outputs to apps/activity/dist
RUN pnpm --filter @tiltcheck/activity build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:alpine

# Copy the compiled static assets from the build stage
COPY --from=build /app/apps/activity/dist /usr/share/nginx/html

# Custom nginx config to handle SPA routing & Discord's specific security headers
RUN echo 'server { \
    listen 8080; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
        add_header X-Frame-Options "ALLOWALL"; \
        add_header Access-Control-Allow-Origin "*"; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
