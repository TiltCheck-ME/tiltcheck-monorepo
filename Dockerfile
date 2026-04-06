# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-06
# TiltCheck API root Dockerfile - lockfile-stable monorepo build.

FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable && corepack prepare pnpm@10.29.1 --activate
WORKDIR /app

# Native build tooling for packages with node-gyp requirements.
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy lockfile/workspace metadata first for stable dependency resolution and layer caching.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.json ./
RUN pnpm fetch --filter @tiltcheck/api...

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile --filter @tiltcheck/api...
RUN pnpm --filter @tiltcheck/api build
RUN pnpm --filter @tiltcheck/api --prod deploy /app/out

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

RUN apt-get update && apt-get install -y dumb-init openssl && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

COPY --from=build /app/out ./

EXPOSE 3001 8080
CMD ["node", "dist/index.js"]
