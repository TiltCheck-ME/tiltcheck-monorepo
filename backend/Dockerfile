# Build stage
FROM node:20-alpine AS builder

# Install pnpm matching lockfileVersion 9
RUN npm install -g pnpm@10

# Set CI environment variable to avoid pnpm TTY issues
ENV CI=true

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.json ./

# Copy package manifests for workspace resolution
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/supabase-auth/package.json ./packages/supabase-auth/
COPY services/event-router/package.json ./services/event-router/
COPY modules/dad/package.json ./modules/dad/
COPY modules/poker/package.json ./modules/poker/
COPY backend/package.json ./backend/

# Copy all source code
COPY packages/ ./packages/
COPY services/event-router/ ./services/event-router/
COPY modules/dad/ ./modules/dad/
COPY modules/poker/ ./modules/poker/
COPY backend/ ./backend/

# Install dependencies after sources are in place to preserve workspace node_modules links
RUN pnpm install --frozen-lockfile

# Build all packages recursively
RUN pnpm -r build

# Production stage
FROM node:20-alpine

# Install pnpm matching lockfileVersion 9
RUN npm install -g pnpm@10

# Set CI environment variable to avoid pnpm TTY issues
ENV CI=true
ENV NODE_ENV=production
ENV PORT=7071

WORKDIR /app

# Copy package files and pnpm config
COPY package.json ./
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY .npmrc ./

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

# Expose port 8080 (Railway default)
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const port = process.env.PORT || 7071; require('http').get('http://localhost:' + port + '/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Start application
CMD ["node", "dist/server.js"]
