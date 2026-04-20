# © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-20
# TiltCheck Activity - Production HUD Host
# Multi-stage build: Node.js builds the Vite app, nginx serves the static output.

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-slim AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN corepack enable && corepack prepare pnpm@10.29.1 --activate
WORKDIR /app

# Copy workspace manifests and lockfile first for better layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/activity/package.json ./apps/activity/package.json
RUN pnpm fetch
# Copy full source so pnpm workspace can resolve all package manifests
COPY . .
RUN pnpm install --frozen-lockfile --filter @tiltcheck/activity...

# Build the Vite app — outputs to apps/activity/dist
RUN pnpm --filter @tiltcheck/activity build

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
FROM nginx:alpine

# Copy the compiled static assets from the build stage
COPY --from=build /app/apps/activity/dist /usr/share/nginx/html

# Custom nginx config: SPA routing + Discord Activity required headers
RUN printf 'server {\n\
    listen 8080;\n\
    server_name localhost;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    # Discord SDK proxies API calls through /.proxy — must forward to discord.com\n\
    location /.proxy/ {\n\
        resolver 1.1.1.1 valid=30s;\n\
        proxy_pass https://discord.com/;\n\
        proxy_set_header Host discord.com;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_ssl_server_name on;\n\
    }\n\
\n\
    location /api/ {\n\
        proxy_pass http://api.railway.internal:3000/;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Host api.railway.internal;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
    }\n\
\n\
    location /socket.io/ {\n\
        proxy_pass http://game-arena.railway.internal:3000/socket.io/;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Upgrade $http_upgrade;\n\
        proxy_set_header Connection \"upgrade\";\n\
        proxy_set_header Host game-arena.railway.internal;\n\
        proxy_set_header X-Real-IP $remote_addr;\n\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_set_header X-Forwarded-Proto $scheme;\n\
    }\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
        # Allow Discord to iframe this page\n\
        add_header Content-Security-Policy "frame-ancestors https://discord.com https://*.discord.com https://*.discordsays.com https://*.discordapp.com" always;\n\
        add_header Access-Control-Allow-Origin "*" always;\n\
    }\n\
\n\
    location /assets/ {\n\
        try_files $uri =404;\n\
        add_header Cache-Control "public, max-age=31536000, immutable";\n\
    }\n\
}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
