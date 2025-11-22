// Security / IP Allowlist middleware
// Keeps admin route protection isolated.

function buildAdminIPs(env) {
  const ips = [
    '127.0.0.1',
    '::1',
    '::ffff:127.0.0.1',
    env.ADMIN_IP_1,
    env.ADMIN_IP_2,
    env.ADMIN_IP_3,
  ].filter(Boolean);
  return ips;
}

function ipAllowlistMiddleware(allowed) {
  return function ipAllowlist(req, res, next) {
    const clientIP = req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
      (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
      req.headers['x-real-ip'] ||
      '127.0.0.1';

    console.log(`[${new Date().toISOString()}] Admin access attempt from IP: ${clientIP}`);

    if (!allowed.includes(clientIP)) {
      console.warn(`[SECURITY] Blocked admin access from unauthorized IP: ${clientIP}`);
      return res.status(403).json({
        error: 'Access denied',
        message: 'Admin panel access is restricted to authorized IPs only',
        timestamp: new Date().toISOString(),
        clientIP,
        allowedIPs: allowed,
      });
    }
    console.log(`[SECURITY] Admin access granted to authorized IP: ${clientIP}`);
    next();
  };
}

module.exports = { buildAdminIPs, ipAllowlistMiddleware };