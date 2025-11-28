# Build stage
FROM node:20-alpine AS builder

# Install pnpm matching lockfileVersion 9
RUN npm install -g pnpm@9

# Set CI environment variable to avoid pnpm TTY issues
ENV CI=true

WORKDIR /app

# Copy package files and pnpm config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./

# Packages
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/discord-utils/package.json ./packages/discord-utils/
COPY packages/esm-utils/package.json ./packages/esm-utils/
COPY packages/database/package.json ./packages/database/
COPY packages/express-utils/package.json ./packages/express-utils/
COPY packages/identity-core/package.json ./packages/identity-core/
COPY packages/natural-language-parser/package.json ./packages/natural-language-parser/
COPY packages/supabase-auth/package.json ./packages/supabase-auth/

# Services
COPY services/event-router/package.json ./services/event-router/
COPY services/pricing-oracle/package.json ./services/pricing-oracle/
COPY services/dashboard/package.json ./services/dashboard/
COPY services/collectclock/package.json ./services/collectclock/
COPY services/trust-rollup/package.json ./services/trust-rollup/
COPY services/trust-engines/package.json ./services/trust-engines/
COPY services/casino-data-api/package.json ./services/casino-data-api/
COPY services/ai-gateway/package.json ./services/ai-gateway/
COPY services/control-room/package.json ./services/control-room/
COPY services/game-arena/package.json ./services/game-arena/
COPY services/gameplay-analyzer/package.json ./services/gameplay-analyzer/
COPY services/landing/package.json ./services/landing/
COPY services/qualifyfirst/package.json ./services/qualifyfirst/
COPY services/user-dashboard/package.json ./services/user-dashboard/

# Modules
COPY modules/suslink/package.json ./modules/suslink/
COPY modules/justthetip/package.json ./modules/justthetip/
COPY modules/collectclock/package.json ./modules/collectclock/
COPY modules/freespinscan/package.json ./modules/freespinscan/
COPY modules/freespinschannelbot/package.json ./modules/freespinschannelbot/
COPY modules/triviadrops/package.json ./modules/triviadrops/
COPY modules/poker/package.json ./modules/poker/
COPY modules/tiltcheck-core/package.json ./modules/tiltcheck-core/
COPY modules/natural-language-parser/package.json ./modules/natural-language-parser/
COPY modules/lockvault/package.json ./modules/lockvault/
COPY modules/dad/package.json ./modules/dad/
COPY modules/linkguard/package.json ./modules/linkguard/
COPY modules/qualifyfirst/package.json ./modules/qualifyfirst/

# Apps
COPY apps/discord-bot/package.json ./apps/discord-bot/
COPY apps/dad-bot/package.json ./apps/dad-bot/

# Install dependencies with frozen lockfile for reproducible builds
RUN pnpm install --frozen-lockfile

# Copy all source code
COPY packages/ ./packages/
COPY services/ ./services/
COPY modules/ ./modules/
COPY apps/ ./apps/
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

# Packages
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY packages/discord-utils/package.json ./packages/discord-utils/
COPY packages/esm-utils/package.json ./packages/esm-utils/
COPY packages/database/package.json ./packages/database/
COPY packages/express-utils/package.json ./packages/express-utils/
COPY packages/identity-core/package.json ./packages/identity-core/
COPY packages/natural-language-parser/package.json ./packages/natural-language-parser/
COPY packages/supabase-auth/package.json ./packages/supabase-auth/

# Services
COPY services/event-router/package.json ./services/event-router/
COPY services/pricing-oracle/package.json ./services/pricing-oracle/
COPY services/dashboard/package.json ./services/dashboard/
COPY services/collectclock/package.json ./services/collectclock/
COPY services/trust-rollup/package.json ./services/trust-rollup/
COPY services/trust-engines/package.json ./services/trust-engines/
COPY services/casino-data-api/package.json ./services/casino-data-api/
COPY services/ai-gateway/package.json ./services/ai-gateway/
COPY services/control-room/package.json ./services/control-room/
COPY services/game-arena/package.json ./services/game-arena/
COPY services/gameplay-analyzer/package.json ./services/gameplay-analyzer/
COPY services/landing/package.json ./services/landing/
COPY services/qualifyfirst/package.json ./services/qualifyfirst/
COPY services/user-dashboard/package.json ./services/user-dashboard/

# Modules
COPY modules/suslink/package.json ./modules/suslink/
COPY modules/justthetip/package.json ./modules/justthetip/
COPY modules/collectclock/package.json ./modules/collectclock/
COPY modules/freespinscan/package.json ./modules/freespinscan/
COPY modules/freespinschannelbot/package.json ./modules/freespinschannelbot/
COPY modules/triviadrops/package.json ./modules/triviadrops/
COPY modules/poker/package.json ./modules/poker/
COPY modules/tiltcheck-core/package.json ./modules/tiltcheck-core/
COPY modules/natural-language-parser/package.json ./modules/natural-language-parser/
COPY modules/lockvault/package.json ./modules/lockvault/
COPY modules/dad/package.json ./modules/dad/
COPY modules/linkguard/package.json ./modules/linkguard/
COPY modules/qualifyfirst/package.json ./modules/qualifyfirst/

# Apps
COPY apps/discord-bot/package.json ./apps/discord-bot/
COPY apps/dad-bot/package.json ./apps/dad-bot/

# Install production dependencies only (--ignore-scripts to skip prepare scripts that need tsc)
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Copy built files from builder - Packages (only those with dist folders)
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/discord-utils/dist ./packages/discord-utils/dist
COPY --from=builder /app/packages/esm-utils/dist ./packages/esm-utils/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/packages/identity-core/dist ./packages/identity-core/dist
COPY --from=builder /app/packages/natural-language-parser/dist ./packages/natural-language-parser/dist
COPY --from=builder /app/packages/supabase-auth/dist ./packages/supabase-auth/dist

# Copy express-utils source (no build script, uses source files directly)
COPY --from=builder /app/packages/express-utils/src ./packages/express-utils/src

# Copy built files from builder - Services (only those with dist folders)
# Note: ai-gateway, control-room, landing, and user-dashboard are plain JS services
# without TypeScript builds. Their source files run directly without compilation.
COPY --from=builder /app/services/event-router/dist ./services/event-router/dist
COPY --from=builder /app/services/pricing-oracle/dist ./services/pricing-oracle/dist
COPY --from=builder /app/services/trust-rollup/dist ./services/trust-rollup/dist
COPY --from=builder /app/services/trust-engines/dist ./services/trust-engines/dist
COPY --from=builder /app/services/casino-data-api/dist ./services/casino-data-api/dist
COPY --from=builder /app/services/collectclock/dist ./services/collectclock/dist
COPY --from=builder /app/services/dashboard/dist ./services/dashboard/dist
COPY --from=builder /app/services/game-arena/dist ./services/game-arena/dist
COPY --from=builder /app/services/gameplay-analyzer/dist ./services/gameplay-analyzer/dist

# Copy services/qualifyfirst source (static site, no build output)
COPY --from=builder /app/services/qualifyfirst/src ./services/qualifyfirst/src

# Copy built files from builder - Modules (only those with dist folders)
COPY --from=builder /app/modules/suslink/dist ./modules/suslink/dist
COPY --from=builder /app/modules/justthetip/dist ./modules/justthetip/dist
COPY --from=builder /app/modules/collectclock/dist ./modules/collectclock/dist
COPY --from=builder /app/modules/freespinscan/dist ./modules/freespinscan/dist
COPY --from=builder /app/modules/freespinschannelbot/dist ./modules/freespinschannelbot/dist
COPY --from=builder /app/modules/triviadrops/dist ./modules/triviadrops/dist
COPY --from=builder /app/modules/poker/dist ./modules/poker/dist
COPY --from=builder /app/modules/tiltcheck-core/dist ./modules/tiltcheck-core/dist
COPY --from=builder /app/modules/lockvault/dist ./modules/lockvault/dist
COPY --from=builder /app/modules/dad/dist ./modules/dad/dist
COPY --from=builder /app/modules/qualifyfirst/dist ./modules/qualifyfirst/dist

# Copy built files from builder - Apps
COPY --from=builder /app/apps/discord-bot/dist ./apps/discord-bot/dist

# Create data directory
RUN mkdir -p /app/data

# Set working directory for bot
WORKDIR /app/apps/discord-bot

# Start application
CMD ["node", "dist/index.js"]
