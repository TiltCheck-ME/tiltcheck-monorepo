/**
 * © 2024–2025 TiltCheck Ecosystem. All Rights Reserved.
 * Created by jmenichole (https://github.com/jmenichole)
 * 
 * This file is part of the TiltCheck project.
 * For licensing information, see LICENSE file in the project root.
 */
/**
 * Clear Broken Commands Script
 * 
 * Removes commands that are deployed but no longer exported/working.
 */

import { REST, Routes } from 'discord.js';
import { config } from './config.js';

// Commands we want to KEEP (core commands that stay)
const KEEP_COMMANDS = [
  'ping',
  'help',
  'tip',           // P2P tipping
  'wallet',        // Wallet management
  'balance',       // Check balance
  'airdrop',       // First-come-first-serve claim pool
  'vault',         // Time-locked vaults
  'support',       // Help/support
  'tiltcheck',     // Login link to tiltcheck.me ecosystem
];

// Commands to REMOVE (redundant, need consolidation, or deprecated)
const REMOVE_COMMANDS = [
  'terms',         // Moved to DM flow
  'pending',       // Not needed
  'triviadrop',    // Should be /trivia with options
  'justthetip',    // Redundant with /tip
  'approvepromo',  // Should be /promo approve
  'denypromo',     // Should be /promo deny
  'pendingpromos', // Should be /promo pending
  'submitpromo',   // Should be /promo submit
  'setpromochannel', // Should be /promo setchannel
  'blockdomain',   // Should be /trust block
  'unblockdomain', // Should be /trust unblock
];

async function clearBrokenCommands() {
  try {
    const rest = new REST().setToken(config.discordToken);

    // Clear global commands
    console.log('[Clear] Fetching global commands...');
    const globalCommands = await rest.get(
      Routes.applicationCommands(config.clientId)
    ) as any[];
    
    console.log(`[Clear] Found ${globalCommands.length} global commands`);
    
    const globalToRemove = globalCommands.filter((cmd: any) => 
      REMOVE_COMMANDS.includes(cmd.name)
    );

    if (globalToRemove.length > 0) {
      console.log(`[Clear] Removing ${globalToRemove.length} global commands:`);
      for (const cmd of globalToRemove) {
        console.log(`  - /${cmd.name}`);
        try {
          await rest.delete(Routes.applicationCommand(config.clientId, cmd.id));
          console.log(`[Clear] ✓ Removed global /${cmd.name}`);
        } catch (error: any) {
          console.error(`[Clear] ✗ Failed:`, error.message);
        }
      }
    } else {
      console.log('[Clear] No global commands to remove');
    }

    // Clear from guild
    const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;
    if (guildId) {
      console.log(`\n[Clear] Fetching guild commands for ${guildId}...`);
      const guildCommands = await rest.get(
        Routes.applicationGuildCommands(config.clientId, guildId)
      ) as any[];
      
      console.log(`[Clear] Found ${guildCommands.length} guild commands`);
      
      const guildToRemove = guildCommands.filter((cmd: any) => 
        REMOVE_COMMANDS.includes(cmd.name)
      );

      if (guildToRemove.length > 0) {
        console.log(`[Clear] Removing ${guildToRemove.length} guild commands:`);
        for (const cmd of guildToRemove) {
          console.log(`  - /${cmd.name}`);
          try {
            await rest.delete(
              Routes.applicationGuildCommand(config.clientId, guildId, cmd.id)
            );
            console.log(`[Clear] ✓ Removed guild /${cmd.name}`);
          } catch (error: any) {
            console.error(`[Clear] ✗ Failed:`, error.message);
          }
        }
      } else {
        console.log('[Clear] No guild commands to remove');
      }
    }

    console.log('\n[Clear] ✅ Done! Discord may cache commands for up to 1 hour.');
  } catch (error) {
    console.error('[Clear] Error:', error);
    process.exit(1);
  }
}

clearBrokenCommands();
