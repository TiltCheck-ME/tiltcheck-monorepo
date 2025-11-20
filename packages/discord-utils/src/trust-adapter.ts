/**
 * Trust Adapter Utilities for Discord Rendering
 *
 * Subscribes to trust events and formats human-readable messages with severity badges.
 * Intended to be imported by Discord bot code or external adapters.
 */

import { eventRouter } from '@tiltcheck/event-router';
import type { TrustCasinoUpdateEvent, TrustDomainUpdateEvent, TiltCheckEvent } from '@tiltcheck/types';

type TrustEventPayload = TrustCasinoUpdateEvent | TrustDomainUpdateEvent;

interface AdapterOptions {
  onFormatted?: (formatted: string, raw: TrustEventPayload) => void;
  severityEmojis?: string[]; // index 0 unused, 1-5 severity
  domainPrefix?: string; // e.g. '[DOMAIN]' customization
  casinoPrefix?: string; // e.g. '[CASINO]' customization
}

const DEFAULT_SEVERITY = ['Ø', '🟢', '🟡', '🟠', '🔴', '🛑'];

export function startTrustAdapter(options: AdapterOptions = {}) {
  const severityIcons = options.severityEmojis || DEFAULT_SEVERITY;
  const domainPrefix = options.domainPrefix || 'DOMAIN';
  const casinoPrefix = options.casinoPrefix || 'CASINO';

  // Casino trust events
  eventRouter.subscribe('trust.casino.updated', (evt: TiltCheckEvent<TrustCasinoUpdateEvent>) => {
    const payload = evt.data;
    const msg = formatCasinoTrust(payload, severityIcons, casinoPrefix);
    options.onFormatted?.(msg, payload);
  }, 'discord-bot');

  // Domain trust events
  eventRouter.subscribe('trust.domain.updated', (evt: TiltCheckEvent<TrustDomainUpdateEvent>) => {
    const payload = evt.data;
    const msg = formatDomainTrust(payload, severityIcons, domainPrefix);
    options.onFormatted?.(msg, payload);
  }, 'discord-bot');
}

function formatCasinoTrust(event: TrustCasinoUpdateEvent, icons: string[], prefix: string): string {
  const sev = event.severity && event.severity >= 1 && event.severity <= 5 ? icons[event.severity] : icons[0];
  const deltaStr = event.delta ? (event.delta > 0 ? `+${event.delta}` : `${event.delta}`) : '0';
  const scoreStr = event.newScore !== undefined ? `${event.newScore}` : '?';
  return `${sev} ${prefix} ${event.casinoName} trust ${deltaStr} → ${scoreStr} | ${event.reason}`;
}

function formatDomainTrust(event: TrustDomainUpdateEvent, icons: string[], prefix: string): string {
  const sev = event.severity && event.severity >= 1 && event.severity <= 5 ? icons[event.severity] : icons[0];
  const deltaStr = event.delta ? (event.delta > 0 ? `+${event.delta}` : `${event.delta}`) : '0';
  const scoreStr = event.newScore !== undefined ? `${event.newScore}` : '?';
  return `${sev} ${prefix} ${event.domain} (${event.category}) ${deltaStr} → ${scoreStr} | ${event.reason}`;
}

// Example convenience formatter for embedding
export function buildEmbed(event: TrustEventPayload) {
  const base = 'casinoName' in event ? event.casinoName : event.domain;
  const category = 'category' in event ? event.category : 'casino';
  return {
    title: `Trust Update: ${base}`,
    description: `${event.reason}`,
    fields: [
      { name: 'Delta', value: String(event.delta ?? '0'), inline: true },
      { name: 'New Score', value: String(event.newScore ?? 'n/a'), inline: true },
      { name: 'Severity', value: String(event.severity ?? 'n/a'), inline: true },
      { name: 'Category', value: category, inline: true },
    ],
    timestamp: new Date().toISOString(),
  };
}
