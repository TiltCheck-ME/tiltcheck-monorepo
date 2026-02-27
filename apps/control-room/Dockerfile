# TiltCheck Control Room - Standalone Container
# Build from monorepo root: docker build -f apps/control-room/Dockerfile .

FROM node:20-alpine AS build

RUN npm install -g pnpm@10
ENV CI=true

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.json ./

# Copy all workspace sources needed
COPY packages/ ./packages/
COPY modules/ ./modules/
COPY apps/control-room/ ./apps/control-room/
COPY apps/pricing-oracle/ ./apps/pricing-oracle/

# Install dependencies
RUN NODE_ENV=development pnpm install --no-frozen-lockfile

# Build all packages
RUN pnpm -r build

# Prune dev dependencies
RUN pnpm prune --prod

# Production stage
FROM node:20-alpine

RUN npm install -g pnpm@10
ENV CI=true
ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app /app

EXPOSE 3001

CMD ["node", "apps/control-room/dist/index.js"]
