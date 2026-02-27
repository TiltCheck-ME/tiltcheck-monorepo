# TiltCheck DA&D Bot - Standalone Container
# Build from monorepo root: docker build -f apps/dad-bot/Dockerfile .

FROM node:20-alpine AS builder

RUN npm install -g pnpm@10
ENV CI=true

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.json ./

# Copy workspace sources
COPY packages/ ./packages/
COPY modules/ ./modules/
COPY apps/dad-bot/ ./apps/dad-bot/
COPY apps/pricing-oracle/ ./apps/pricing-oracle/

# Install and build
RUN NODE_ENV=development pnpm install --no-frozen-lockfile
RUN pnpm -r build

# Production stage
FROM node:20-alpine

RUN npm install -g pnpm@10
ENV CI=true
ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder /app /app
RUN pnpm prune --prod
RUN mkdir -p /app/data

CMD ["node", "apps/dad-bot/dist/index.js"]
