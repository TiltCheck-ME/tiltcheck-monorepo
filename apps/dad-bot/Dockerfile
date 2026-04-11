# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11
# DAD Bot - Production Container
FROM node:20 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable && corepack prepare pnpm@10.29.1 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm fetch

FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile --filter @tiltcheck/dad-bot...
RUN pnpm --filter @tiltcheck/dad-bot... build
RUN test -f apps/dad-bot/dist/bootstrap.js || (echo 'BUILD ERROR: apps/dad-bot/dist/bootstrap.js not produced' && exit 1)
# pnpm deploy resolves workspace symlinks (e.g. @tiltcheck/db) into real node_modules
RUN pnpm --filter @tiltcheck/dad-bot deploy --prod /deploy/dad-bot
# Copy built dist over the deploy dir (deploy only copies src files)
RUN cp -r /app/apps/dad-bot/dist /deploy/dad-bot/dist

FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

COPY --from=build /deploy/dad-bot ./

EXPOSE 8080
CMD ["node", "dist/bootstrap.js"]
