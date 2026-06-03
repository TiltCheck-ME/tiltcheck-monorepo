/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-03 */
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { RootProvider } from "@/lib/providers";
import AriaSlangProvider from "@/components/AriaSlangProvider";
import FunnelTracker from "@/components/FunnelTracker";
import SiteChrome from "@/components/SiteChrome";

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

export const metadata: Metadata = {
  title: "TiltCheck | Tilt guardrails for real sessions",
  description:
    "Spot tilt, sus session dynamics, and sketch nudges before you do something stupid. Math verifiers exist; TiltCheck handles the mental game.",
  metadataBase: new URL("https://tiltcheck.me"),
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
    shortcut: "/icon.png",
  },
  openGraph: {
    title: "TiltCheck | Tilt guardrails for real sessions",
    description:
      "Catch tilt and platform pressure before the session cooks you. Verifiers do the math; we watch your decisions.",
    url: "https://tiltcheck.me",
    siteName: "TiltCheck",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TiltCheck | Tilt guardrails for real sessions",
    description:
      "Catch tilt and platform pressure before the session cooks you. Verifiers do the math; we watch your decisions.",
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
        className={`${inter.variable} ${jetbrainsMono.variable} degen-background antialiased`}
      >
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
