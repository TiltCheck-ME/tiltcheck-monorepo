# TiltCheck Unified Dockerfile
# Runs all services in a single container via supervisord + nginx
# Deploy with: docker build -t tiltcheck .

ARG NODE_VERSION=20.18.0
FROM node:${NODE_VERSION}-slim AS base

WORKDIR /app
ENV NODE_ENV="production"
ENV CI=true

# Install pnpm 10 (matches lockfile v9.0)
ARG PNPM_VERSION=10.0.0
RUN npm install -g pnpm@$PNPM_VERSION

# Build stage
FROM base AS build

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

# Copy everything
COPY . .

# Install all dependencies (including devDependencies for build)
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN NODE_ENV=development pnpm install --no-frozen-lockfile

# Build all workspaces in order
RUN bash scripts/ordered-build.sh

# Prune dev dependencies
RUN pnpm prune --prod

# Final stage
FROM base

# Install nginx, supervisor, and wget
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y nginx supervisor wget && \
    rm -rf /var/lib/apt/lists/* && \
    mkdir -p /var/log/supervisor

# Copy built application
COPY --from=build /app /app

# Copy nginx config
COPY apps/reverse-proxy/nginx.render.conf /etc/nginx/nginx.conf

# Copy supervisor config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose port 8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/proxy-health || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
