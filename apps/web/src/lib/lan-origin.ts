/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

import os from 'os';

function isPrivateIpv4(address: string): boolean {
  if (address.startsWith('10.')) return true;
  if (address.startsWith('192.168.')) return true;
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((n) => Number.isNaN(n))) return false;
  return octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31;
}

/** First non-loopback IPv4 on a private LAN — for phone QR codes during local dev. */
export function getLanIpv4(): string | null {
  const nets = os.networkInterfaces();
  for (const ifaces of Object.values(nets)) {
    if (!ifaces) continue;
    for (const iface of ifaces) {
      const family = String(iface.family);
      const isIpv4 = family === 'IPv4' || family === '4';
      if (!isIpv4 || iface.internal) continue;
      if (iface.address.startsWith('169.254.')) continue;
      if (!isPrivateIpv4(iface.address)) continue;
      return iface.address;
    }
  }
  return null;
}

export function buildLanOrigin(port: number): string | null {
  const ip = getLanIpv4();
  if (!ip) return null;
  return `http://${ip}:${port}`;
}

export function isLocalhostOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

/** Local Next dev — localhost or private LAN IP on the dev port. */
export function isLocalDevHost(hostname: string, port?: string | number | null): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
    return true;
  }
  const devPort = String(port ?? '3000');
  if (devPort !== '3000') return false;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
  return false;
}

export function isLocalDevOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return isLocalDevHost(parsed.hostname, parsed.port || '3000');
  } catch {
    return false;
  }
}
