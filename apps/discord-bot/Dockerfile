# TiltCheck Discord Bot - Optimized Container (with Scripts)
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
COPY scripts/ ./scripts/
COPY apps/discord-bot/ ./apps/discord-bot/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build
RUN pnpm --filter @tiltcheck/discord-bot... build

# Production stage
FROM node:20-alpine

RUN npm install -g pnpm@10
ENV CI=true
ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app /app

RUN mkdir -p /app/data

EXPOSE 8081

CMD ["node", "apps/discord-bot/dist/bootstrap.js"]
