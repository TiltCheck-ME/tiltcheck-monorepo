// PM2 Ecosystem Configuration for TiltCheck
// Run all services locally with: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'trust-rollup',
      script: './apps/trust-rollup/dist/index.js',
      cwd: './',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'discord-bot',
      script: './apps/discord-bot/dist/index.js',
      cwd: './',
      watch: false,
      env: {
        NODE_ENV: 'production',
        DISCORD_TOKEN: process.env.DISCORD_TOKEN,
        DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
        DASHBOARD_URL: 'http://localhost:5055',
      },
    },
    {
      name: 'dad-bot',
      script: './apps/dad-bot/dist/index.js',
      cwd: './',
      watch: false,
      env: {
        NODE_ENV: 'production',
        DISCORD_TOKEN: process.env.DAD_DISCORD_TOKEN,
        DISCORD_CLIENT_ID: process.env.DAD_DISCORD_CLIENT_ID,
        DISCORD_GUILD_ID: process.env.DAD_DISCORD_GUILD_ID,
        DAD_BOT_HEALTH_PORT: '8082',
      },
    },
    {
      name: 'ai-gateway',
      script: './apps/ai-gateway/server.js',
      cwd: './',
      watch: false,
      env: {
        NODE_ENV: 'production',
        AI_GATEWAY_PORT: '3001',
      },
    },
  ],
};
