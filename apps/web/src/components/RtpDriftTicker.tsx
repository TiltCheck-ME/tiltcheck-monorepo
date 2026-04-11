// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-11
'use client';

/**
 * RtpDriftTicker
 * Live feed of recent RTP drift catches.
 * Data: GET /stats/rtp-drift — falls back to sample events.
 * Scrolls horizontally with a CSS animation.
 */

import React from 'react';

interface DriftEvent {
  casino: string;
  game: string;
  drift: number;
  detectedMinsAgo: number;
}

function formatTimeAgo(minsAgo: number): string {
  if (minsAgo < 60) return `${minsAgo}m ago`;
  const hrs = Math.floor(minsAgo / 60);
  return `${hrs}h ago`;
}

export default function RtpDriftTicker() {
  const [events, setEvents] = React.useState<DriftEvent[]>([]);

  React.useEffect(() => {
    const api = process.env.NEXT_PUBLIC_API_URL || '/api';
    fetch(`${api}/stats/rtp-drift`)
      .then((r) => r.json())
      .then((data: { events: DriftEvent[] }) => {
        if (Array.isArray(data.events) && data.events.length > 0) {
          setEvents(data.events);
        }
      })
      .catch(() => null);
  }, []);

  if (events.length === 0) return null;

  const doubled = [...events, ...events];

  return (
    <section
      className="w-full overflow-hidden border-y border-[#283347] bg-black/60 py-3"
      aria-label="Live RTP drift catches"
    >
      <div className="flex items-center gap-4 px-4 mb-2">
        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-red-500 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" aria-hidden="true" />
          LIVE DRIFT FEED
        </span>
      </div>
      <div className="ticker-track" aria-hidden="true">
        <ul className="ticker-list" role="list">
          {doubled.map((ev, i) => (
            <li key={i} className="ticker-item">
              <span className="ticker-casino">{ev.casino}</span>
              <span className="ticker-sep">·</span>
              <span className="ticker-game">{ev.game}</span>
              <span className="ticker-drift text-red-400">{ev.drift > 0 ? '+' : ''}{ev.drift}% RTP drift</span>
              <span className="ticker-time text-gray-500">{formatTimeAgo(ev.detectedMinsAgo)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
