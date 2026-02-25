/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JustTheTip - Crypto Tipping',
  description: 'Send crypto tips to Discord users with JustTheTip',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
