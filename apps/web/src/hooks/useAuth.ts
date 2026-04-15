// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11
'use client';
import { useEffect, useState } from 'react';
import { fetchAuthSession, type AuthSession } from '@/lib/auth-session';

export type AuthUser = AuthSession;

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuthSession()
      .then((data) => {
        if (data?.userId) setUser(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
