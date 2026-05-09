/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 */

import type { ReactNode } from "react";

export default function PublicPageFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="public-page-frame public-page-frame--readable"
      data-public-readability="on"
    >
      {children}
    </div>
  );
}
