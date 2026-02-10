FROM node:20-alpine

# Install pnpm (lockfileVersion 9 alignment)
RUN npm install -g pnpm@10

# Set CI environment variable to avoid pnpm TTY issues
ENV CI=true

WORKDIR /app

# Copy workspace root files for pnpm resolution
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Ensure directory exists then copy full express-utils workspace package (package.json + src)
RUN mkdir -p packages/express-utils
COPY packages/express-utils ./packages/express-utils

# Copy landing package manifest prior to filtered install
COPY services/landing/package.json ./services/landing/

# Install only landing dependencies (will link express-utils via workspace mapping)
RUN pnpm install --prod --filter @tiltcheck/landing

# Copy landing source & public assets (include lib required by server.js)
COPY services/landing/lib ./services/landing/lib
COPY services/landing/server.js ./services/landing/server.js
COPY services/landing/public ./services/landing/public

WORKDIR /app/services/landing

EXPOSE 8080

CMD ["node", "server.js"]
