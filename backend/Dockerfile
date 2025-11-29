# Build stage
FROM node:20-alpine AS builder

# Install pnpm matching lockfileVersion 9
RUN npm install -g pnpm@9

# Set CI environment variable to avoid pnpm TTY issues
ENV CI=true

WORKDIR /app

# Copy package files and pnpm config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# Copy package manifests for workspace resolution
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/supabase-auth/package.json ./packages/supabase-auth/
COPY services/event-router/package.json ./services/event-router/
COPY modules/dad/package.json ./modules/dad/
COPY modules/poker/package.json ./modules/poker/
COPY backend/package.json ./backend/

# Install dependencies with frozen lockfile for reproducible builds
RUN pnpm install --frozen-lockfile

# Copy all source code
COPY packages/ ./packages/
COPY services/event-router/ ./services/event-router/
COPY modules/dad/ ./modules/dad/
COPY modules/poker/ ./modules/poker/
COPY backend/ ./backend/
COPY tsconfig.json ./

# Build all packages recursively
RUN pnpm -r build

# Production stage
FROM node:20-alpine

# Install pnpm matching lockfileVersion 9
RUN npm install -g pnpm@9

# Set CI environment variable to avoid pnpm TTY issues
ENV CI=true

WORKDIR /app

# Copy package files and pnpm config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# Copy package manifests
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/supabase-auth/package.json ./packages/supabase-auth/
COPY services/event-router/package.json ./services/event-router/
COPY modules/dad/package.json ./modules/dad/
COPY modules/poker/package.json ./modules/poker/
COPY backend/package.json ./backend/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Copy built files from builder
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/supabase-auth/dist ./packages/supabase-auth/dist
COPY --from=builder /app/services/event-router/dist ./services/event-router/dist
COPY --from=builder /app/modules/dad/dist ./modules/dad/dist
COPY --from=builder /app/modules/poker/dist ./modules/poker/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/public ./backend/public

# Create data directory
RUN mkdir -p /app/data

# Set working directory for backend
WORKDIR /app/backend

# Expose port 7071 as specified
EXPOSE 7071

# Environment variables
ENV PORT=7071
ENV NODE_ENV=production

# Start application
CMD ["node", "dist/server.js"]
