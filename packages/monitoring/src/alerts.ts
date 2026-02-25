/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 *
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Alert Rules and Dispatch
 *
 * Defines typed alert rules with configurable thresholds, cooldown periods,
 * and notification channels. Provides a `triggerAlert` dispatcher that
 * enforces cooldowns, routes to the correct channel, and logs every trigger.
 *
 * @example
 * ```typescript
 * import { triggerAlert, ALERT_RULES } from '@tiltcheck/monitoring';
 *
 * await triggerAlert(ALERT_RULES.HIGH_ERROR_RATE, {
 *   errorRate: 0.42,
 *   service: 'discord-bot',
 * });
 * ```
 */

import { sendToLogflare } from './logflare.js';

// ============================================================================
// Types
// ============================================================================

/** Supported notification channels for alert dispatch. */
export type NotificationChannel = 'discord' | 'log' | 'webhook';

/**
 * An alert rule definition.
 *
 * @property id                - Unique machine-readable identifier.
 * @property name              - Human-readable display name.
 * @property threshold         - Numeric trigger threshold (semantics are rule-specific).
 * @property cooldownMs        - Minimum milliseconds between repeated triggers for the same rule.
 * @property notificationChannel - Where to send the alert notification.
 */
export interface AlertRule {
  id: string;
  name: string;
  threshold: number;
  cooldownMs: number;
  notificationChannel: NotificationChannel;
}

/** Payload emitted for every alert trigger (logged and forwarded to channels). */
export interface AlertTriggerPayload {
  ruleId: string;
  ruleName: string;
  timestamp: string;
  context: Record<string, unknown>;
}

// ============================================================================
// Built-in rule presets
// ============================================================================

/**
 * Pre-built alert rule presets.
 *
 * These can be used directly or overridden by spreading with custom values:
 * ```ts
 * const myRule = { ...ALERT_RULES.HIGH_ERROR_RATE, cooldownMs: 60_000 };
 * ```
 */
export const ALERT_RULES = {
  /**
   * Fires when the error rate (0–1 fraction) exceeds 0.05 (5 %).
   * Routed to Discord. Cooldown: 5 minutes.
   */
  HIGH_ERROR_RATE: {
    id: 'HIGH_ERROR_RATE',
    name: 'High Error Rate',
    threshold: 0.05,
    cooldownMs: 5 * 60 * 1000,
    notificationChannel: 'discord',
  } satisfies AlertRule,

  /**
   * Fires when a tracked wallet or treasury balance reaches zero.
   * Routed to Discord. Cooldown: 10 minutes.
   */
  ZERO_BALANCE: {
    id: 'ZERO_BALANCE',
    name: 'Zero Balance',
    threshold: 0,
    cooldownMs: 10 * 60 * 1000,
    notificationChannel: 'discord',
  } satisfies AlertRule,

  /**
   * Fires when a token/asset price deviates more than 10 % from its reference.
   * Routed to a webhook endpoint. Cooldown: 2 minutes.
   */
  PRICE_DEVIATION: {
    id: 'PRICE_DEVIATION',
    name: 'Price Deviation',
    threshold: 0.1,
    cooldownMs: 2 * 60 * 1000,
    notificationChannel: 'webhook',
  } satisfies AlertRule,
} as const satisfies Record<string, AlertRule>;

// ============================================================================
// Cooldown state (module-level, in-process)
// ============================================================================

/** Tracks the last trigger timestamp (ms since epoch) per rule id. */
const lastTriggerAt = new Map<string, number>();

// ============================================================================
// Channel dispatchers
// ============================================================================

async function dispatchToLog(payload: AlertTriggerPayload): Promise<void> {
  console.warn(
    `[alert] ${payload.timestamp} | ${payload.ruleName} (${payload.ruleId})`,
    payload.context,
  );
}

async function dispatchToDiscord(payload: AlertTriggerPayload): Promise<void> {
  const webhookUrl = process.env.DISCORD_ALERT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn(
      '[alert] DISCORD_ALERT_WEBHOOK_URL not set – falling back to log channel.',
    );
    await dispatchToLog(payload);
    return;
  }

  const embed = {
    username: 'TiltCheck Alerts',
    embeds: [
      {
        title: `🚨 ${payload.ruleName}`,
        color: 0xff4444,
        timestamp: payload.timestamp,
        fields: Object.entries(payload.context).map(([name, value]) => ({
          name,
          value: String(value),
          inline: true,
        })),
        footer: { text: `Rule: ${payload.ruleId}` },
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed),
    });
    if (!res.ok) {
      console.error(
        `[alert] Discord webhook responded with HTTP ${res.status} for rule ${payload.ruleId}`,
      );
    }
  } catch (err) {
    console.error('[alert] Failed to POST to Discord webhook:', err);
  }
}

async function dispatchToWebhook(payload: AlertTriggerPayload): Promise<void> {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn(
      '[alert] ALERT_WEBHOOK_URL not set – falling back to log channel.',
    );
    await dispatchToLog(payload);
    return;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(
        `[alert] Webhook responded with HTTP ${res.status} for rule ${payload.ruleId}`,
      );
    }
  } catch (err) {
    console.error('[alert] Failed to POST to alert webhook:', err);
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Trigger an alert for the given rule, subject to cooldown enforcement.
 *
 * Behaviour:
 * 1. If the rule was triggered within `rule.cooldownMs` milliseconds, the call
 *    is silently skipped to prevent notification floods.
 * 2. The trigger is always logged to Logflare (if configured) and to console.
 * 3. The payload is dispatched to `rule.notificationChannel`.
 *
 * @param rule    - The `AlertRule` to evaluate.
 * @param context - Free-form key/value pairs describing the trigger event
 *                  (e.g. `{ service: 'discord-bot', errorRate: 0.12 }`).
 */
export async function triggerAlert(
  rule: AlertRule,
  context: Record<string, unknown>,
): Promise<void> {
  const now = Date.now();
  const last = lastTriggerAt.get(rule.id);

  if (last !== undefined && now - last < rule.cooldownMs) {
    // Still within cooldown window; skip dispatch.
    return;
  }

  lastTriggerAt.set(rule.id, now);

  const payload: AlertTriggerPayload = {
    ruleId: rule.id,
    ruleName: rule.name,
    timestamp: new Date(now).toISOString(),
    context,
  };

  // Always log the trigger via Logflare (fire-and-forget) and console.
  await sendToLogflare({
    level: 'warn',
    message: `Alert triggered: ${rule.name}`,
    service: 'monitoring-alerts',
    ruleId: rule.id,
    threshold: rule.threshold,
    ...context,
  });
  console.warn(
    `[alert] Triggered: ${rule.id} at ${payload.timestamp}`,
    context,
  );

  // Dispatch to the configured notification channel.
  switch (rule.notificationChannel) {
    case 'discord':
      await dispatchToDiscord(payload);
      break;
    case 'webhook':
      await dispatchToWebhook(payload);
      break;
    case 'log':
    default:
      await dispatchToLog(payload);
      break;
  }
}

/**
 * Reset the cooldown state for a specific rule (primarily useful in tests).
 *
 * @param ruleId - The rule id whose cooldown should be cleared.
 */
export function resetAlertCooldown(ruleId: string): void {
  lastTriggerAt.delete(ruleId);
}

/**
 * Reset all cooldown state (primarily useful in tests or after a restart
 * when you want all rules to be immediately re-triggerable).
 */
export function resetAllAlertCooldowns(): void {
  lastTriggerAt.clear();
}
