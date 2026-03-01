import { Client, TextChannel } from 'discord.js';
import { Client as ESClient } from '@elastic/elasticsearch';
import { listReviewOverdueRegulations } from './regulations-retrieval.js';

export interface RegulationsNotifierConfig {
  elasticUrl: string;
  elasticApiKey: string;
  channelId: string;
  guildId?: string;
  intervalMs?: number;
  maxRowsInMessage?: number;
}

const DEFAULT_INTERVAL_MS = 6 * 60 * 60 * 1000;


let notifierTimer: NodeJS.Timeout | null = null;
let initialTimeout: NodeJS.Timeout | null = null;

export function startRegulationsNotifier(
  client: Client,
  cfg: RegulationsNotifierConfig,
): void {
  if (notifierTimer) return;

  const esClient = new ESClient({ node: cfg.elasticUrl, auth: { apiKey: cfg.elasticApiKey } });
  const intervalMs = cfg.intervalMs ?? DEFAULT_INTERVAL_MS;
  const maxRows = cfg.maxRowsInMessage ?? 15;

  let lastFingerprint = '';

  const tick = async () => {
    try {
      const rows = await listReviewOverdueRegulations(esClient);
      if (!rows.length) return;

      const fingerprint = JSON.stringify(
        rows
          .slice(0, 25)
          .map((r) => `${r.state_code}:${r.topic}:${r.subtopic}:${r.next_review_due}`),
      );

      if (fingerprint === lastFingerprint) return;
      lastFingerprint = fingerprint;

      const channel = await client.channels.fetch(cfg.channelId);
      if (!channel || !channel.isTextBased()) {
        console.error('[Regulations] Notification channel is not text-based.');
        return;
      }

      if (cfg.guildId && 'guild' in channel && channel.guild?.id !== cfg.guildId) {
        console.error('[Regulations] Channel guild mismatch; skipping send.');
        return;
      }

      const header = `Regulations review overdue: ${rows.length} record(s)`;
      const body = rows
        .slice(0, maxRows)
        .map(
          (r) =>
            `- ${r.state_code} | ${r.topic}/${r.subtopic} | ${r.status} | due ${r.next_review_due}`,
        )
        .join('\n');

      const more = rows.length > maxRows ? `\n...and ${rows.length - maxRows} more.` : '';

      await (channel as TextChannel).send(`${header}\n\n${body}${more}`);
      console.log(`[Regulations] Posted overdue summary to channel ${cfg.channelId}`);
    } catch (err) {
      console.error('[Regulations] Notifier tick failed:', err);
    }
  };

  initialTimeout = setTimeout(() => {
    tick().catch(() => undefined);
  }, 20_000);

  notifierTimer = setInterval(() => {
    tick().catch(() => undefined);
  }, intervalMs);

  console.log(`[Regulations] Notifier started (interval ${intervalMs}ms)`);
}

export function stopRegulationsNotifier(): void {
  if (initialTimeout) {
    clearTimeout(initialTimeout);
    initialTimeout = null;
  }
  if (notifierTimer) {
    clearInterval(notifierTimer);
    notifierTimer = null;
    console.log('[Regulations] Notifier stopped');
  }
}

