/**
 * Real Telegram client implementation using telegram library
 */

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';
import type { TelegramConfig, PromoCode, CodeDatabase } from './types.js';
import { detectCodes, extractWagerRequirement } from './code-detector.js';
import { randomUUID } from 'crypto';
import input from 'input';

/**
 * Real Telegram monitor using MTProto
 */
export class RealTelegramMonitor {
  private config: TelegramConfig;
  private database: CodeDatabase;
  private client: TelegramClient | null = null;
  private processedMessages: Set<string> = new Set();

  constructor(config: TelegramConfig, database: CodeDatabase) {
    this.config = config;
    this.database = database;
  }

  /**
   * Start monitoring channels
   */
  async start(): Promise<void> {
    console.log('[TelegramClient] Starting real Telegram client...');
    console.log(`[TelegramClient] Channels: ${this.config.channels.join(', ')}`);

    // Initialize session
    const session = new StringSession(this.config.sessionString || '');
    
    // Create client
    this.client = new TelegramClient(
      session,
      parseInt(this.config.apiId),
      this.config.apiHash,
      {
        connectionRetries: 5,
        useWSS: true,
      }
    );

    // Start client
    await this.client.start({
      phoneNumber: async () => await input.text('Phone number: '),
      password: async () => await input.text('Password: '),
      phoneCode: async () => await input.text('Code: '),
      onError: (err: Error) => console.error('[TelegramClient] Auth error:', err),
    });

    console.log('[TelegramClient] Client connected successfully');
    
    // Save session string for future use
    const sessionString = this.client.session.save();
    if (!this.config.sessionString) {
      console.log('[TelegramClient] Save this session string to TELEGRAM_SESSION_STRING:');
      if (typeof sessionString === 'string') {
        console.log(sessionString);
      }
    }

    // Register event handler for new messages
    this.client.addEventHandler(
      this.handleNewMessage.bind(this),
      new NewMessage({})
    );

    console.log('[TelegramClient] Monitoring channels for new messages...');
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
    console.log('[TelegramClient] Stopped monitoring');
  }

  /**
   * Handle new message event
   */
  private async handleNewMessage(event: any): Promise<void> {
    try {
      const message = event.message;
      if (!message || !message.text) {
        return;
      }

      // Get chat information
      const chat = await event.getChat();
      const chatUsername = chat.username;
      
      // Check if message is from one of our monitored channels
      const channelName = `@${chatUsername}`;
      if (!this.config.channels.includes(channelName)) {
        return;
      }

      // Create unique message ID
      const messageId = `${chat.id}_${message.id}`;
      
      // Skip if already processed
      if (this.processedMessages.has(messageId)) {
        return;
      }
      
      this.processedMessages.add(messageId);
      
      // Process the message
      await this.processMessage(channelName, messageId, message.text);
    } catch (error) {
      console.error('[TelegramClient] Error handling message:', error);
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
    // Detect codes in message
    const codes = detectCodes(text);

    if (codes.length === 0) {
      return;
    }

    console.log(
      `[TelegramClient] Found ${codes.length} code(s) in ${channel}:`,
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
          console.log(`[TelegramClient] Code ${code} already exists, skipping`);
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
        console.error(`[TelegramClient] Error saving code ${code}:`, error);
      }
    }
  }

  /**
   * Emit code detected event
   */
  private emitCodeDetected(code: PromoCode): void {
    console.log(`[TelegramClient] Event: code.detected - ${code.code}`);

    // TODO: Integrate with @tiltcheck/event-router
    // eventRouter.emit('code.detected', {
    //   code: code.code,
    //   source: code.sourceChannel,
    //   detectedAt: code.detectedAt.toISOString(),
    // });
  }
}
