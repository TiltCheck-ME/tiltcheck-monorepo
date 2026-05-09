/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09 */
'use client';

export default function GlobalError() {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0c10] text-white">
        <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.35em] text-[#ef4444]">
            Runtime busted
          </p>
          <h1 className="text-4xl font-black uppercase tracking-tight md:text-6xl">
            The page rinsed itself.
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-gray-400">
            Something threw before TiltCheck could render the surface. Refresh once; if it still looks cooked, head home.
          </p>
          <a
            href="/"
            className="mt-8 inline-flex items-center justify-center rounded-xl border border-[#17c3b2]/40 bg-[#17c3b2] px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-black"
          >
            Return home
          </a>
          <p className="mt-10 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
            Made for Degens. By Degens.
          </p>
        </main>
      </body>
    </html>
  );
}
