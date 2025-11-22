// Meta builders for status & sitemap to declutter server.js

function buildServiceStatus() {
  return [
    { name: 'Discord Bot', status: 'online', port: null },
    { name: 'Trust Dashboard', status: 'online', port: 5055 },
    { name: 'User Dashboard', status: 'online', port: 6001 },
    { name: 'Casino Data API', status: 'online', port: 6002 },
    { name: 'Gameplay Analyzer', status: 'online', port: 7072 },
    { name: 'Trust Rollup', status: 'online', port: 8082 },
    { name: 'Landing Page', status: 'online', port: 8080 }
  ];
}

function buildSiteMap() {
  const now = Date.now();
  const stamp = () => ({ status: 'live', lastChecked: now });
  return {
    'Main Site': {
      '/': { title: 'Homepage', ...stamp() },
      '/about.html': { title: 'About TiltCheck', ...stamp() },
      '/casinos.html': { title: 'Casino Directory', ...stamp() },
      '/trust.html': { title: 'Trust Dashboard', ...stamp() },
      '/degen-trust.html': { title: 'Degen Trust Engine', ...stamp() },
      '/control-room': { title: 'Admin Control Room', ...stamp() }
    },
    'Tools Suite': {
      '/tools/justthetip.html': { title: 'JustTheTip - Solana Tips', ...stamp() },
      '/tools/suslink.html': { title: 'SusLink - URL Scanner', ...stamp() },
      '/tools/collectclock.html': { title: 'CollectClock - Time Tracking', ...stamp() },
      '/tools/freespinscan.html': { title: 'FreeSpinScan - Bonus Tracker', ...stamp() },
      '/tools/tiltcheck-core.html': { title: 'TiltCheck Core', ...stamp() },
      '/tools/poker.html': { title: 'Poker Analytics', status: 'dev', lastChecked: now },
      '/tools/triviadrops.html': { title: 'TriviaDrops - Rewards', ...stamp() },
      '/tools/qualifyfirst.html': { title: 'QualifyFirst - Verification', status: 'dev', lastChecked: now },
      '/tools/daad.html': { title: 'DA&D - Decision Analytics', ...stamp() }
    },
    'API Endpoints': {
      '/api/health': { title: 'Health Check', ...stamp() },
      '/api/rollups/latest': { title: 'Latest Trust Rollups', ...stamp() },
      '/api/domains': { title: 'Domain Trust Scores', ...stamp() },
      '/api/degens': { title: 'User Trust Scores', ...stamp() },
      '/api/severity': { title: 'Severity Buckets', ...stamp() },
      '/admin/status': { title: 'Admin Status (Protected)', ...stamp() },
      '/admin/sitemap': { title: 'Site Map API (Protected)', ...stamp() }
    },
    'System Services': {
      'Discord Bot': { title: 'TiltCheck#8564', status: 'live', port: null },
      'Trust Dashboard Service': { title: 'Dashboard API', status: 'live', port: 5055 },
      'Landing Service': { title: 'Marketing & Static', status: 'live', port: 3000 },
      'Trust Rollup Service': { title: 'Data Aggregation', status: 'live', port: 8082 },
      'Event Router': { title: 'Message Bus', status: 'live', port: null }
    }
  };
}

module.exports = { buildServiceStatus, buildSiteMap };