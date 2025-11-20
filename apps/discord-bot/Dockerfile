# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/discord-utils/package.json ./packages/discord-utils/
COPY packages/esm-utils/package.json ./packages/esm-utils/
COPY packages/database/package.json ./packages/database/
COPY services/event-router/package.json ./services/event-router/
COPY services/pricing-oracle/package.json ./services/pricing-oracle/
COPY services/dashboard/package.json ./services/dashboard/
COPY services/collectclock/package.json ./services/collectclock/
    COPY modules/suslink/package.json ./modules/suslink/
    COPY modules/justthetip/package.json ./modules/justthetip/
    COPY modules/collectclock/package.json ./modules/collectclock/
    COPY modules/freespinscan/package.json ./modules/freespinscan/
    COPY modules/freespinschannelbot/package.json ./modules/freespinschannelbot/
    COPY modules/triviadrops/package.json ./modules/triviadrops/
    COPY services/trust-rollup/package.json ./services/trust-rollup/
    COPY services/trust-engines/package.json ./services/trust-engines/
    COPY apps/discord-bot/package.json ./apps/discord-bot/

    # Install dependencies
    RUN pnpm install

    # Copy source code
    COPY packages/ ./packages/
    COPY services/ ./services/
    COPY modules/ ./modules/
    COPY apps/discord-bot/ ./apps/discord-bot/
    COPY tsconfig.json ./

# Build packages
RUN pnpm run build

# Production stage
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/discord-utils/package.json ./packages/discord-utils/
COPY packages/esm-utils/package.json ./packages/esm-utils/
COPY packages/database/package.json ./packages/database/
COPY services/event-router/package.json ./services/event-router/
COPY services/pricing-oracle/package.json ./services/pricing-oracle/
COPY services/dashboard/package.json ./services/dashboard/
COPY services/collectclock/package.json ./services/collectclock/
COPY modules/suslink/package.json ./modules/suslink/
COPY modules/justthetip/package.json ./modules/justthetip/
COPY modules/collectclock/package.json ./modules/collectclock/
COPY modules/freespinscan/package.json ./modules/freespinscan/
COPY modules/freespinschannelbot/package.json ./modules/freespinschannelbot/
COPY modules/triviadrops/package.json ./modules/triviadrops/
COPY services/trust-rollup/package.json ./services/trust-rollup/
COPY services/trust-engines/package.json ./services/trust-engines/
COPY apps/discord-bot/package.json ./apps/discord-bot/

# Install production dependencies only
RUN pnpm install --prod

# Copy built files from builder
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/discord-utils/dist ./packages/discord-utils/dist
COPY --from=builder /app/packages/esm-utils/dist ./packages/esm-utils/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/services/event-router/dist ./services/event-router/dist
COPY --from=builder /app/services/pricing-oracle/dist ./services/pricing-oracle/dist
COPY --from=builder /app/modules/suslink/dist ./modules/suslink/dist
COPY --from=builder /app/modules/justthetip/dist ./modules/justthetip/dist
COPY --from=builder /app/modules/collectclock/dist ./modules/collectclock/dist
COPY --from=builder /app/modules/freespinscan/dist ./modules/freespinscan/dist
COPY --from=builder /app/modules/freespinschannelbot/dist ./modules/freespinschannelbot/dist
COPY --from=builder /app/modules/triviadrops/dist ./modules/triviadrops/dist
COPY --from=builder /app/services/trust-rollup/dist ./services/trust-rollup/dist
COPY --from=builder /app/services/trust-engines/dist ./services/trust-engines/dist
COPY --from=builder /app/apps/discord-bot/dist ./apps/discord-bot/dist

# Create data directory
RUN mkdir -p /app/data

# Set working directory for bot
WORKDIR /app/apps/discord-bot

# Start application
CMD ["node", "dist/index.js"]
