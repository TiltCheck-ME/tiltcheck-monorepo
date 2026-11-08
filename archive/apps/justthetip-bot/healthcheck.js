#!/usr/bin/env node
// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-12

const http = require('http');

function getPort() {
  const candidates = [
    process.env.PORT,
    process.env.JTT_BOT_HEALTH_PORT,
    process.env.DISCORD_BOT_HEALTH_PORT,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = parseInt(candidate, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return 8082;
}

const PORT = getPort();
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
