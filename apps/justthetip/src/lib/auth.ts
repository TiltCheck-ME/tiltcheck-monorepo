/**
 * Auth utilities for JustTheTip
 * Handles Discord OAuth session + Magic Link linking
 */

export interface UserSession {
  discordId: string;
  discordUsername: string;
  discordAvatar?: string;
  magicAddress?: string; // Magic Link custodial wallet
  payoutWallet?: string; // User-registered external Solana wallet
}

/**
 * Get session from cookie/header (server-side)
 * In production this would verify a JWT from the Discord OAuth flow
 */
export async function getServerSession(
  request: Request
): Promise<UserSession | null> {
  const authHeader = request.headers.get('Authorization');
  const cookieHeader = request.headers.get('Cookie');

  // Try Bearer token first
  let token: string | null = null;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => {
        const [k, ...v] = c.trim().split('=');
        return [k, v.join('=')];
      })
    );
    token = cookies['jtt_session'] || null;
  }

  if (!token) return null;

  // Verify JWT - in production use proper JWT library
  // For now decode the payload (no verification in dev)
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));

    // Check expiry
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    return {
      discordId: payload.discord_id,
      discordUsername: payload.discord_username,
      discordAvatar: payload.discord_avatar,
      magicAddress: payload.magic_address,
      payoutWallet: payload.payout_wallet,
    };
  } catch {
    return null;
  }
}

/**
 * Create a session token (used by the auth callback)
 */
export function createSessionToken(session: UserSession): string {
  const payload = {
    discord_id: session.discordId,
    discord_username: session.discordUsername,
    discord_avatar: session.discordAvatar,
    magic_address: session.magicAddress,
    payout_wallet: session.payoutWallet,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };

  // Simple base64 JWT (no sig in dev - replace with proper signing in prod)
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.nosig`;
}
