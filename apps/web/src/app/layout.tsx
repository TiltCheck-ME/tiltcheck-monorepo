/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-10-29 */
import type { Metadata } from "next";
import { Big_Shoulders, IBM_Plex_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { RootProvider } from "@/lib/providers";
import AriaSlangProvider from "@/components/AriaSlangProvider";
import FunnelTracker from "@/components/FunnelTracker";
import SiteChrome from "@/components/SiteChrome";
import JsonLd from "@/components/JsonLd";
import { organizationJsonLd } from "@/lib/structured-data";
import { SITE_ONE_LINER, SITE_SEO_TITLE } from "@/lib/site-copy";
import { SITE_URL } from "@/lib/site-links";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-plex",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const display = Big_Shoulders({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: ["400", "500", "700", "800"],
});

export const metadata: Metadata = {
  title: SITE_SEO_TITLE,
  description: SITE_ONE_LINER,
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
    shortcut: "/icon.png",
  },
  openGraph: {
    title: SITE_SEO_TITLE,
    description: SITE_ONE_LINER,
    url: SITE_URL,
    siteName: "TiltCheck",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_SEO_TITLE,
    description: SITE_ONE_LINER,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${plex.variable} ${display.variable} ${jetbrainsMono.variable} degen-background antialiased`}
      >
        <JsonLd data={organizationJsonLd()} />
        <RootProvider>
          <AriaSlangProvider />
          <FunnelTracker />
          <a href="#main-content" className="nav-skip-link">
            Skip to main content
          </a>
          <SiteChrome>{children}</SiteChrome>
        </RootProvider>
      </body>
    </html>
  );
}
