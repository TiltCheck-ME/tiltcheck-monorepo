// @tiltcheck/express-utils
// Shared Express middleware and utilities for TiltCheck services

const { initLogging } = require('./logging');
const { buildAdminIPs, ipAllowlistMiddleware } = require('./security');

module.exports = {
  // Logging
  initLogging,
  
  // Security
  buildAdminIPs,
  ipAllowlistMiddleware,
};
