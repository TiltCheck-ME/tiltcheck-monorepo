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
# Prune for production

# [PHASE 3] Production Runtime
FROM node:20-slim
WORKDIR /app
# We use dumb-init for internal signal handling
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Copy only the compiled artifacts and minimal node_modules
COPY --from=build /app/apps/discord-bot/dist ./apps/discord-bot/dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/discord-bot/package.json ./apps/discord-bot/package.json
COPY --from=build /app/package.json ./package.json

EXPOSE 8080
# Use the correct entry point from package.json
CMD ["node", "apps/discord-bot/dist/bootstrap.js"]
