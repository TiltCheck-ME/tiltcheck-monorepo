"use client";

import React from 'react';
import Link from 'next/link';

export default function TouchGrassPage() {
  return (
    <div className="min-h-screen pt-24 pb-12 px-4 flex items-center justify-center bg-black relative overflow-hidden">
      {/* Sparkle background effect */}
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-ping"></div>
        <div className="absolute top-3/4 left-2/3 w-1 h-1 bg-white rounded-full animate-ping delay-700"></div>
        <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white rounded-full animate-ping delay-1000"></div>
        <div className="absolute top-1/3 left-4/5 w-1 h-1 bg-white rounded-full animate-ping delay-300"></div>
      </div>

      <div className="max-w-2xl w-full z-10 text-center flex flex-col gap-8 animate-in fade-in zoom-in duration-700">
        <header className="border-b border-[#283347] pb-6">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-[#17c3b2]">
            Go touch some grass.
          </h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest text-red-500">
            seriously. step away for a sec.
          </p>
        </header>

        <section className="terminal-box border-[#283347] p-8 bg-black/60 text-left">
          <p className="font-mono text-sm text-gray-300 mb-6 leading-relaxed">
            The <span className="text-[#17c3b2] font-bold">TiltCheck system</span> has flagged elevated dopamine levels
            and what we professionally call &quot;tunnel vision.&quot; Your brain thinks it&apos;s sharper than it is right now.
            That&apos;s not a judgment &mdash; it&apos;s just what happens after a long session.
          </p>

          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4 border-b border-[#283347] pb-2">
            Things that will actually help:
          </h2>
          
          <ul className="space-y-3 font-mono text-sm text-gray-400">
            <li className="flex items-center gap-3">
              <span className="text-[#17c3b2]">1.</span> Stand up. Walk somewhere. Anywhere.
            </li>
            <li className="flex items-center gap-3">
              <span className="text-[#17c3b2]">2.</span> Get some water. Your brain runs on water, not vibes.
            </li>
            <li className="flex items-center gap-3">
              <span className="text-[#17c3b2]">3.</span> Talk to a person. A real one. They exist.
            </li>
            <li className="flex items-center gap-3">
              <span className="text-[#17c3b2]">4.</span> Go outside. Touch a plant. Breathe the outdoor air.
            </li>
          </ul>

          <blockquote className="mt-8 pt-6 border-t border-[#283347] italic text-gray-500 text-xs text-center">
            &quot;The house loves a tired mind. We don&apos;t. Come back when your math is mathing again.&quot;
          </blockquote>
        </section>

        <div className="flex flex-col items-center gap-6">
           <div className="w-full h-48 rounded border border-[#283347] bg-black/40 overflow-hidden relative group">
              <div className="absolute inset-0 flex items-center justify-center text-[#17c3b2]/20 font-black text-4xl uppercase select-none group-hover:text-[#17c3b2]/40 transition-colors">
                LITERAL_GRASS.JPG
              </div>
              {/* Optional: Add a real grass image via generate_image later if needed */}
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1533460004989-cef01064af7c?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-40"></div>
           </div>

          <Link 
            href="/" 
            className="px-8 py-4 bg-[#17c3b2]/10 text-[#17c3b2] border border-[#17c3b2]/30 uppercase text-xs font-black tracking-widest hover:bg-[#17c3b2]/20 transition-all hover:scale-105"
          >
            Okay. Take me back.
          </Link>
        </div>
      </div>
    </div>
  );
}
