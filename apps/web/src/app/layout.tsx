/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-07 */
import type { Metadata } from "next";
import "./globals.css";
// import "@rainbow-me/rainbowkit/styles.css";
import { RootProvider } from "@/lib/providers";


export const metadata: Metadata = {
  title: "TiltCheck | The Degen Audit Layer",
  description: "The house has an edge. Now you do too. TiltCheck audits casinos, tracks your sessions, and tells you when to cash out.",
  metadataBase: new URL("https://tiltcheck.me"),
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
    shortcut: "/icon.png",
  },
  openGraph: {
    title: "TiltCheck | The Degen Audit Layer",
    description: "The house has an edge. Now you do too.",
    url: "https://tiltcheck.me",
    siteName: "TiltCheck",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TiltCheck | The Degen Audit Layer",
    description: "The house has an edge. Now you do too.",
  },
};

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AriaSlangProvider from "@/components/AriaSlangProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="degen-background antialiased"
      >
        <RootProvider>
          <AriaSlangProvider />
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <Header />
          <div id="main-content" className="nav-main-content">{children}</div>
          <div className="nav-main-content"><Footer /></div>
        </RootProvider>
      </body>
    </html>
  );
}
