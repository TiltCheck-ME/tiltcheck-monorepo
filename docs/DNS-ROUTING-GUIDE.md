# TiltCheck DNS and Routing Configuration Guide

This guide documents the DNS records, SSL certificates, and reverse proxy configurations for routing subdomains to TiltCheck monorepo applications.

---

## Subdomain Routing Overview

| Subdomain | Monorepo Path | Service Type | Default Port |
|-----------|---------------|--------------|--------------|
| `dashboard.tiltcheck.me` | `/apps/dashboard` | Web Dashboard | 5055 |
| `api.tiltcheck.me` | `/apps/api` | REST API | 3000 |
| `justthetip.tiltcheck.me` | `/apps/justthetip` | Tipping Service | 3001 |
| `bot.tiltcheck.me` | `/apps/bot` | Discord Bot Webhooks | 8081 |
| `worker.tiltcheck.me` | `/apps/worker` | Background Worker | 8082 |

---

## 1. DNS Configuration

### A. Option 1: Individual A Records (Static IPs)

If your server has a static IP address, create A records for each subdomain:

```dns
; DNS Zone File for tiltcheck.me
; TTL: 300 seconds (5 minutes) recommended for flexibility

; Root domain
tiltcheck.me.           300    IN    A    203.0.113.10

; Subdomain A Records
dashboard.tiltcheck.me.  300    IN    A    203.0.113.10
api.tiltcheck.me.        300    IN    A    203.0.113.10
justthetip.tiltcheck.me. 300    IN    A    203.0.113.10
bot.tiltcheck.me.        300    IN    A    203.0.113.10
worker.tiltcheck.me.     300    IN    A    203.0.113.10
```

### B. Option 2: CNAME Records (Cloud/CDN Deployment)

For cloud platforms (Railway, Render, Vercel, Cloudflare) that provide dynamic hostnames:

```dns
; DNS Zone File for tiltcheck.me with CNAME records

; Root domain (requires A or ALIAS record - CNAME not allowed at apex)
tiltcheck.me.           300    IN    A    203.0.113.10

; OR using ALIAS/ANAME (supported by some providers)
tiltcheck.me.           300    IN    ALIAS  tiltcheck.railway.app.

; Subdomain CNAME Records
dashboard.tiltcheck.me.  300    IN    CNAME  tiltcheck-dashboard.railway.app.
api.tiltcheck.me.        300    IN    CNAME  tiltcheck-api.railway.app.
justthetip.tiltcheck.me. 300    IN    CNAME  tiltcheck-justthetip.railway.app.
bot.tiltcheck.me.        300    IN    CNAME  tiltcheck-bot.railway.app.
worker.tiltcheck.me.     300    IN    CNAME  tiltcheck-worker.railway.app.
```

### C. Option 3: Wildcard DNS Record

Use a single wildcard record to route all subdomains to the same server:

```dns
; Wildcard DNS for tiltcheck.me
; All subdomains resolve to the same IP/hostname

; Root domain
tiltcheck.me.    300    IN    A    203.0.113.10

; Wildcard record (matches *.tiltcheck.me)
*.tiltcheck.me.  300    IN    A    203.0.113.10

; OR with CNAME for cloud deployments
*.tiltcheck.me.  300    IN    CNAME  tiltcheck-proxy.railway.app.
```

> **Note**: Wildcard records require host-based routing at the reverse proxy level to direct traffic to the correct service.

---

## 2. SSL/TLS Certificate Configuration

### A. Let's Encrypt with Certbot (Recommended)

#### Individual Certificates

Generate certificates for each subdomain:

```bash
# Install certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Generate certificates for all subdomains
sudo certbot certonly --nginx \
  -d tiltcheck.me \
  -d dashboard.tiltcheck.me \
  -d api.tiltcheck.me \
  -d justthetip.tiltcheck.me \
  -d bot.tiltcheck.me \
  -d worker.tiltcheck.me

# Certificate files will be stored at:
# /etc/letsencrypt/live/tiltcheck.me/fullchain.pem
# /etc/letsencrypt/live/tiltcheck.me/privkey.pem
```

#### Wildcard Certificate

For wildcard certificates, use DNS-01 challenge:

```bash
# Generate wildcard certificate (requires DNS provider API)
sudo certbot certonly \
  --manual \
  --preferred-challenges dns \
  -d "tiltcheck.me" \
  -d "*.tiltcheck.me"

# Or with Cloudflare DNS plugin (automated)
sudo apt-get install python3-certbot-dns-cloudflare

# Create Cloudflare credentials file
cat > /etc/letsencrypt/cloudflare.ini << EOF
dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN
EOF
chmod 600 /etc/letsencrypt/cloudflare.ini

# Generate wildcard cert automatically
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  -d "tiltcheck.me" \
  -d "*.tiltcheck.me"
```

### B. Auto-Renewal Configuration

```bash
# Test renewal process
sudo certbot renew --dry-run

# Add renewal to crontab (runs twice daily)
echo "0 0,12 * * * root certbot renew --quiet" | sudo tee /etc/cron.d/certbot-renew
```

### C. Cloud Provider Managed Certificates

Most cloud platforms handle SSL automatically:

| Platform | SSL Configuration |
|----------|------------------|
| **Railway** | Automatic SSL for custom domains |
| **Render** | Automatic SSL with Let's Encrypt |
| **Vercel** | Automatic SSL certificates |
| **Cloudflare** | Universal SSL or Advanced Certificate Manager |
| **AWS ALB** | AWS Certificate Manager (ACM) |

---

## 3. Nginx Host-Based Routing Configuration

### A. Complete Multi-Subdomain Configuration

Create `/etc/nginx/sites-available/tiltcheck.conf`:

```nginx
# TiltCheck Nginx Configuration
# Host-based routing for subdomain services

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;

# Upstream definitions for each service
upstream dashboard_backend {
    server 127.0.0.1:5055;
    keepalive 32;
}

upstream api_backend {
    server 127.0.0.1:3000;
    keepalive 64;
}

upstream justthetip_backend {
    server 127.0.0.1:3001;
    keepalive 32;
}

upstream bot_backend {
    server 127.0.0.1:8081;
    keepalive 16;
}

upstream worker_backend {
    server 127.0.0.1:8082;
    keepalive 16;
}

# HTTP → HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name tiltcheck.me *.tiltcheck.me;

    # ACME challenge for Let's Encrypt
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# Dashboard: dashboard.tiltcheck.me
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name dashboard.tiltcheck.me;

    ssl_certificate /etc/letsencrypt/live/tiltcheck.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tiltcheck.me/privkey.pem;
    include /etc/nginx/snippets/ssl-params.conf;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://dashboard_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        
        # WebSocket support for real-time updates
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        limit_req zone=general burst=20 nodelay;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://dashboard_backend/api/health;
        access_log off;
    }
}

# API: api.tiltcheck.me
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.tiltcheck.me;

    ssl_certificate /etc/letsencrypt/live/tiltcheck.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tiltcheck.me/privkey.pem;
    include /etc/nginx/snippets/ssl-params.conf;

    # CORS headers for API
    add_header Access-Control-Allow-Origin $http_origin always;
    add_header Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Authorization, Content-Type, X-Requested-With" always;
    add_header Access-Control-Allow-Credentials "true" always;

    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        return 204;
    }

    location / {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        
        # Higher rate limit for API
        limit_req zone=api burst=50 nodelay;
        
        # Longer timeouts for API calls
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        proxy_pass http://api_backend/health;
        access_log off;
    }
}

# JustTheTip: justthetip.tiltcheck.me
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name justthetip.tiltcheck.me;

    ssl_certificate /etc/letsencrypt/live/tiltcheck.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tiltcheck.me/privkey.pem;
    include /etc/nginx/snippets/ssl-params.conf;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;

    location / {
        proxy_pass http://justthetip_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        
        limit_req zone=general burst=15 nodelay;
    }

    location /health {
        proxy_pass http://justthetip_backend/health;
        access_log off;
    }
}

# Bot Webhooks: bot.tiltcheck.me
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name bot.tiltcheck.me;

    ssl_certificate /etc/letsencrypt/live/tiltcheck.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tiltcheck.me/privkey.pem;
    include /etc/nginx/snippets/ssl-params.conf;

    location / {
        proxy_pass http://bot_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        
        # Discord webhooks verification needs specific handling
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        limit_req zone=general burst=10 nodelay;
    }

    location /health {
        proxy_pass http://bot_backend/health;
        access_log off;
    }
}

# Worker: worker.tiltcheck.me
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name worker.tiltcheck.me;

    ssl_certificate /etc/letsencrypt/live/tiltcheck.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tiltcheck.me/privkey.pem;
    include /etc/nginx/snippets/ssl-params.conf;

    # Restrict access to internal networks or specific IPs
    # Uncomment and configure for production
    # allow 10.0.0.0/8;
    # allow 172.16.0.0/12;
    # allow 192.168.0.0/16;
    # deny all;

    location / {
        proxy_pass http://worker_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        
        # Longer timeouts for background jobs
        proxy_connect_timeout 120s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        limit_req zone=general burst=5 nodelay;
    }

    location /health {
        proxy_pass http://worker_backend/health;
        access_log off;
    }
}

# Root domain: tiltcheck.me (Landing Page)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name tiltcheck.me www.tiltcheck.me;

    ssl_certificate /etc/letsencrypt/live/tiltcheck.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tiltcheck.me/privkey.pem;
    include /etc/nginx/snippets/ssl-params.conf;

    # Redirect www to non-www
    if ($host = 'www.tiltcheck.me') {
        return 301 https://tiltcheck.me$request_uri;
    }

    root /var/www/tiltcheck/landing;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
        limit_req zone=general burst=30 nodelay;
    }

    # Static asset caching
    location ~* \.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff|woff2)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

### B. SSL Parameters Snippet

Create `/etc/nginx/snippets/ssl-params.conf`:

```nginx
# SSL/TLS Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;

# SSL session configuration
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;

# OCSP Stapling
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;

# DH Parameters (generate with: openssl dhparam -out /etc/nginx/dhparam.pem 4096)
# ssl_dhparam /etc/nginx/dhparam.pem;
```

---

## 4. Traefik Host-Based Routing Configuration

### A. Docker Compose with Traefik

Create `docker-compose.traefik.yml`:

```yaml
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    command:
      # API and Dashboard
      - "--api.dashboard=true"
      - "--api.insecure=false"
      
      # Entrypoints
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      
      # HTTP to HTTPS redirect
      - "--entrypoints.web.http.redirections.entryPoint.to=websecure"
      - "--entrypoints.web.http.redirections.entryPoint.scheme=https"
      
      # Docker provider
      - "--providers.docker=true"
      - "--providers.docker.exposedByDefault=false"
      - "--providers.docker.network=tiltcheck"
      
      # Let's Encrypt
      - "--certificatesresolvers.letsencrypt.acme.email=admin@tiltcheck.me"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      
      # Logging
      - "--log.level=INFO"
      - "--accesslog=true"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    networks:
      - tiltcheck
    labels:
      # Dashboard access (optional, secure with auth)
      - "traefik.enable=true"
      - "traefik.http.routers.traefik.rule=Host(`traefik.tiltcheck.me`)"
      - "traefik.http.routers.traefik.entrypoints=websecure"
      - "traefik.http.routers.traefik.tls.certresolver=letsencrypt"
      - "traefik.http.routers.traefik.service=api@internal"
      # Basic auth (generate with: htpasswd -nb admin password)
      - "traefik.http.routers.traefik.middlewares=auth"
      - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$..."

  # Dashboard Service
  dashboard:
    build:
      context: .
      dockerfile: ./apps/dashboard/Dockerfile
    container_name: tiltcheck-dashboard
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=5055
    networks:
      - tiltcheck
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.dashboard.rule=Host(`dashboard.tiltcheck.me`)"
      - "traefik.http.routers.dashboard.entrypoints=websecure"
      - "traefik.http.routers.dashboard.tls.certresolver=letsencrypt"
      - "traefik.http.services.dashboard.loadbalancer.server.port=5055"
      # Rate limiting
      - "traefik.http.routers.dashboard.middlewares=ratelimit"
      - "traefik.http.middlewares.ratelimit.ratelimit.average=100"
      - "traefik.http.middlewares.ratelimit.ratelimit.burst=50"

  # API Service
  api:
    build:
      context: .
      dockerfile: ./apps/api/Dockerfile
    container_name: tiltcheck-api
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
    networks:
      - tiltcheck
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.api.rule=Host(`api.tiltcheck.me`)"
      - "traefik.http.routers.api.entrypoints=websecure"
      - "traefik.http.routers.api.tls.certresolver=letsencrypt"
      - "traefik.http.services.api.loadbalancer.server.port=3000"
      # CORS middleware
      - "traefik.http.routers.api.middlewares=cors-headers"
      - "traefik.http.middlewares.cors-headers.headers.accesscontrolallowmethods=GET,POST,PUT,DELETE,OPTIONS"
      - "traefik.http.middlewares.cors-headers.headers.accesscontrolallowheaders=*"
      - "traefik.http.middlewares.cors-headers.headers.accesscontrolalloworiginlist=*"
      - "traefik.http.middlewares.cors-headers.headers.accesscontrolmaxage=100"

  # JustTheTip Service
  justthetip:
    build:
      context: .
      dockerfile: ./apps/justthetip/Dockerfile
    container_name: tiltcheck-justthetip
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3001
    networks:
      - tiltcheck
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.justthetip.rule=Host(`justthetip.tiltcheck.me`)"
      - "traefik.http.routers.justthetip.entrypoints=websecure"
      - "traefik.http.routers.justthetip.tls.certresolver=letsencrypt"
      - "traefik.http.services.justthetip.loadbalancer.server.port=3001"
      # Security headers
      - "traefik.http.routers.justthetip.middlewares=security-headers"
      - "traefik.http.middlewares.security-headers.headers.framedeny=true"
      - "traefik.http.middlewares.security-headers.headers.contenttypenosniff=true"

  # Bot Webhooks Service
  bot:
    build:
      context: .
      dockerfile: ./apps/bot/Dockerfile
    container_name: tiltcheck-bot
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=8081
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - DISCORD_CLIENT_ID=${DISCORD_CLIENT_ID}
    networks:
      - tiltcheck
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.bot.rule=Host(`bot.tiltcheck.me`)"
      - "traefik.http.routers.bot.entrypoints=websecure"
      - "traefik.http.routers.bot.tls.certresolver=letsencrypt"
      - "traefik.http.services.bot.loadbalancer.server.port=8081"

  # Worker Service
  worker:
    build:
      context: .
      dockerfile: ./apps/worker/Dockerfile
    container_name: tiltcheck-worker
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=8082
    networks:
      - tiltcheck
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.worker.rule=Host(`worker.tiltcheck.me`)"
      - "traefik.http.routers.worker.entrypoints=websecure"
      - "traefik.http.routers.worker.tls.certresolver=letsencrypt"
      - "traefik.http.services.worker.loadbalancer.server.port=8082"
      # IP whitelist for internal access (optional)
      # - "traefik.http.routers.worker.middlewares=ipwhitelist"
      # - "traefik.http.middlewares.ipwhitelist.ipwhitelist.sourcerange=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"

networks:
  tiltcheck:
    driver: bridge
```

### B. Traefik Static Configuration (File Provider Alternative)

Create `traefik/traefik.yml`:

```yaml
# Traefik Static Configuration

api:
  dashboard: true
  insecure: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: tiltcheck
  file:
    directory: /etc/traefik/dynamic
    watch: true

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@tiltcheck.me
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web
  letsencrypt-dns:
    acme:
      email: admin@tiltcheck.me
      storage: /letsencrypt/acme-dns.json
      dnsChallenge:
        provider: cloudflare
        delayBeforeCheck: 10

log:
  level: INFO

accessLog: {}
```

### C. Traefik Dynamic Configuration

Create `traefik/dynamic/tiltcheck.yml`:

```yaml
# Traefik Dynamic Configuration for TiltCheck

http:
  routers:
    # Dashboard Router
    dashboard:
      rule: "Host(`dashboard.tiltcheck.me`)"
      entryPoints:
        - websecure
      service: dashboard
      tls:
        certResolver: letsencrypt
      middlewares:
        - rate-limit
        - security-headers

    # API Router
    api:
      rule: "Host(`api.tiltcheck.me`)"
      entryPoints:
        - websecure
      service: api
      tls:
        certResolver: letsencrypt
      middlewares:
        - rate-limit-api
        - cors-headers
        - security-headers

    # JustTheTip Router
    justthetip:
      rule: "Host(`justthetip.tiltcheck.me`)"
      entryPoints:
        - websecure
      service: justthetip
      tls:
        certResolver: letsencrypt
      middlewares:
        - rate-limit
        - security-headers

    # Bot Webhooks Router
    bot:
      rule: "Host(`bot.tiltcheck.me`)"
      entryPoints:
        - websecure
      service: bot
      tls:
        certResolver: letsencrypt
      middlewares:
        - rate-limit
        - security-headers

    # Worker Router
    worker:
      rule: "Host(`worker.tiltcheck.me`)"
      entryPoints:
        - websecure
      service: worker
      tls:
        certResolver: letsencrypt
      middlewares:
        - rate-limit
        - security-headers
        # Uncomment for IP restriction
        # - ip-whitelist

  services:
    dashboard:
      loadBalancer:
        servers:
          - url: "http://dashboard:5055"
        healthCheck:
          path: /api/health
          interval: 30s

    api:
      loadBalancer:
        servers:
          - url: "http://api:3000"
        healthCheck:
          path: /health
          interval: 30s

    justthetip:
      loadBalancer:
        servers:
          - url: "http://justthetip:3001"
        healthCheck:
          path: /health
          interval: 30s

    bot:
      loadBalancer:
        servers:
          - url: "http://bot:8081"
        healthCheck:
          path: /health
          interval: 30s

    worker:
      loadBalancer:
        servers:
          - url: "http://worker:8082"
        healthCheck:
          path: /health
          interval: 30s

  middlewares:
    # Rate limiting for general traffic
    rate-limit:
      rateLimit:
        average: 100
        burst: 50
        period: 1s

    # Higher rate limit for API
    rate-limit-api:
      rateLimit:
        average: 200
        burst: 100
        period: 1s

    # CORS headers for API
    cors-headers:
      headers:
        accessControlAllowMethods:
          - GET
          - POST
          - PUT
          - DELETE
          - OPTIONS
        accessControlAllowHeaders:
          - "*"
        accessControlAllowOriginList:
          - "*"
        accessControlMaxAge: 100
        addVaryHeader: true

    # Security headers
    security-headers:
      headers:
        frameDeny: true
        contentTypeNosniff: true
        browserXssFilter: true
        stsSeconds: 31536000
        stsIncludeSubdomains: true
        stsPreload: true

    # IP whitelist (for internal services)
    ip-whitelist:
      ipWhiteList:
        sourceRange:
          - "10.0.0.0/8"
          - "172.16.0.0/12"
          - "192.168.0.0/16"
          - "127.0.0.1/32"

# TLS Configuration
tls:
  options:
    default:
      minVersion: VersionTLS12
      sniStrict: true
      cipherSuites:
        - TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
        - TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
        - TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305
```

---

## 5. Cloud Platform Configuration

### A. Railway

```yaml
# railway.json for multi-service deployment
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE"
  },
  "deploy": {
    "numReplicas": 1,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

Configure custom domains in Railway Dashboard:
1. Go to Service Settings → Domains
2. Add custom domain (e.g., `dashboard.tiltcheck.me`)
3. Railway provides CNAME target (e.g., `dashboard-production.up.railway.app`)
4. Add CNAME record in your DNS provider
5. Railway handles SSL automatically

### B. Render

```yaml
# render.yaml for multi-service deployment
services:
  - type: web
    name: tiltcheck-dashboard
    env: docker
    dockerfilePath: ./apps/dashboard/Dockerfile
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5055

  - type: web
    name: tiltcheck-api
    env: docker
    dockerfilePath: ./apps/api/Dockerfile
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000

  - type: web
    name: tiltcheck-justthetip
    env: docker
    dockerfilePath: ./apps/justthetip/Dockerfile
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001

  - type: web
    name: tiltcheck-bot
    env: docker
    dockerfilePath: ./apps/bot/Dockerfile
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 8081
      - key: DISCORD_TOKEN
        sync: false

  - type: worker
    name: tiltcheck-worker
    env: docker
    dockerfilePath: ./apps/worker/Dockerfile
    envVars:
      - key: NODE_ENV
        value: production
```

### C. Cloudflare (DNS + Proxy)

Use Cloudflare for DNS with orange-cloud proxying:

1. Add domain to Cloudflare
2. Update nameservers at registrar
3. Configure DNS records (proxied):
   ```
   dashboard  CNAME  tiltcheck-dashboard.railway.app  (Proxied)
   api        CNAME  tiltcheck-api.railway.app        (Proxied)
   justthetip CNAME  tiltcheck-justthetip.railway.app (Proxied)
   bot        CNAME  tiltcheck-bot.railway.app        (Proxied)
   worker     CNAME  tiltcheck-worker.railway.app     (Proxied)
   ```
4. Enable SSL/TLS → Full (Strict) mode
5. Configure Page Rules or Transform Rules as needed

---

## 6. Verification Checklist

### DNS Verification

```bash
# Check DNS resolution for all subdomains
for subdomain in dashboard api justthetip bot worker; do
  echo "=== $subdomain.tiltcheck.me ==="
  dig +short $subdomain.tiltcheck.me
  echo ""
done
```

### SSL Certificate Verification

```bash
# Check SSL certificate details
for subdomain in dashboard api justthetip bot worker; do
  echo "=== $subdomain.tiltcheck.me ==="
  echo | openssl s_client -servername $subdomain.tiltcheck.me \
    -connect $subdomain.tiltcheck.me:443 2>/dev/null | \
    openssl x509 -noout -dates -subject
  echo ""
done
```

### Service Health Checks

```bash
# Check all service health endpoints
for subdomain in dashboard api justthetip bot worker; do
  echo "=== $subdomain.tiltcheck.me ==="
  curl -s -o /dev/null -w "%{http_code}" https://$subdomain.tiltcheck.me/health
  echo ""
done
```

---

## 7. Troubleshooting

### DNS Issues

| Problem | Solution |
|---------|----------|
| DNS not resolving | Check nameserver configuration; wait for propagation (up to 48h) |
| CNAME on apex domain | Use ALIAS/ANAME record or A record instead |
| Wildcard not working | Ensure `*.domain.com` record exists; some providers need explicit subdomains |

### SSL Issues

| Problem | Solution |
|---------|----------|
| Certificate error | Verify certificate covers all subdomains; check expiration |
| Mixed content | Ensure all resources use HTTPS |
| HSTS issues | Clear browser cache or use incognito mode |

### Routing Issues

| Problem | Solution |
|---------|----------|
| 502 Bad Gateway | Check upstream service is running; verify port configuration |
| 504 Gateway Timeout | Increase proxy timeout settings |
| Service not found | Verify container name matches upstream definition |

---

## Related Documentation

- [DEPLOYMENT.md](../DEPLOYMENT.md) - Main deployment guide
- [DEPLOYMENT-OVERVIEW.md](../DEPLOYMENT-OVERVIEW.md) - Service deployment overview
- [HYPERLIFT.md](../HYPERLIFT.md) - Starlight Hyperlift deployment
- [DOCKER.md](../DOCKER.md) - Docker deployment guide
- [ONE-LAUNCH-DEPLOYMENT.md](../ONE-LAUNCH-DEPLOYMENT.md) - Quick start deployment

---

**TiltCheck Ecosystem © 2024–2025 jmenichole**
