# TiltCheck DA&D Bot - Standalone Container
# Build from monorepo root: docker build -f apps/dad-bot/Dockerfile .

FROM node:20-alpine AS builder

RUN npm install -g pnpm@10
ENV CI=true
ENV SKIP_ENV_VALIDATION=1

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.json ./

# Copy workspace sources
COPY packages/ ./packages/
COPY modules/ ./modules/
COPY apps/ ./apps/

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
# pnpm prune --prod
RUN mkdir -p /app/data

CMD ["node", "apps/dad-bot/dist/index.js"]
