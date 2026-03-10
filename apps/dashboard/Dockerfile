# TiltCheck Dashboard - Optimized Container
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
COPY apps/dashboard/ ./apps/dashboard/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build Dashboard and its dependencies
RUN pnpm --filter @tiltcheck/dashboard... build

# Production stage
FROM node:20-alpine AS runner

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Next.js standalone build puts everything in .next/standalone
COPY --from=build /app/apps/dashboard/.next/standalone ./
COPY --from=build /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=build /app/apps/dashboard/public ./apps/dashboard/public

EXPOSE 3000

CMD ["node", "apps/dashboard/server.js"]
