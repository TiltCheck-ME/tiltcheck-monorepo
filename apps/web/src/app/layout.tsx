import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { RootProvider } from "@/lib/providers";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "700"],
});


export const metadata: Metadata = {
  title: "TiltCheck | The Degen Audit Layer",
  description: "The house has an edge. Now you do too.",
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
      <head>
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@700,500,400&display=swap" rel="stylesheet" />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} degen-background antialiased`}
      >
        <RootProvider>
          <AriaSlangProvider />
          <Header />
          <main>{children}</main>
          <Footer />
        </RootProvider>
      </body>
    </html>
  );
}
