# Universal TiltCheck Monorepo Dockerfile (Final Fix for Scoped Build)
# Handles both standard Node (API/Bot) and Next.js (Web) architectures

FROM node:22 AS builder
WORKDIR /app

# Enable pnpm v10
RUN corepack enable && corepack prepare pnpm@10.29.1 --activate

# Install build dependencies for native modules (needed for pg/bcrypt/scrypt)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy monorepo context
COPY pnpm-lock.yaml package.json ./
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY modules/ ./modules/
COPY turbo.json pnpm-workspace.yaml ./

# Accept build-time env vars (needed for NEXT_PUBLIC_)
ARG APP_NAME
ENV APP_NAME=$APP_NAME
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# SURGICAL SCOPED BUILD: Build ONLY the target app and its internal workspace dependencies
# This bypasses failures in unrelated experimental packages (e.g. accessibility-bridge)
RUN pnpm --filter @tiltcheck/$APP_NAME... build

# Prepare production output
RUN if [ -d "apps/$APP_NAME/.next/standalone" ]; then \
      pnpm --filter @tiltcheck/$APP_NAME --prod deploy /app/out && \
      cp -r apps/$APP_NAME/.next/standalone/* /app/out/ && \
      cp -r apps/$APP_NAME/.next/static /app/out/.next/static && \
      cp -r apps/$APP_NAME/public /app/out/public; \
    else \
      pnpm --filter @tiltcheck/$APP_NAME --prod deploy /app/out && \
      cp -r apps/$APP_NAME/dist /app/out/dist || true; \
    fi

# --- STEP 2: Slim runner image ---
FROM node:22-slim AS runner
WORKDIR /app

# Install runtime dependencies for native modules if needed
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/out .

EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

# Entry point logic: 
# If server.js (Next.js), run it. 
# Else run dist/index.js (API/Bot).
CMD ["sh", "-c", "if [ -f server.js ]; then node server.js; else node dist/index.js; fi"]
