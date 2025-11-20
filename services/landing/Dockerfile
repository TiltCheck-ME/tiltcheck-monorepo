FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm@8

WORKDIR /app

# Copy workspace root files for pnpm resolution
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
# Copy landing package manifest
COPY services/landing/package.json ./services/landing/

# Install only landing dependencies
RUN pnpm install --prod --filter @tiltcheck/landing

# Copy landing source & public assets
COPY services/landing/server.js ./services/landing/server.js
COPY services/landing/public ./services/landing/public

WORKDIR /app/services/landing

EXPOSE 8080

CMD ["node", "server.js"]
