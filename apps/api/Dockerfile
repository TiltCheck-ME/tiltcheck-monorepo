# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable && corepack prepare pnpm@10.29.1 --activate
WORKDIR /app

# Install build deps for native modules (bcryptjs, pg)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# [PHASE 1] Dependency Caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch

# [PHASE 2] Building
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile --filter @tiltcheck/api...
RUN pnpm --filter @tiltcheck/api... build
RUN test -f apps/api/dist/index.js || (echo 'BUILD ERROR: apps/api/dist/index.js not produced' && exit 1)
# Create self-contained deploy with real copies of workspace packages (no symlinks)
RUN pnpm --filter @tiltcheck/api deploy --legacy /prod

# [PHASE 3] Production Runtime
FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y dumb-init openssl && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

COPY --from=build /prod .

EXPOSE 3001
CMD ["node", "dist/index.js"]
