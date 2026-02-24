// PM2 ecosystem config for tiltcheck.me server deployment
// Covers: static-less web (Apache handles), dashboard, control-room, casino-api, qualifyfirst-service
// Run with: pm2 start ecosystem.config.cjs

const ROOT = '/home/jme/tiltcheck-monorepo';

module.exports = {
  apps: [
    // -------------------------------------------------------------------
    // Main website dashboard (Next.js) — proxied from tiltcheck.me root
    // Virtualmin: proxy http://localhost:3000/
    // -------------------------------------------------------------------
    {
      name: 'dashboard',
      cwd: `${ROOT}/apps/dashboard`,
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
    },

    // -------------------------------------------------------------------
    // Control Room (Express + WebSocket + Discord OAuth)
    // Virtualmin: proxy /control-room/ → http://localhost:3001/
    // -------------------------------------------------------------------
    {
      name: 'control-room',
      cwd: `${ROOT}/apps/control-room`,
      script: 'src/server-trust-auth.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        CONTROL_ROOM_PORT: '3001',
      },
    },

    // -------------------------------------------------------------------
    // Casino Data API (Express, read-only JSON data)
    // Virtualmin: proxy /api/casinos/ → http://localhost:6002/
    // Note: uses CASINO_API_PORT — default is 6002 in source
    // Requires a build first: pnpm --filter @tiltcheck/casino-data-api build
    // -------------------------------------------------------------------
    {
      name: 'casino-api',
      cwd: `${ROOT}/apps/casino-api`,
      script: 'dist/index.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        CASINO_API_PORT: '6002',
      },
    },

    // -------------------------------------------------------------------
    // QualifyFirst Service (Express)
    // Virtualmin: proxy /api/qualify/ → http://localhost:3003/
    // -------------------------------------------------------------------
    {
      name: 'qualifyfirst',
      cwd: `${ROOT}/apps/qualifyfirst-service`,
      script: 'src/server.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        QUALIFYFIRST_PORT: '3003',
      },
    },
  ],
};
