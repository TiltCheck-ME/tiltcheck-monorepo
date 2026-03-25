# TiltCheck Activity - Vite Production Container
FROM node:20-alpine AS build

RUN npm install -g pnpm@10
ENV CI=true

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.json ./

# Copy all sources (needed for workspace resolution)
COPY packages/ ./packages/
COPY modules/ ./modules/
COPY apps/activity/ ./apps/activity/

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build Activity
RUN pnpm --filter @tiltcheck/activity build

# Production stage
FROM nginx:alpine

# Copy build artifacts to nginx html directory
COPY --from=build /app/apps/activity/dist /usr/share/nginx/html

# Custom nginx config to handle SPA routing if needed (though this is simple)
RUN echo 'server { \
    listen 8080; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
