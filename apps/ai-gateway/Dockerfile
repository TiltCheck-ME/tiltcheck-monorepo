FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@10

# Set CI environment variable to avoid pnpm TTY issues
ENV CI=true

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies
RUN pnpm install --prod

# Copy source
COPY src/ ./src/

# Create health check endpoint by adding Express server
COPY server.js ./

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start server
CMD ["node", "server.js"]
