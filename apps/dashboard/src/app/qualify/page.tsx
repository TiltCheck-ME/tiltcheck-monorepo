/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function QualifyFirstPage() {
  return (
    <main className="min-h-screen bg-[#0E0E0F] pt-12 pb-20">
      <div className="container mx-auto px-6">
        <header className="mb-12">
          <Link href="/" className="text-[#00FFC6] text-xs font-bold tracking-widest hover:underline mb-4 inline-block">← RETURN TO HUB</Link>
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-4xl md:text-5xl font-black font-space text-white tracking-tight">
              QUALIFYFIRST
            </h1>
          </div>
          <p className="text-lg text-[#6B7280] max-w-2xl">
            This page describes the archived QualifyFirst concept for historical reference only. Survey routing is not part of the current MVP.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-[#1A1F24] p-8 rounded-xl border border-[#00FFC6]/10">
            <h2 className="text-xl font-black font-space text-white mb-2 tracking-tight">
              ARCHIVED MODULE
            </h2>
            <p className="text-sm text-[#9CA3AF]">
              QualifyFirst was a planned survey matching module. It is currently paused and not active in production.
            </p>
          </div>

            <div className="bg-[#1A1F24] p-8 rounded-xl border border-[#00FFC6]/10 text-center flex flex-col justify-center">
              <h2 className="text-xl font-black font-space text-white mb-2 tracking-tight">STATUS</h2>
              <div className="py-4">
                <div className="text-sm text-[#9CA3AF]">
                  Survey earnings, profiles, and withdrawals are not available. This feature may return in a later phase.
                </div>
              </div>
            </div>
        </div>

        <section className="bg-[#00C2FF]/5 border border-[#00C2FF]/20 p-8 rounded-xl">
          <h3 className="text-sm font-black font-space text-[#00C2FF] mb-4 tracking-[0.2em] uppercase">ARCHIVE NOTE</h3>
          <p className="text-[#B8C4CE] text-sm leading-relaxed font-medium">
            QualifyFirst was designed to use the TrustEngine for survey matching and payouts via JustTheTip. It has been removed from the current MVP scope and should not be considered an active dependency.
          </p>
        </section>
      </div>
    </main>
  );
}

// Archived page: interactive task list removed from MVP

