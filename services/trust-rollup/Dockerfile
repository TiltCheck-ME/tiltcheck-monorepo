# Build stage
FROM node:20-alpine AS builder

# Install pnpm (lockfileVersion 9 alignment)
RUN npm install -g pnpm@9

# Set CI environment variable to avoid pnpm TTY issues
ENV CI=true

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY services/event-router/package.json ./services/event-router/
COPY services/trust-rollup/package.json ./services/trust-rollup/

    # Install dependencies
    RUN pnpm install

    # Copy source code
    COPY packages/ ./packages/
    COPY services/event-router/ ./services/event-router/
    COPY services/trust-rollup/ ./services/trust-rollup/
    COPY tsconfig.json ./

# Build packages
RUN pnpm run -C packages/types build && \
    pnpm run -C packages/config build && \
    pnpm run -C services/event-router build && \
    pnpm run -C services/trust-rollup build

# Production stage
FROM node:20-alpine

# Install pnpm (lockfileVersion 9 alignment)
RUN npm install -g pnpm@9

# Set CI environment variable to avoid pnpm TTY issues
ENV CI=true

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY services/event-router/package.json ./services/event-router/
COPY services/trust-rollup/package.json ./services/trust-rollup/

# Install production dependencies only (--ignore-scripts to skip prepare scripts that need tsc)
RUN pnpm install --prod --ignore-scripts

# Copy built files from builder
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/services/event-router/dist ./services/event-router/dist
COPY --from=builder /app/services/trust-rollup/dist ./services/trust-rollup/dist

# Create data directory
RUN mkdir -p /app/data

# Set working directory
WORKDIR /app/services/trust-rollup

# Start application
CMD ["node", "dist/index.js"]
