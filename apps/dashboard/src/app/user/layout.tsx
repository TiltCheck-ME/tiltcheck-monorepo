/**
 * User Dashboard Layout
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tilt Dashboard | TiltCheck',
  description: 'View your tilt stats and gaming patterns',
};

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
