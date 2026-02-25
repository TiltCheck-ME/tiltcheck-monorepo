/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Telegram Monitor - Polls channels for new messages and extracts codes
 * 
 * NOTE: This uses a polling approach. For production, consider:
 * - MTProto client (telegram) for real-time updates
 * - Bot API with webhooks
 * - TDLib for advanced features
 */

import type { TelegramConfig, PromoCode, CodeDatabase } from './types.js';
import { detectCodes, extractWagerRequirement } from './code-detector.js';
import { randomUUID } from 'crypto';

/**
 * Telegram channel monitor
 * Polls channels at regular intervals and extracts promo codes
 */
export class TelegramMonitor {
  private config: TelegramConfig;
  private database: CodeDatabase;
  private intervalId?: NodeJS.Timeout;
  private lastMessageIds: Map<string, string> = new Map();

  constructor(config: TelegramConfig, database: CodeDatabase) {
    this.config = config;
    this.database = database;
  }

  /**
   * Start monitoring channels
   */
  async start(): Promise<void> {
    console.log('[TelegramMonitor] Starting monitor...');
    console.log(`[TelegramMonitor] Channels: ${this.config.channels.join(', ')}`);
    console.log(
      `[TelegramMonitor] Poll interval: ${this.config.pollInterval}s`
    );

    // Initial poll
    await this.pollChannels();

    // Set up interval
    this.intervalId = setInterval(
      () => this.pollChannels(),
      this.config.pollInterval * 1000
    );
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    console.log('[TelegramMonitor] Stopped monitoring');
  }

  /**
   * Poll all configured channels for new messages
   */
  private async pollChannels(): Promise<void> {
    for (const channel of this.config.channels) {
      try {
        await this.pollChannel(channel);
      } catch (error) {
        console.error(`[TelegramMonitor] Error polling ${channel}:`, error);
      }
    }
  }

  /**
   * Poll a single channel for new messages
   * 
   * NOTE: This is a placeholder implementation
   * In production, replace with actual Telegram API calls:
   * 
   * ```typescript
   * import { TelegramClient } from 'telegram';
   * 
   * const client = new TelegramClient(
   *   new StringSession(this.config.sessionString),
   *   this.config.apiId,
   *   this.config.apiHash,
   *   { connectionRetries: 5 }
   * );
   * 
   * await client.connect();
   * 
   * const messages = await client.getMessages(channel, {
   *   limit: 10,
   *   offsetId: lastMessageId,
   * });
   * 
   * for (const message of messages) {
   *   await this.processMessage(channel, message.id, message.text);
   * }
   * ```
   */
  private async pollChannel(channel: string): Promise<void> {
    console.log(`[TelegramMonitor] Polling ${channel}...`);

    // Placeholder: In production, fetch actual messages from Telegram
    // For now, simulate finding no new messages
    const messages: Array<{ id: string; text: string }> = [];

    for (const message of messages) {
      await this.processMessage(channel, message.id, message.text);
    }
  }

  /**
   * Process a message and extract codes
   */
  private async processMessage(
    channel: string,
    messageId: string,
    text: string
  ): Promise<void> {
    // Skip if we've already processed this message
    const lastId = this.lastMessageIds.get(channel);
    if (lastId && messageId <= lastId) {
      return;
    }

    // Update last message ID
    this.lastMessageIds.set(channel, messageId);

    // Detect codes in message
    const codes = detectCodes(text);

    if (codes.length === 0) {
      return;
    }

    console.log(
      `[TelegramMonitor] Found ${codes.length} code(s) in ${channel}:`,
      codes
    );

    // Extract wager requirement if present
    const wagerRequired = extractWagerRequirement(text);

    // Save each code
    for (const code of codes) {
      try {
        // Check if code already exists
        const existing = await this.database.getCode(code);
        if (existing) {
          console.log(`[TelegramMonitor] Code ${code} already exists, skipping`);
          continue;
        }

        // Create new promo code
        const promoCode: PromoCode = {
          id: randomUUID(),
          code,
          sourceChannel: channel,
          detectedAt: new Date(),
          metadata: {
            messageId,
            messageText: text,
            wagersRequired: wagerRequired,
          },
          status: 'active',
        };

        // Save to database
        await this.database.saveCode(promoCode);

        // Emit event (if event router is available)
        this.emitCodeDetected(promoCode);
      } catch (error) {
        console.error(`[TelegramMonitor] Error saving code ${code}:`, error);
      }
    }
  }

  /**
   * Emit code detected event
   * Placeholder for event router integration
   */
  private emitCodeDetected(code: PromoCode): void {
    console.log(`[TelegramMonitor] Event: code.detected - ${code.code}`);

    // TODO: Integrate with @tiltcheck/event-router
    // eventRouter.emit('code.detected', {
    //   code: code.code,
    //   source: code.sourceChannel,
    //   detectedAt: code.detectedAt.toISOString(),
    // });
  }
}
