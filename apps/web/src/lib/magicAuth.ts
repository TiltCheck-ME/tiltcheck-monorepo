// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-13
'use client';

type MagicConfigResponse = {
  enabled: boolean;
  publishableKey: string | null;
};

type MagicLoginResponse = {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string | null;
    roles: string[];
    discordId?: string | null;
    discordUsername?: string | null;
    displayName?: string | null;
  };
};

async function getMagicPublishableKey(apiUrl: string): Promise<string> {
  const response = await fetch(`${apiUrl}/auth/magic/config`, { credentials: 'include' });
  const payload = (await response.json().catch(() => null)) as MagicConfigResponse | null;

  if (!response.ok || !payload?.enabled || !payload.publishableKey) {
    throw new Error('Magic sign-in is not configured right now.');
  }

  return payload.publishableKey;
}

export async function signInWithMagicEmail(apiUrl: string, email: string): Promise<MagicLoginResponse> {
  const publishableKey = await getMagicPublishableKey(apiUrl);
  const { Magic } = await import('magic-sdk');
  const magic = new Magic(publishableKey);
  const didToken = await magic.auth.loginWithMagicLink({ email });

  const response = await fetch(`${apiUrl}/auth/magic/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ didToken }),
  });

  const payload = (await response.json().catch(() => null)) as MagicLoginResponse | { error?: string } | null;
  if (!response.ok || !payload || !('token' in payload) || typeof payload.token !== 'string') {
    throw new Error((payload && 'error' in payload && payload.error) || 'Magic sign-in failed.');
  }

  window.localStorage.setItem('tc_token', payload.token);
  return payload;
}
