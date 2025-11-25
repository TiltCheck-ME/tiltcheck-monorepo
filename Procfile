# Process orchestration for Render unified container
# Each process runs in parallel; forego manages lifecycle

nginx: nginx -g 'daemon off;'
landing: node services/landing/server.js
dashboard: node services/dashboard/dist/index.js
justthetip: node apps/justthetip-bot/dist/index.js
rollup: node services/trust-rollup/dist/index.js
