// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-06
'use client';
import { useEffect, useState } from 'react';
import { fetchAuthSession, type AuthSession } from '@/lib/auth-session';

export type AuthUser = AuthSession;

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const applySession = () => {
      fetchAuthSession()
        .then((data) => {
          if (!alive) return;
          if (data?.userId) setUser(data);
          else setUser(null);
        })
        .catch(() => {})
        .finally(() => {
          if (alive) setLoading(false);
        });
    };

    applySession();

    const onExtensionSessionSync = () => {
      fetchAuthSession()
        .then((data) => {
          if (!alive) return;
          if (data?.userId) setUser(data);
          else setUser(null);
        })
        .catch(() => {});
    };

    window.addEventListener('tiltcheck-ext-session-sync', onExtensionSessionSync);
    return () => {
      alive = false;
      window.removeEventListener('tiltcheck-ext-session-sync', onExtensionSessionSync);
    };
  }, []);

  return { user, loading };
}
