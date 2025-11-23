// PM2 Ecosystem Configuration for TiltCheck
// Run all services locally with: pm2 start ecosystem.config.js

module.exports = {
  apps: [
    {
      name: 'trust-rollup',
      script: './services/trust-rollup/dist/index.js',
      cwd: './',
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'dashboard',
      script: './services/dashboard/dist/server.js',
      cwd: './',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: '5055',
        DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL,
        DASHBOARD_EVENTS_KEEP_DAYS: '7',
        DASHBOARD_POLL_MS: '5000',
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
      name: 'landing',
      script: './services/landing/server.js',
      cwd: './',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: '8080',
        LANDING_LOG_PATH: '/tmp/landing-requests.log',
        ADMIN_IP_1: process.env.ADMIN_IP_1 || '127.0.0.1',
        ADMIN_IP_2: process.env.ADMIN_IP_2,
        ADMIN_IP_3: process.env.ADMIN_IP_3,
      },
    },
  ],
};
