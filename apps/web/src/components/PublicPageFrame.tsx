/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19 */
"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

const READABILITY_OPT_OUT_PREFIXES: string[] = [];

function isPublicReadablePath(pathname: string): boolean {
  return !READABILITY_OPT_OUT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default function PublicPageFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shouldApplyReadability = pathname ? isPublicReadablePath(pathname) : true;

  return (
    <div
      className={shouldApplyReadability ? "public-page-frame public-page-frame--readable" : "public-page-frame"}
      data-public-readability={shouldApplyReadability ? "on" : "off"}
    >
      {children}
    </div>
  );
}
