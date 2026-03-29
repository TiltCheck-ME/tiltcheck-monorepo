# Universal TiltCheck Monorepo Dockerfile (Final Fix for Scoped Build)
# Handles both standard Node (API/Bot) and Next.js (Web) architectures

FROM node:22 AS builder
WORKDIR /app

# Enable pnpm v10 and install global build tools
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

# --- PHASE: Service Specific Build Logic ---
RUN echo "BUILDING: $APP_NAME" && \
    if [ -d "packages/$APP_NAME" ]; then \
      SERVICE_PATH="packages/$APP_NAME"; \
    else \
      SERVICE_PATH="apps/$APP_NAME"; \
    fi && \
    echo "SERVICE_PATH: $SERVICE_PATH" && \
    if [ "$APP_NAME" = "web" ]; then \
      pnpm --filter web build; \
    elif [ "$APP_NAME" = "agent" ]; then \
      pnpm --filter "@tiltcheck/agent" build; \
    else \
      npx esbuild $SERVICE_PATH/src/index.ts --bundle --platform=node --format=esm --target=node22 --outfile=$SERVICE_PATH/dist/index.js \
      --tsconfig=tsconfig.json \
      --banner:js='import { createRequire } from "module"; const require = createRequire(import.meta.url);' \
      --external:pg-native --external:bcryptjs --external:bcrypt --external:bufferutil --external:utf-8-validate \
      --external:fs --external:path --external:os --external:crypto --external:http --external:https --external:url --external:stream --external:zlib --external:events --external:util --external:net --external:tls --external:child_process; \
    fi

# Prepare production output
RUN mkdir -p /app/out && \
    if [ -d "apps/$APP_NAME" ]; then \
      S_PATH="apps/$APP_NAME"; \
    else \
      S_PATH="packages/$APP_NAME"; \
    fi && \
    if [ -d "$S_PATH/.next/standalone" ]; then \
      cp -r $S_PATH/.next/standalone/* /app/out/ && \
      cp -r $S_PATH/.next/static /app/out/.next/static 2>/dev/null || true && \
      cp -r $S_PATH/public /app/out/public 2>/dev/null || true; \
    else \
      pnpm --filter "@tiltcheck/$APP_NAME" --prod --legacy deploy /app/out || pnpm --filter $APP_NAME --prod --legacy deploy /app/out; \
      cp -r $S_PATH/dist /app/out/dist || true; \
    fi

FROM node:22-slim AS runner
WORKDIR /app
ARG APP_NAME
ENV APP_NAME=$APP_NAME
ENV NODE_ENV=production

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
# If agent, use adk-devtools.
# Else run dist/index.js (API/Bot).
CMD ["sh", "-c", "if [ -f server.js ]; then node server.js; elif [ \"$APP_NAME\" = \"agent\" ]; then npx @google/adk-devtools api_server dist/agent.js --port 8080; else node dist/index.js; fi"]
