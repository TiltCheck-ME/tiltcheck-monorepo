# TiltCheck Web (Landing Page) - Production Implementation
# Optimized for Google Cloud Run (Single-Service Subgraph Build)

FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# [PHASE 1] Base Dependencies
# Cache lockfile separately to prevent full installs on simple code changes
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
RUN pnpm fetch

# [PHASE 2] Building (Next.js Standalone Mode)
FROM base AS build
COPY . .
RUN pnpm install --offline --filter web...
# Next.js Build requires NODE_ENV=production to optimize bundles
ENV NODE_ENV=production
RUN pnpm --filter web build

# [PHASE 3] Production Surface
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
# Hardcode port for Cloud Run standard or use PORT env
ENV PORT=3000

# Copy internal packages first to resolve standalone dependencies
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static

# Next.js standalone entry point
CMD ["node", "apps/web/server.js"]
