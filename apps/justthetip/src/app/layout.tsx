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
