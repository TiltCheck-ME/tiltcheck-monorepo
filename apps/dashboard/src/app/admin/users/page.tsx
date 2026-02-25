/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  username: string;
  discord_id?: string;
  wallet?: string;
  trust_score?: number;
  joined?: string;
  role?: string;
}

const PLACEHOLDER: User[] = [
  { id: '1', username: 'degen_whale', discord_id: '1234567890', wallet: '7xKp...3mNq', trust_score: 94, joined: '2024-01-15', role: 'member' },
  { id: '2', username: 'slot_king99', discord_id: '9876543210', wallet: undefined, trust_score: 72, joined: '2024-03-22', role: 'member' },
  { id: '3', username: 'tiltcheck_mod', discord_id: '1111111111', wallet: 'Bz9a...7wLm', trust_score: 98, joined: '2023-11-01', role: 'mod' },
  { id: '4', username: 'anon_gambler', discord_id: undefined, wallet: 'Qr4f...9kPx', trust_score: 41, joined: '2024-06-10', role: 'member' },
  { id: '5', username: 'highroller_22', discord_id: '5556667777', wallet: 'Vc2t...1hJw', trust_score: 85, joined: '2024-02-08', role: 'vip' },
];

const roleColor: Record<string, string> = {
  mod: '#00FFC6', vip: '#FFC107', member: '#6B7280',
};

const trustColor = (score?: number) => {
  if (!score) return '#6B7280';
  if (score >= 80) return '#4CAF50';
  if (score >= 60) return '#FFC107';
  return '#ef4444';
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then((data: User[]) => setUsers(Array.isArray(data) && data.length ? data : PLACEHOLDER))
      .catch(() => setUsers(PLACEHOLDER))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => {
    const matchSearch = !search || u.username?.toLowerCase().includes(search.toLowerCase()) || u.discord_id?.includes(search);
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleCounts = ['mod', 'vip', 'member'].reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <main className="min-h-screen bg-[#0E0E0F] pt-12 pb-20">
      <div className="container mx-auto px-6 max-w-5xl">
        <header className="mb-12">
          <Link href="/" className="text-[#00FFC6] text-xs font-bold tracking-widest hover:underline mb-4 inline-block">← RETURN TO HUB</Link>
          <h1 className="text-4xl md:text-5xl font-black font-space text-white tracking-tight mb-2">USER MANAGEMENT</h1>
          <p className="text-[#6B7280]">Registered members, roles, and trust scores</p>
        </header>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          <div className="bg-[#1A1F24] rounded-xl border border-[#00FFC6]/10 p-4 text-center">
            <div className="text-2xl font-black font-space text-[#00FFC6]">{users.length}</div>
            <div className="text-xs text-[#6B7280] font-bold tracking-widest mt-1">TOTAL</div>
          </div>
          {(['mod', 'vip', 'member'] as const).map(r => (
            <div key={r} className="bg-[#1A1F24] rounded-xl border border-[#00FFC6]/10 p-4 text-center">
              <div className="text-2xl font-black font-space" style={{ color: roleColor[r] }}>{roleCounts[r] ?? 0}</div>
              <div className="text-xs font-bold tracking-widest mt-1" style={{ color: roleColor[r] }}>{r.toUpperCase()}S</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-[#1A1F24] rounded-xl border border-[#00FFC6]/10 p-4 mb-6 flex gap-3 flex-wrap items-center">
          <input type="text" placeholder="SEARCH USERNAME OR DISCORD ID..." value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-grow bg-[#0E0E0F] border border-[#00FFC6]/20 rounded px-4 py-2 text-white focus:outline-none focus:border-[#00FFC6] font-space text-sm" />
          {(['ALL', 'mod', 'vip', 'member'] as const).map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className="px-4 py-2 rounded text-xs font-bold tracking-widest transition-all"
              style={{ backgroundColor: roleFilter === r ? (r === 'ALL' ? '#00FFC6' : roleColor[r]) : '#0E0E0F', color: roleFilter === r ? '#0E0E0F' : '#6B7280' }}>
              {r.toUpperCase()}
            </button>
          ))}
        </div>

        {/* User list */}
        {loading ? (
          <div className="text-center text-[#6B7280] py-20 font-bold tracking-widest">LOADING...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-[#6B7280] py-20 font-bold">NO USERS MATCH</div>
        ) : (
          <div className="space-y-3">
            {filtered.map(user => (
              <div key={user.id} className="bg-[#1A1F24] rounded-xl border border-[#00FFC6]/5 p-5 flex items-center justify-between hover:border-[#00FFC6]/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#0E0E0F] border border-[#00FFC6]/20 flex items-center justify-center text-[#00FFC6] font-black font-space">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-black font-space">{user.username}</span>
                      {user.role && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ color: roleColor[user.role], backgroundColor: `${roleColor[user.role]}15` }}>
                          {user.role.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#6B7280] mt-0.5 flex gap-3">
                      {user.discord_id && <span>Discord: {user.discord_id}</span>}
                      {user.wallet && <span>Wallet: {user.wallet}</span>}
                      {user.joined && <span>Joined: {user.joined}</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {user.trust_score !== undefined && (
                    <div className="text-xl font-black font-space" style={{ color: trustColor(user.trust_score) }}>{user.trust_score}</div>
                  )}
                  <div className="text-xs text-[#6B7280] font-bold tracking-widest">TRUST</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-[#1A1F24] rounded-xl border border-[#FFC107]/20 p-4 mt-8 flex gap-3 items-start text-sm">
          <span>⚡</span>
          <span className="text-[#FFC107]">Live user data requires <code className="bg-[#0E0E0F] px-1 rounded">SUPABASE_URL</code> — showing placeholder data until connected.</span>
        </div>
      </div>
    </main>
  );
}
