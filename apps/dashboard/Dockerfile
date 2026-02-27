# TiltCheck Dashboard - Standalone Container
# Build from monorepo root: docker build -f apps/dashboard/Dockerfile .

FROM node:20-alpine AS build

RUN npm install -g pnpm@10
ENV CI=true

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.json ./

# Copy all workspace sources needed
COPY packages/ ./packages/
COPY modules/ ./modules/
COPY apps/dashboard/ ./apps/dashboard/

# Install dependencies
RUN NODE_ENV=development pnpm install --no-frozen-lockfile

# Build all packages
RUN pnpm -r build

# Production stage
FROM node:20-alpine

RUN npm install -g pnpm@10
ENV CI=true
ENV NODE_ENV=production

WORKDIR /app

COPY --from=build /app /app

EXPOSE 3000

CMD ["pnpm", "--filter", "@tiltcheck/dashboard", "start"]
