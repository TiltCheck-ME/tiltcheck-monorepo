// © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-05-09
"use client";

import React from "react";
import { defineFairnessDataSource } from "@tiltcheck/shared";
import type { FairnessToolkitSourceState } from "@tiltcheck/types";

interface DriftEvent {
  casino: string;
  game: string;
  drift: number;
  detectedMinsAgo: number;
}

const DRIFT_FEED_SCHEMA_VERSION = "rtp-drift.v1";

const DEMO_EVENTS: DriftEvent[] = [
  { casino: "Example Casino A", game: "Example Slot Alpha", drift: -3.8, detectedMinsAgo: 4 },
  { casino: "Example Casino B", game: "Example Slot Bravo", drift: -5.2, detectedMinsAgo: 17 },
  { casino: "Example Casino C", game: "Example Slot Charlie", drift: -2.1, detectedMinsAgo: 31 },
  { casino: "Example Casino D", game: "Example Slot Delta", drift: -4.7, detectedMinsAgo: 58 },
  { casino: "Example Casino E", game: "Example Slot Echo", drift: -6.3, detectedMinsAgo: 112 },
];

const FEED_STATE_LABELS: Record<FairnessToolkitSourceState, string> = {
  live: "API synced",
  degraded: "Feed degraded",
  unknown: "Schema unknown",
};

const FEED_STATE_COPY: Record<FairnessToolkitSourceState, string> = {
  live: "Events loaded from the stats feed with the expected shape. Still a signal, not a verdict.",
  degraded: "The stats feed is unavailable or thin. Demo events show the monitor shape without claiming live drift.",
  unknown: "The stats feed is not confirmed against the expected schema. Classification stays paused.",
};

function formatTimeAgo(minsAgo: number): string {
  if (minsAgo < 60) return `${minsAgo}m ago`;
  const hrs = Math.floor(minsAgo / 60);
  return `${hrs}h ago`;
}

function formatDrift(drift: number): string {
  return `${drift > 0 ? "+" : ""}${drift.toFixed(1)}%`;
}

function isDriftEvent(value: unknown): value is DriftEvent {
  if (!value || typeof value !== "object") {
    return false;
  }

  const event = value as Partial<DriftEvent>;

  return typeof event.casino === "string"
    && typeof event.game === "string"
    && typeof event.drift === "number"
    && Number.isFinite(event.drift)
    && typeof event.detectedMinsAgo === "number"
    && Number.isFinite(event.detectedMinsAgo);
}

export default function RtpDriftTicker() {
  const [events, setEvents] = React.useState<DriftEvent[]>(DEMO_EVENTS);
  const [feedState, setFeedState] = React.useState<FairnessToolkitSourceState>("unknown");

  React.useEffect(() => {
    let isActive = true;

    const sync = async () => {
      try {
        const api = process.env.NEXT_PUBLIC_API_URL || "/api";
        const response = await fetch(`${api}/stats/rtp-drift`);
        const data = (await response.json()) as {
          events?: unknown;
          schemaVersion?: string;
        };

        if (!isActive) return;

        if (!response.ok) {
          setEvents(DEMO_EVENTS);
          setFeedState("degraded");
          return;
        }

        if (data.schemaVersion !== DRIFT_FEED_SCHEMA_VERSION) {
          setEvents(DEMO_EVENTS);
          setFeedState("unknown");
          return;
        }

        const parsedEvents = Array.isArray(data.events) ? data.events.filter(isDriftEvent) : [];
        const source = defineFairnessDataSource({
          id: "rtp-drift-feed",
          label: "RTP drift stats feed",
          type: "operator-api",
          isAvailable: true,
          hasUsableSamples: parsedEvents.length > 0,
          schemaVersion: data.schemaVersion,
          expectedSchemaVersion: DRIFT_FEED_SCHEMA_VERSION,
          lastCheckedAt: Date.now(),
          maxSourceAgeMs: 5 * 60 * 1000,
        });

        if (source.state === "live") {
          setEvents(parsedEvents);
          setFeedState("live");
          return;
        }

        setEvents(DEMO_EVENTS);
        setFeedState(source.state);
      } catch {
        if (isActive) {
          setEvents(DEMO_EVENTS);
          setFeedState("degraded");
        }
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
    <section className="landing-section drift-section" aria-label="RTP drift monitor examples">
      <div className="landing-shell drift-shell">
        <div className="drift-header">
          <div>
            <span className="brand-eyebrow">Drift monitor</span>
            <h2 className="drift-title">Drift signals need sample math. No guarantee cosplay.</h2>
          </div>
          <div className="drift-status-card">
            <span className={`drift-status-card__badge drift-status-card__badge--${feedState}`}>
              {FEED_STATE_LABELS[feedState]}
            </span>
            <p className="drift-status-card__copy">
              {FEED_STATE_COPY[feedState]}
            </p>
          </div>
        </div>

        <div className="drift-summary-grid">
          <article className="drift-lead-card">
            <p className="drift-lead-card__eyebrow">{feedState === "live" ? "Largest active signal" : "Example signal"}</p>
            <h3 className="drift-lead-card__title">
              {leadEvent.casino} · {leadEvent.game}
            </h3>
            <p className="drift-lead-card__metric">{formatDrift(leadEvent.drift)} from baseline band</p>
            <p className="drift-lead-card__description">
              {feedState === "live" ? "Flagged" : "Demo window"} {formatTimeAgo(leadEvent.detectedMinsAgo)}.
              Treat this as a windowed signal, not proof of intent.
            </p>
          </article>

          <div className="drift-kpi-grid" aria-label="RTP drift summary metrics">
            <article className="drift-kpi-card">
              <p className="drift-kpi-card__value">{recentHits}</p>
              <p className="drift-kpi-card__label">{feedState === "live" ? "signals in current window" : "demo signals in window"}</p>
            </article>
            <article className="drift-kpi-card">
              <p className="drift-kpi-card__value">{averageDrift.toFixed(1)}%</p>
              <p className="drift-kpi-card__label">{feedState === "live" ? "average observed drift" : "average demo drift"}</p>
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
