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

# Copy monorepo configuration first
COPY pnpm-lock.yaml package.json turbo.json pnpm-workspace.yaml tsconfig.json ./

# Copy all packages for contextual builds
COPY packages/ ./packages/
COPY apps/ ./apps/
COPY modules/ ./modules/

# Accept build-time env vars (needed for NEXT_PUBLIC_)
ARG APP_NAME
ENV APP_NAME=$APP_NAME
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Install dependencies
RUN pnpm install

# SURGICAL BUILD: Only compile the application's direct dependent graph.
# This prevents building unrelated legacy packages that might have broken types.
# We build dependencies first, then the app to resolve path mapping correctly.
RUN pnpm --filter "...@tiltcheck/$APP_NAME" --workspace-concurrency=1 --if-present build

# Final build for our specific application
RUN pnpm --filter "@tiltcheck/$APP_NAME" build

# Prepare production output
# pnpm v10 deploy requires --legacy for non-injected workspaces
RUN if [ -d "apps/$APP_NAME/.next/standalone" ]; then \
      pnpm --filter "./apps/$APP_NAME" --prod --legacy deploy /app/out && \
      cp -r apps/$APP_NAME/.next/standalone/* /app/out/ && \
      cp -r apps/$APP_NAME/.next/static /app/out/.next/static && \
      cp -r apps/$APP_NAME/public /app/out/public; \
    else \
      pnpm --filter "./apps/$APP_NAME" --prod --legacy deploy /app/out && \
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
# PORT is provided by the environment (e.g. Cloud Run)
ENV NODE_ENV=production

# Entry point logic: 
# If server.js (Next.js), run it. 
# Else run dist/index.js (API/Bot).
CMD ["sh", "-c", "if [ -f server.js ]; then node server.js; else node dist/index.js; fi"]
