// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-09
'use client';
import { useEffect, useState } from 'react';
import { fetchAuthSession } from '@/lib/auth-session';

/**
 * Staff check shared by every <StaffOnly> on a page: one /auth/me call per page load.
 * Fails closed. Logged out, API down, or anything but an explicit isStaff === true is "not staff".
 */
let staffPromise: Promise<boolean> | null = null;

function loadIsStaff(): Promise<boolean> {
  if (!staffPromise) {
    staffPromise = fetchAuthSession()
      .then((session) => session?.isStaff === true)
      .catch(() => false);
  }
  return staffPromise;
}

if (typeof window !== 'undefined') {
  window.addEventListener('tiltcheck-ext-session-sync', () => {
    staffPromise = null;
  });
}

export function useIsStaff(): boolean {
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    let alive = true;
    loadIsStaff().then((value) => {
      if (alive) setIsStaff(value);
    });
    return () => {
      alive = false;
    };
  }, []);

  return isStaff;
}
