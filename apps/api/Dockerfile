# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-07-19
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable && corepack prepare pnpm@10.34.4 --activate
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
# Force clean build — prevents tsc incremental cache serving stale compiled output
RUN rm -rf apps/api/dist packages/*/dist modules/*/dist
RUN pnpm --filter @tiltcheck/api... build
# Belt-and-suspenders: ensure no stale ai.js artifact survives
RUN rm -f apps/api/dist/routes/ai.js
RUN test -f apps/api/dist/index.js || (echo 'BUILD ERROR: apps/api/dist/index.js not produced' && exit 1)
# [PHASE 3] Production Runtime
FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y dumb-init openssl && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
# node_modules has pnpm symlinks into packages/ and modules/; copy both so they resolve
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/modules ./modules
COPY --from=build /app/data ./data
COPY --from=build /app/package.json ./package.json

# Hyperlift injects PORT; production default is 8080 when unset (see runtime-config.ts).
EXPOSE 8080
CMD ["node", "apps/api/dist/index.js"]