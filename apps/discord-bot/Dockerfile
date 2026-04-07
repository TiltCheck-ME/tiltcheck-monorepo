# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
# TiltCheck Discord Bot - High-Speed Production Container
FROM node:20 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable && corepack prepare pnpm@10.29.1 --activate
WORKDIR /app

# [PHASE 1] Dependency Caching
# Only copy lockfile and workspace config to cache deps separately from source
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# Build the virtual store
RUN pnpm fetch

# [PHASE 2] Building
FROM base AS build
COPY . .
# Install only the bot's dependency subgraph
RUN pnpm install --frozen-lockfile --filter @tiltcheck/discord-bot...
RUN pnpm --filter @tiltcheck/discord-bot... build
RUN test -f apps/discord-bot/dist/bootstrap.js || (echo 'BUILD ERROR: apps/discord-bot/dist/bootstrap.js not produced' && exit 1)
# Create self-contained deploy with real copies of workspace packages (no symlinks)
RUN pnpm --filter @tiltcheck/discord-bot deploy --legacy /prod

# [PHASE 3] Production Runtime
FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

COPY --from=build /prod .

EXPOSE 8080
CMD ["node", "dist/bootstrap.js"]
