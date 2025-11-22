FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# Copy workspace root files for pnpm resolution
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy workspace dependency needed by landing (express-utils) before install
COPY packages/express-utils/package.json ./packages/express-utils/

# Copy landing package manifest
COPY services/landing/package.json ./services/landing/

# Install only landing dependencies (will also link express-utils workspace dep)
RUN pnpm install --prod --filter @tiltcheck/landing

# Copy source of workspace dependencies required at runtime
COPY packages/express-utils/src ./packages/express-utils/src

# Copy landing source & public assets (include lib required by server.js)
COPY services/landing/lib ./services/landing/lib
COPY services/landing/server.js ./services/landing/server.js
COPY services/landing/public ./services/landing/public

WORKDIR /app/services/landing

EXPOSE 8080

CMD ["node", "server.js"]
