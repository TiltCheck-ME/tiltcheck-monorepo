/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-06-01 */
import type { ReactNode } from 'react';

type ToolPageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  centered?: boolean;
};

/** Compact header for standalone tool pages — replaces neon hero blocks. */
export default function ToolPageHeader({
  eyebrow,
  title,
  description,
  actions,
  centered = false,
}: ToolPageHeaderProps) {
  return (
    <header className={`border-b border-[#283347] px-4 py-10 md:py-12 ${centered ? 'text-center' : ''}`}>
      <div className="mx-auto max-w-4xl">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#17c3b2] mb-2">{eyebrow}</p>
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">{title}</h1>
        {description ? (
          <div
            className={`mt-3 text-sm text-gray-400 leading-relaxed max-w-2xl ${centered ? 'mx-auto' : ''}`}
          >
            {description}
          </div>
        ) : null}
        {actions ? (
          <div className={`mt-5 flex flex-wrap gap-3 ${centered ? 'justify-center' : ''}`}>{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
