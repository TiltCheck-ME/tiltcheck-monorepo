/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */

import { cookies } from 'next/headers';

export interface ServerAuthContext {
  isAuthenticated: boolean;
  discordId: string | null;
}

export async function getServerAuthContext(): Promise<ServerAuthContext> {
  const cookieStore = await cookies();
  const token = cookieStore.get('tc_token')?.value;

  if (!token) {
    return { isAuthenticated: false, discordId: null };
  }

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'https://api.tiltcheck.me').replace(/\/$/, '');

  try {
    const response = await fetch(`${apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { isAuthenticated: false, discordId: null };
    }

    const payload = (await response.json()) as { discordId?: string | null; userId?: string | null };
    const discordId = payload.discordId ?? payload.userId ?? null;
    return {
      isAuthenticated: Boolean(discordId),
      discordId,
    };
  } catch {
    return { isAuthenticated: false, discordId: null };
  }
}
