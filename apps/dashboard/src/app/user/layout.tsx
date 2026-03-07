/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * User Dashboard Layout
 */

import React from 'react';
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
