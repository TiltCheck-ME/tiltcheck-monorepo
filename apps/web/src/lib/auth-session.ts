/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-15 */

export type AuthSession = {
  userId: string;
  email?: string | null;
  discordId?: string | null;
  discordUsername?: string | null;
  walletAddress?: string | null;
  roles: string[];
  isAdmin: boolean;
  username: string;
};

type FetchAuthSessionOptions = {
  apiBase?: string;
  tokenStorageKey?: string;
  includeStoredToken?: boolean;
};

function normalizeApiBase(value?: string): string {
  if (!value) {
    return '';
  }

  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export async function fetchAuthSession(
  options: FetchAuthSessionOptions = {},
): Promise<AuthSession | null> {
  const apiBase = normalizeApiBase(options.apiBase ?? process.env.NEXT_PUBLIC_API_URL ?? '');
  const includeStoredToken = options.includeStoredToken ?? true;
  const tokenStorageKey = options.tokenStorageKey ?? 'tc_token';
  const token =
    includeStoredToken && typeof window !== 'undefined'
      ? window.localStorage.getItem(tokenStorageKey)
      : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const response = await fetch(`${apiBase}/auth/me`, {
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as Partial<AuthSession> & {
    username?: string | null;
  };

  if (!data.userId) {
    return null;
  }

  return {
    userId: data.userId,
    email: data.email ?? null,
    discordId: data.discordId ?? null,
    discordUsername: data.discordUsername ?? null,
    walletAddress: data.walletAddress ?? null,
    roles: Array.isArray(data.roles) ? data.roles : [],
    isAdmin: Boolean(data.isAdmin),
    username:
      data.discordUsername?.trim() ||
      data.username?.trim() ||
      data.email?.trim() ||
      data.userId,
  };
}
