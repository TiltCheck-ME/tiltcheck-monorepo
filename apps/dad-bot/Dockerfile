# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
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

FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

COPY --from=build /app/apps/dad-bot/dist ./apps/dad-bot/dist
COPY --from=build /app/apps/dad-bot/package.json ./apps/dad-bot/package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/modules ./modules
COPY --from=build /app/tools ./tools
COPY --from=build /app/package.json ./package.json

EXPOSE 8080
CMD ["node", "apps/dad-bot/dist/bootstrap.js"]
