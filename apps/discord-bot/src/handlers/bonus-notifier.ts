import { Client } from 'discord.js';
import { collectclock } from '@tiltcheck/collectclock';

/**
 * Start the bonus notification loop
 */
export function startBonusNotifier(client: Client) {
  console.log('🔔 [BonusNotifier] Starting notification loop...');
  
  // Check every 60 seconds
  setInterval(async () => {
    try {
      const pending = collectclock.checkPendingNotifications();
      
      if (pending.length === 0) return;
      
      console.log(`🔔 [BonusNotifier] Sending ${pending.length} notifications...`);
      
      for (const item of pending) {
        const { subscription, type, details } = item;
        
        try {
          const user = await client.users.fetch(subscription.userId);
          if (!user) continue;
          
          let message = '';
          if (type === 'ready') {
            message = `💰 **Bonus Ready!**\nYour daily bonus for **${details.casinoName}** (${details.amount} SC) is ready to claim! Use \`/bonus claim casino:${details.casinoName}\` to restart your timer.`;
          } else if (type === 'nerf') {
            message = `⚠️ **Bonus Nerf Detected**\nWe've detected a significant drop in the bonus amount for **${details.casinoName}** (from ${details.previousAmount} to ${details.newAmount} SC). Stay alert!`;
          }
          
          if (message) {
            await user.send(message).catch(() => {
              console.log(`[BonusNotifier] Could not send DM to ${user.tag}`);
            });
          }
        } catch (err) {
          console.error(`[BonusNotifier] Failed to notify user ${subscription.userId}:`, err);
        }
      }
    } catch (error) {
      console.error('[BonusNotifier] Error in notification loop:', error);
    }
  }, 60000);
}
