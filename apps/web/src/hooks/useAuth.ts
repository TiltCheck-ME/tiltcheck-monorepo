// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11
'use client';
import { useEffect, useState } from 'react';

export type AuthUser = {
  userId: string;
  email?: string | null;
  discordId?: string | null;
  discordUsername?: string | null;
  walletAddress: string | null;
  roles: string[];
  isAdmin: boolean;
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('tc_token') : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    fetch(`${apiUrl}/auth/me`, { credentials: 'include', headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AuthUser | null) => {
        if (data?.userId) setUser(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
