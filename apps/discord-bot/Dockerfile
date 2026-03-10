# TiltCheck Discord Bot - Optimized Container
FROM node:20-alpine AS build

RUN npm install -g pnpm@10
ENV CI=true
ENV SKIP_ENV_VALIDATION=1

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.json ./

# Copy all sources
COPY packages/ ./packages/
COPY modules/ ./modules/
COPY apps/discord-bot/ ./apps/discord-bot/

# Install dependencies for Wave 1
RUN pnpm install --no-frozen-lockfile

# Build Bot and its dependencies ONLY
RUN pnpm --filter @tiltcheck/discord-bot... build

# Production stage
FROM node:20-alpine

RUN npm install -g pnpm@10
ENV CI=true
ENV NODE_ENV=production

WORKDIR /app

# Copy build artifacts
COPY --from=build /app /app

RUN mkdir -p /app/data

EXPOSE 8081

# Cloud Run doesn't use Docker HEALTHCHECK, but we keep it for consistency
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD test -f /tmp/bot-ready || exit 1

CMD ["node", "apps/discord-bot/dist/bootstrap.js"]
