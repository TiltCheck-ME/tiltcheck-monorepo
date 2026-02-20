# Process orchestration for Render unified container
# Each process runs in parallel; forego manages lifecycle

nginx: nginx -g 'daemon off;'
bot: node apps/discord-bot/dist/index.js
dad-bot: node apps/dad-bot/dist/index.js
rollup: node apps/trust-rollup/dist/index.js
ai-gateway: node apps/ai-gateway/server.js
