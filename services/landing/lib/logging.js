// Logging / metrics module
// Provides request logging and lightweight in-memory counters.
const fs = require('fs');
const path = require('path');

function initLogging(logPath) {
  try { fs.mkdirSync(path.dirname(logPath), { recursive: true }); } catch {}

  const pathCounters = Object.create(null);
  const uaCounters = Object.create(null);

  function requestLogger(req, _res, next) {
    const ts = new Date().toISOString();
    const line = JSON.stringify({ ts, method: req.method, path: req.originalUrl, ip: req.ip, ua: req.headers['user-agent'] || '' }) + '\n';
    fs.appendFile(logPath, line, err => { if (err) console.error('log append failed', err); });
    pathCounters[req.path] = (pathCounters[req.path] || 0) + 1;
    const ua = (req.headers['user-agent'] || '').slice(0, 60);
    uaCounters[ua] = (uaCounters[ua] || 0) + 1;
    next();
  }

  function adminLogger(req) {
    const ts = new Date().toISOString();
    const line = JSON.stringify({ ts, event: 'ADMIN_ACCESS', ip: req.ip, ua: req.headers['user-agent'] || '' }) + '\n';
    try { fs.appendFileSync(logPath, line); } catch (err) { console.error('admin log failed', err); }
  }

  function buildMetrics() {
    const topPaths = Object.entries(pathCounters)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([p, c]) => ({ path: p, count: c }));
    const topUAs = Object.entries(uaCounters)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ua, c]) => ({ ua, count: c }));
    return { topPaths, topUAs, totalRequests: Object.values(pathCounters).reduce((a, b) => a + b, 0) };
  }

  return { requestLogger, adminLogger, buildMetrics, pathCounters };
}

module.exports = { initLogging };