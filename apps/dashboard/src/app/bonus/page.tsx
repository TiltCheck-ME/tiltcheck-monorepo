'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CollectClockPage() {
  return (
    <main className="min-h-screen bg-[#0E0E0F] pt-12 pb-20">
      <div className="container mx-auto px-6">
        <header className="mb-12">
          <Link href="/" className="text-[#00FFC6] text-xs font-bold tracking-widest hover:underline mb-4 inline-block">← RETURN TO HUB</Link>
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-4xl md:text-5xl font-black font-space text-white tracking-tight">
              COLLECTCLOCK
            </h1>
          </div>
          <p className="text-lg text-[#6B7280] max-w-2xl">
            Bonus cycle tracking & nerf detection. Real-time monitoring for the next drop.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <CasinoTimerCard 
            name="STAKE.COM" 
            bonusType="Daily Reload"
            timeLeft="04:20:15"
            status="WAITING"
            icon="STAKE"
          />
          <CasinoTimerCard 
            name="ROOBET" 
            bonusType="Daily Rakeback"
            timeLeft="READY!"
            status="READY"
            icon="ROOBET"
          />
          <CasinoTimerCard 
            name="ROLLBIT" 
            bonusType="Hourly Bonus"
            timeLeft="00:15:30"
            status="WAITING"
            icon="ROLLBIT"
          />
        </div>

        <section className="bg-[#1A1F24]/50 border border-[#00FFC6]/10 p-8 rounded-xl">
          <h2 className="text-xl font-black font-space text-white mb-6 tracking-tight">LINKED ACCOUNTS</h2>
          <div className="space-y-4">
            <AccountRow name="STAKE" username="USER123" status="CONNECTED" />
            <AccountRow name="ROOBET" username="USER123" status="CONNECTED" />
            <button className="w-full py-4 border-2 border-dashed border-[#00FFC6]/10 rounded-lg text-[#6B7280] hover:border-[#00FFC6]/30 hover:text-[#00FFC6] transition-all font-bold text-xs tracking-widest">
              + LINK NEW CASINO ACCOUNT
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function PredictionStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-xl font-bold font-space text-[#00FFC6]">{value}</div>
      <div className="text-[9px] tracking-widest text-[#6B7280] font-bold uppercase">{label}</div>
    </div>
  );
}

function CasinoTimerCard({ name, bonusType, timeLeft, status, icon }: { name: string; bonusType: string; timeLeft: string; status: string; icon: string }) {
  const isReady = status === 'READY';
  return (
    <div className={`p-8 rounded-xl border transition-all ${isReady ? 'bg-[#00FFC6]/5 border-[#00FFC6] shadow-[0_0_30px_rgba(0,255,198,0.1)]' : 'bg-[#1A1F24] border-[#00FFC6]/10'}`}>
      <div className="text-xs font-bold tracking-widest text-[#00FFC6] mb-6">{icon}</div>
      <h3 className="text-lg font-black font-space text-white mb-1 tracking-tight">{name}</h3>
      <p className="text-[10px] tracking-widest text-[#6B7280] font-bold uppercase mb-6">{bonusType}</p>
      <div className={`text-3xl font-black font-space ${isReady ? 'text-[#00FFC6] animate-pulse' : 'text-white'}`}>
        {timeLeft}
      </div>
      <button 
        disabled={!isReady}
        className={`mt-8 w-full py-3 rounded font-bold text-xs tracking-widest transition-all ${
          isReady 
            ? 'bg-[#00FFC6] text-[#0E0E0F] hover:opacity-90' 
            : 'bg-[#0E0E0F] text-[#6B7280] cursor-not-allowed border border-[#00FFC6]/10'
        }`}
      >
        {isReady ? 'CLAIM NOW' : 'WAIT'}
      </button>
    </div>
  );
}

function AccountRow({ name, username, status }: { name: string; username: string; status: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#0E0E0F]/50 rounded border border-[#00FFC6]/10">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-[#1A1F24] border border-[#00FFC6]/20 rounded flex items-center justify-center font-black text-[#00FFC6]">{name[0]}</div>
        <div>
          <h4 className="font-bold text-white text-sm">{name}</h4>
          <p className="text-[10px] tracking-wider text-[#6B7280] font-bold">{username}</p>
        </div>
      </div>
      <span className="px-2 py-1 bg-[#00FFC6]/10 text-[#00FFC6] text-[9px] font-black rounded border border-[#00FFC6]/20 tracking-widest">
        {status}
      </span>
    </div>
  );
}

