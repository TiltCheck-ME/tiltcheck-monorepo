// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-10
#!/usr/bin/env node

const http = require('http');

const PORT = process.env.DISCORD_BOT_HEALTH_PORT || 8083;
const TIMEOUT_MS = 2000;

const options = {
  host: process.env.HEALTH_CHECK_HOST || 'localhost',
  port: PORT,
  path: '/health',
  timeout: TIMEOUT_MS,
  method: 'GET',
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const health = JSON.parse(data);
        console.log(`Bot is healthy: ${JSON.stringify(health)}`);
        process.exit(0);
      } catch (error) {
        console.error('Invalid health response:', error.message);
        process.exit(1);
      }
    } else {
      console.error(`Unhealthy status code: ${res.statusCode}`);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error(`Health check failed: ${error.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('Health check timed out');
  req.destroy();
  process.exit(1);
});

req.end();
