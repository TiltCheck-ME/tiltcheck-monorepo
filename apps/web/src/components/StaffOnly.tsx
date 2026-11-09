// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-09
'use client';
import type { ReactNode } from 'react';
import { useIsStaff } from '@/hooks/useIsStaff';

/**
 * Renders children only for signed-in members with the "TiltCheck Team" Discord role.
 * Server render and first paint show nothing, so staff notes never ship visible to players.
 * Use for dev notes, internal jargon, roadmap and review status.
 */
export function StaffOnly({ children, label = 'Staff only' }: { children: ReactNode; label?: string }) {
  const isStaff = useIsStaff();
  if (!isStaff) return null;

  return (
    <div className="staff-only" data-staff-only>
      <span className="staff-only__label">{label}</span>
      {children}
    </div>
  );
}

export default StaffOnly;
