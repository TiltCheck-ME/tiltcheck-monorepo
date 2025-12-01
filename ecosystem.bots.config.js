// PM2 ecosystem for running both Discord bots in one container
// Maps separate env vars per bot so tokens don’t collide.

module.exports = {
  apps: [
    {
      name: 'discord-bot',
      script: './apps/discord-bot/dist/index.js',
      cwd: './',
      watch: false,
      env: {
        NODE_ENV: 'production',
        // Map main bot envs from container-level variables
        DISCORD_TOKEN: process.env.MAIN_DISCORD_TOKEN,
        DISCORD_CLIENT_ID: process.env.MAIN_DISCORD_CLIENT_ID,
        DISCORD_GUILD_ID: process.env.MAIN_DISCORD_GUILD_ID,
        DASHBOARD_URL: process.env.MAIN_DASHBOARD_URL || process.env.DASHBOARD_URL,
        COMMAND_PREFIX: process.env.MAIN_COMMAND_PREFIX || '!',
        SUSLINK_AUTO_SCAN: process.env.MAIN_SUSLINK_AUTO_SCAN || 'true',
        TRUST_THRESHOLD: process.env.MAIN_TRUST_THRESHOLD || '60',
      },
    },
    {
      name: 'dad-bot',
      script: './apps/dad-bot/dist/index.js',
      cwd: './',
      watch: false,
      env: {
        NODE_ENV: 'production',
        // Map DA&D bot envs from container-level variables
        DISCORD_TOKEN: process.env.DAD_DISCORD_TOKEN,
        DISCORD_CLIENT_ID: process.env.DAD_DISCORD_CLIENT_ID,
        DISCORD_GUILD_ID: process.env.DAD_DISCORD_GUILD_ID,
        COMMAND_PREFIX: process.env.DAD_COMMAND_PREFIX || '!',
        SUSLINK_AUTO_SCAN: process.env.DAD_SUSLINK_AUTO_SCAN || 'true',
        TRUST_THRESHOLD: process.env.DAD_TRUST_THRESHOLD || '60',
        DAD_BOT_HEALTH_PORT: process.env.DAD_BOT_HEALTH_PORT || '8082',
      },
    },
  ],
};
