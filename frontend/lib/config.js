// Config loader - gathers environment + defaults
const path = require('path');
const fs = require('fs');

function loadConfig() {
  // Attempt to load .env.local (non-dotenv parsing to keep deps light)
  try {
    const envFile = path.join(__dirname, '../../.env.local');
    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envFile, 'utf8');
      envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value && !process.env[key]) {
          process.env[key] = value;
        }
      });
      console.log('Loaded environment variables from .env.local');
    }
  } catch (e) {
    console.warn('Could not load .env.local:', e.message);
  }

  return {
    PORT: process.env.PORT || 3000,
    LANDING_LOG_PATH: process.env.LANDING_LOG_PATH || '/tmp/landing-requests.log',
    PUBLIC_BASE_URL: process.env.PUBLIC_BASE_URL || 'https://tiltcheck.me',
    API_URL: process.env.API_URL || 'https://tiltcheck.me/api',
    WS_URL: process.env.WS_URL || 'wss://tiltcheck.me/ws',
    ADMIN_IP_1: process.env.ADMIN_IP_1,
    ADMIN_IP_2: process.env.ADMIN_IP_2,
    ADMIN_IP_3: process.env.ADMIN_IP_3,
    NODE_ENV: process.env.NODE_ENV || 'development'
  };
}

module.exports = { loadConfig };