/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Webhook Service
 * 
 * Asynchronously dispatches events to registered partner webhooks.
 * Includes HMAC signature generation for partner verification.
 */

import { findActiveWebhooksByEvent, logWebhookDelivery, findPartnerById, Webhook } from '@tiltcheck/db';
import crypto from 'node:crypto';

export class WebhookService {
  /**
   * Dispatch an ecosystem event to all active webhooks subscribed to that event type.
   */
  public async dispatch(eventType: string, payload: unknown): Promise<void> {
    try {
      const webhooks: Webhook[] = await findActiveWebhooksByEvent(eventType);
      
      if (webhooks.length === 0) {
        return;
      }

      console.log(`[WebhookService] Dispatching ${eventType} to ${webhooks.length} subscribers`);

      // Parallel execution with error isolation
      await Promise.allSettled(
        webhooks.map(async (webhook: Webhook) => {
          const partner = await findPartnerById(webhook.partner_id);
          if (!partner || !partner.is_active) {
              return;
          }

          const startTime = Date.now();
          const timestamp = Date.now();
          
          const payloadEnvelope = {
            id: crypto.randomUUID(),
            event: eventType,
            timestamp,
            payload
          };

          const payloadString = JSON.stringify(payloadEnvelope);

          // Calculate HMAC signature using partner's secret key
          const signature = crypto
            .createHmac('sha256', partner.secret_key)
            .update(payloadString)
            .digest('hex');

          let responseStatus: number | null = null;
          let responseBody: string | null;

          try {
            const response = await fetch(webhook.target_url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'TiltCheck-Webhook-Engine/1.0',
                'X-TiltCheck-Signature': signature,
                'X-TiltCheck-Event': eventType,
                'X-TiltCheck-Timestamp': timestamp.toString(),
                'X-TiltCheck-Partner-Id': partner.app_id
              },
              body: payloadString,
              // Timeout after 10 seconds to avoid hanging workers
              signal: AbortSignal.timeout(10000)
            });

            responseStatus = response.status;
            responseBody = await response.text();
          } catch (fetchError) {
            console.error(`[WebhookService] Delivery failed for ${webhook.target_url}:`, fetchError);
            responseBody = fetchError instanceof Error ? fetchError.message : String(fetchError);
          }

          // Persist delivery result to database
          await logWebhookDelivery({
            webhook_id: webhook.id,
            event_type: eventType,
            payload: payloadEnvelope,
            response_status: responseStatus,
            response_body: responseBody?.slice(0, 1000) || null,
            duration_ms: Date.now() - startTime,
            attempt_count: 1,
            last_attempt_at: new Date()
          });
        })
      );
    } catch (error) {
      console.error('[WebhookService] Global dispatch error:', error);
    }
  }
}

export const webhookService = new WebhookService();
