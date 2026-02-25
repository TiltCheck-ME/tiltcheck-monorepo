/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
// Express utilities: logging middleware with metrics
const fs = require('fs');
const path = require('path');

/**
 * Initialize request logging with in-memory metrics
 * @param {string} logPath - Path to log file (NDJSON format)
 * @returns {Object} - { requestLogger, adminLogger, buildMetrics, pathCounters }
 */
function initLogging(logPath) {
  try { fs.mkdirSync(path.dirname(logPath), { recursive: true }); } catch {}

  const pathCounters = Object.create(null);
  const uaCounters = Object.create(null);

  /**
   * Express middleware for request logging
   */
  function requestLogger(req, _res, next) {
    const ts = new Date().toISOString();
    const line = JSON.stringify({ 
      ts, 
      method: req.method, 
      path: req.originalUrl, 
      ip: req.ip, 
      ua: req.headers['user-agent'] || '' 
    }) + '\n';
    
    fs.appendFile(logPath, line, err => { 
      if (err) console.error('log append failed', err); 
    });
    
    pathCounters[req.path] = (pathCounters[req.path] || 0) + 1;
    const ua = (req.headers['user-agent'] || '').slice(0, 60);
    uaCounters[ua] = (uaCounters[ua] || 0) + 1;
    next();
  }

  /**
   * Log admin access events synchronously
   */
  function adminLogger(req) {
    const ts = new Date().toISOString();
    const line = JSON.stringify({ 
      ts, 
      event: 'ADMIN_ACCESS', 
      ip: req.ip, 
      ua: req.headers['user-agent'] || '' 
    }) + '\n';
    
    try { 
      fs.appendFileSync(logPath, line); 
    } catch (err) { 
      console.error('admin log failed', err); 
    }
  }

  /**
   * Build metrics snapshot from in-memory counters
   */
  function buildMetrics() {
    const topPaths = Object.entries(pathCounters)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([p, c]) => ({ path: p, count: c }));
      
    const topUAs = Object.entries(uaCounters)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([ua, c]) => ({ ua, count: c }));
      
    const totalRequests = Object.values(pathCounters).reduce((a, b) => a + b, 0);
    
    return { topPaths, topUAs, totalRequests };
  }

  return { requestLogger, adminLogger, buildMetrics, pathCounters };
}

module.exports = { initLogging };

