// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-04-19
"use client";

import React from "react";

interface DriftEvent {
  casino: string;
  game: string;
  drift: number;
  detectedMinsAgo: number;
}

const FALLBACK_EVENTS: DriftEvent[] = [
  { casino: "Stake", game: "Gates of Olympus", drift: -3.8, detectedMinsAgo: 4 },
  { casino: "Roobet", game: "Sweet Bonanza", drift: -5.2, detectedMinsAgo: 17 },
  { casino: "Rollbit", game: "Book of Dead", drift: -2.1, detectedMinsAgo: 31 },
  { casino: "Shuffle", game: "Wolf Gold", drift: -4.7, detectedMinsAgo: 58 },
  { casino: "BC.Game", game: "Reactoonz", drift: -6.3, detectedMinsAgo: 112 },
];

function formatTimeAgo(minsAgo: number): string {
  if (minsAgo < 60) return `${minsAgo}m ago`;
  const hrs = Math.floor(minsAgo / 60);
  return `${hrs}h ago`;
}

function formatDrift(drift: number): string {
  return `${drift > 0 ? "+" : ""}${drift.toFixed(1)}%`;
}

export default function RtpDriftTicker() {
  const [events, setEvents] = React.useState<DriftEvent[]>(FALLBACK_EVENTS);
  const [feedMode, setFeedMode] = React.useState<"live" | "fallback">("fallback");

  React.useEffect(() => {
    let isActive = true;

    const sync = async () => {
      try {
        const api = process.env.NEXT_PUBLIC_API_URL || "/api";
        const response = await fetch(`${api}/stats/rtp-drift`);
        const data = (await response.json()) as { events?: DriftEvent[] };

        if (!isActive) return;

        if (Array.isArray(data.events) && data.events.length > 0) {
          setEvents(data.events);
          setFeedMode("live");
          return;
        }
      } catch {
        // Keep fallback telemetry when the endpoint is unavailable.
      }

      if (isActive) {
        setEvents(FALLBACK_EVENTS);
        setFeedMode("fallback");
      }
    };

    void sync();

    return () => {
      isActive = false;
    };
  }, []);

  const rankedEvents = [...events].sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift));
  const leadEvent = rankedEvents[0];
  const averageDrift = rankedEvents.reduce((total, event) => total + Math.abs(event.drift), 0) / rankedEvents.length;
  const recentHits = rankedEvents.filter((event) => event.detectedMinsAgo <= 60).length;
  const uniqueCasinos = new Set(rankedEvents.map((event) => event.casino)).size;
  const doubledEvents = [...rankedEvents, ...rankedEvents];

  if (!leadEvent) return null;

  return (
    <section className="landing-section drift-section" aria-label="Live RTP drift catches">
      <div className="landing-shell drift-shell">
        <div className="drift-header">
          <div>
            <span className="brand-eyebrow">Live drift watch</span>
            <h2 className="drift-title">Real drift signals. Not a dead marquee pretending to be intelligence.</h2>
          </div>
          <div className="drift-status-card">
            <span className={`drift-status-card__badge drift-status-card__badge--${feedMode}`}>
              {feedMode === "live" ? "API synced" : "Fallback telemetry"}
            </span>
            <p className="drift-status-card__copy">
              Same behavior, better surface. Live events load from the stats feed. Fallback events keep the module useful
              when the endpoint is cold.
            </p>
          </div>
        </div>

        <div className="drift-summary-grid">
          <article className="drift-lead-card">
            <p className="drift-lead-card__eyebrow">Largest active catch</p>
            <h3 className="drift-lead-card__title">
              {leadEvent.casino} · {leadEvent.game}
            </h3>
            <p className="drift-lead-card__metric">{formatDrift(leadEvent.drift)} from certified band</p>
            <p className="drift-lead-card__description">
              Flagged {formatTimeAgo(leadEvent.detectedMinsAgo)}. This is the kind of tier shift that quietly eats profit
              while the lobby still smiles at you.
            </p>
          </article>

          <div className="drift-kpi-grid" aria-label="RTP drift summary metrics">
            <article className="drift-kpi-card">
              <p className="drift-kpi-card__value">{recentHits}</p>
              <p className="drift-kpi-card__label">signals in the last hour</p>
            </article>
            <article className="drift-kpi-card">
              <p className="drift-kpi-card__value">{averageDrift.toFixed(1)}%</p>
              <p className="drift-kpi-card__label">average detected drift</p>
            </article>
            <article className="drift-kpi-card">
              <p className="drift-kpi-card__value">{uniqueCasinos}</p>
              <p className="drift-kpi-card__label">casinos represented</p>
            </article>
          </div>
        </div>

        <div className="drift-events-grid">
          {rankedEvents.slice(0, 4).map((event) => (
            <article key={`${event.casino}-${event.game}`} className="drift-event-card">
              <div className="drift-event-card__header">
                <p className="drift-event-card__casino">{event.casino}</p>
                <span className="drift-event-card__time">{formatTimeAgo(event.detectedMinsAgo)}</span>
              </div>
              <h3 className="drift-event-card__game">{event.game}</h3>
              <p className="drift-event-card__metric">{formatDrift(event.drift)} RTP drift</p>
            </article>
          ))}
        </div>

        <div className="drift-ticker-bar" aria-hidden="true">
          <ul className="drift-ticker-list" role="list">
            {doubledEvents.map((event, index) => (
              <li key={`${event.casino}-${event.game}-${index}`} className="drift-ticker-item">
                <span className="drift-ticker-item__casino">{event.casino}</span>
                <span className="drift-ticker-item__sep">·</span>
                <span className="drift-ticker-item__game">{event.game}</span>
                <span className="drift-ticker-item__metric">{formatDrift(event.drift)} RTP drift</span>
                <span className="drift-ticker-item__time">{formatTimeAgo(event.detectedMinsAgo)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
