# TiltCheck Web - Production Container (Static Nginx)
FROM node:20-alpine AS base
RUN npm install -g pnpm@10 && npm cache clean --force
WORKDIR /app

FROM base AS dependencies
ENV CI=true
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc ./
RUN pnpm install --no-frozen-lockfile --prod

FROM alpine:latest AS web-runtime
RUN apk add --no-cache nginx
EXPOSE 80
WORKDIR /var/www/html
COPY --from=dependencies /app/apps/web/dist .
COPY <<EOF /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;
events { worker_connections 1024; }
http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  server {
    listen 80;
    root /var/www/html;
    index index.html;
    location / { try_files \$uri \$uri/ /index.html; }
    location ~* \.(?:js|css|woff2?|ttf|otf|svg)$ { expires 1y; }
  }
}
EOF
CMD ["nginx", "-g", "daemon off;"]
