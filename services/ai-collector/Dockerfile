FROM node:20-alpine

WORKDIR /app

# Copy workspace package.json and lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc ./

# Install pnpm
RUN npm install -g pnpm

# Copy all package.json files first (for better layer caching)
COPY packages/grading-engine/package.json ./packages/grading-engine/
COPY packages/event-router/package.json ./packages/event-router/
COPY packages/types/package.json ./packages/types/
COPY services/ai-collector/package.json ./services/ai-collector/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/grading-engine/src ./packages/grading-engine/src
COPY packages/grading-engine/tsconfig.json ./packages/grading-engine/
COPY packages/event-router/src ./packages/event-router/src
COPY packages/event-router/tsconfig.json ./packages/event-router/
COPY packages/types/src ./packages/types/src
COPY packages/types/tsconfig.json ./packages/types/
COPY services/ai-collector/src ./services/ai-collector/src
COPY services/ai-collector/tsconfig.json ./services/ai-collector/

# Build packages
RUN pnpm --filter @tiltcheck/grading-engine build
RUN pnpm --filter @tiltcheck/event-router build
RUN pnpm --filter @tiltcheck/types build

# Build ai-collector
RUN pnpm --filter ai-collector build

# Create data directory
RUN mkdir -p /app/data/casino-snapshots

WORKDIR /app/services/ai-collector

CMD ["pnpm", "start"]
