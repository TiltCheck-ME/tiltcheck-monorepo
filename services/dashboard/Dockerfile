# Build stage
FROM node:20-alpine AS builder

# Install pnpm (lockfileVersion 9 alignment)
RUN npm install -g pnpm@9

# Set CI environment variable to avoid pnpm TTY issues
ENV CI=true

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/discord-utils/package.json ./packages/discord-utils/
COPY services/event-router/package.json ./services/event-router/
COPY services/dashboard/package.json ./services/dashboard/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
# Note: Only copying packages that dashboard depends on (see package.json dependencies)
# This keeps the Docker image small. If dashboard dependencies change, update this list.
COPY packages/types/ ./packages/types/
COPY packages/config/ ./packages/config/
COPY packages/discord-utils/ ./packages/discord-utils/
COPY services/event-router/ ./services/event-router/
COPY services/dashboard/ ./services/dashboard/
COPY tsconfig.json ./

# Build packages
RUN pnpm run -C packages/types build && \
    pnpm run -C packages/config build && \
    pnpm run -C services/event-router build && \
    pnpm run -C services/dashboard build

# Production stage
FROM node:20-alpine

# Install pnpm (lockfileVersion 9 alignment)
RUN npm install -g pnpm@9

# Set CI environment variable to avoid pnpm TTY issues
ENV CI=true

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/discord-utils/package.json ./packages/discord-utils/
COPY services/event-router/package.json ./services/event-router/
COPY services/dashboard/package.json ./services/dashboard/

# Install production dependencies only (--ignore-scripts to skip prepare scripts that need tsc)
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Copy built files from builder
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/discord-utils/dist ./packages/discord-utils/dist
COPY --from=builder /app/services/event-router/dist ./services/event-router/dist
COPY --from=builder /app/services/dashboard/dist ./services/dashboard/dist
COPY --from=builder /app/services/dashboard/public ./services/dashboard/public

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 5055

# Set working directory for dashboard
WORKDIR /app/services/dashboard

# Start application
CMD ["node", "dist/server.js"]
