/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-23 */
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: ["400", "500", "700", "800"],
});
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
import FunnelTracker from "@/components/FunnelTracker";
import PublicPageFrame from "@/components/PublicPageFrame";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} degen-background antialiased`}
      >
        <RootProvider>
          <AriaSlangProvider />
          <FunnelTracker />
          <a href="#main-content" className="nav-skip-link">Skip to main content</a>
          <Header />
          <main id="main-content" className="nav-main-content">
            <PublicPageFrame>{children}</PublicPageFrame>
          </main>
          <div className="nav-main-content"><Footer /></div>
        </RootProvider>
      </body>
    </html>
  );
}
