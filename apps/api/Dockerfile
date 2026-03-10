# TiltCheck API - Optimized Container
FROM node:20-alpine AS build

RUN npm install -g pnpm@10
ENV CI=true
ENV SKIP_ENV_VALIDATION=1

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.json ./

# Copy all sources (needed for workspace resolution)
COPY packages/ ./packages/
COPY modules/ ./modules/
COPY apps/api/ ./apps/api/

# Install dependencies for Wave 1
RUN pnpm install --no-frozen-lockfile

# Build API and its dependencies ONLY
RUN pnpm --filter @tiltcheck/api... build

# Production stage
FROM node:20-alpine

RUN npm install -g pnpm@10
ENV CI=true
ENV NODE_ENV=production

WORKDIR /app

# Copy build artifacts
COPY --from=build /app /app

EXPOSE 3001

CMD ["node", "apps/api/dist/index.js"]
