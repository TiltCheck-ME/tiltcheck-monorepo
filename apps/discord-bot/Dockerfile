# TiltCheck Discord Bot - Standalone Container
# Build from monorepo root: docker build -f apps/discord-bot/Dockerfile .

FROM node:20-alpine AS build

RUN npm install -g pnpm@10
ENV CI=true
ENV SKIP_ENV_VALIDATION=1

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.json ./

# Copy all workspace sources
COPY packages/ ./packages/
COPY modules/ ./modules/
COPY apps/ ./apps/

# Install dependencies
RUN NODE_ENV=development pnpm install --no-frozen-lockfile

# Build all packages
RUN pnpm -r build

# Prune dev dependencies
# pnpm prune --prod

# Production stage
FROM node:20-alpine

RUN npm install -g pnpm@10
ENV CI=true
ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app /app

RUN mkdir -p /app/data

EXPOSE 8081

HEALTHCHECK --interval=10s --timeout=5s --retries=30 --start-period=60s \
  CMD test -f /tmp/bot-ready || exit 1

CMD ["node", "apps/discord-bot/dist/index.js"]
