FROM node:20-alpine

# Install pnpm (lockfileVersion 9 alignment)
RUN npm install -g pnpm@9

# Set CI environment variable to avoid pnpm TTY issues
ENV CI=true

WORKDIR /app

# Copy workspace root files for pnpm resolution
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Ensure directory exists then copy full express-utils workspace package (package.json + src)
RUN mkdir -p packages/express-utils
COPY packages/express-utils ./packages/express-utils

# Copy frontend package manifest prior to filtered install
COPY frontend/package.json ./frontend/

# Install only frontend dependencies (will link express-utils via workspace mapping)
RUN pnpm install --prod --filter @tiltcheck/frontend

# Copy frontend source & public assets (include lib required by server.js)
COPY frontend/lib ./frontend/lib
COPY frontend/server.js ./frontend/server.js
COPY frontend/public ./frontend/public

WORKDIR /app/frontend

# Expose port 3000 as specified
EXPOSE 3000

# Use environment variables for configuration
ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
