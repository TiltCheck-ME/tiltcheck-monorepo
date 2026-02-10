/**
 * Discord Bot Integration Test
 * 
 * Tests Discord bot components without requiring a real Discord connection.
 * Demonstrates how commands and Event Router work together.
 * 
 * Run with: npx tsx apps/discord-bot/examples/test-bot.ts
 */

import { CommandHandler } from '../src/handlers/commands.js';
import { eventRouter } from '@tiltcheck/event-router';
import { suslink } from '@tiltcheck/suslink';
import {
  linkScanEmbed,
  successEmbed,
  formatTimestamp,
  createProgressBar,
} from '@tiltcheck/discord-utils';

console.log('='.repeat(70));
console.log('🤖 TiltCheck Discord Bot - Integration Test');
console.log('='.repeat(70));

async function testCommands() {
  console.log('\n' + '-'.repeat(70));
  console.log('Testing Command Handler');
  console.log('-'.repeat(70));

  const commandHandler = new CommandHandler();
  commandHandler.loadCommands();

  const commands = commandHandler.getAllCommands();
  console.log(`\n✅ Loaded ${commands.length} commands:`);
  commands.forEach((cmd: any) => {
    console.log(`  • /${cmd.data.name} - ${cmd.data.description}`);
  });

  // Test command data for Discord registration
  const commandData = commandHandler.getCommandData();
  console.log(`\n✅ Command registration data ready (${commandData.length} commands)`);
}

async function testEmbeds() {
  console.log('\n' + '-'.repeat(70));
  console.log('Testing Discord Embeds');
  console.log('-'.repeat(70));

  // Test link scan embed
  const scanResult = await suslink.scanUrl('https://stakee.com/verify-account');
  const scanEmbed = linkScanEmbed({
    url: scanResult.url,
    riskLevel: scanResult.riskLevel,
    reason: scanResult.reason,
    scannedAt: scanResult.scannedAt,
  });

  console.log('\n✅ Link Scan Embed:');
  console.log(`  Title: ${scanEmbed.data.title}`);
  console.log(`  Color: ${scanEmbed.data.color}`);
  console.log(`  Fields: ${scanEmbed.data.fields?.length || 0}`);

  // Test success embed
  const success = successEmbed('Command Executed', 'Your scan completed successfully');
  console.log('\n✅ Success Embed:');
  console.log(`  Title: ${success.data.title}`);
  console.log(`  Description: ${success.data.description}`);
}

async function testFormatters() {
  console.log('\n' + '-'.repeat(70));
  console.log('Testing Discord Formatters');
  console.log('-'.repeat(70));

  // Test timestamp formatter
  const timestamp = formatTimestamp(new Date(), 'R');
  console.log(`\n✅ Timestamp: ${timestamp}`);

  // Test progress bar
  const progress = createProgressBar(75, 100);
  console.log(`✅ Progress Bar: ${progress} (75%)`);
}

async function testEventIntegration() {
  console.log('\n' + '-'.repeat(70));
  console.log('Testing Event Router Integration');
  console.log('-'.repeat(70));

  // Simulate Discord bot subscribing to events
  eventRouter.subscribe(
    'link.scanned',
    async (event: any) => {
      const { url, riskLevel } = event.data;
      console.log(`  [Bot] Received scan result: ${url} → ${riskLevel}`);
    },
    'discord-bot'
  );

  eventRouter.subscribe(
    'link.flagged',
    async (event: any) => {
      const { url, riskLevel } = event.data;
      console.log(`  [Bot] 🚨 High-risk link flagged: ${url} (${riskLevel})`);
    },
    'discord-bot'
  );

  console.log('\n✅ Bot subscribed to events');

  // Simulate scanning some URLs
  console.log('\n📡 Simulating URL scans...\n');

  const testUrls = [
    'https://stake.com/promotions',
    'https://stakee.com/verify',
    'https://free-bonus.tk/claim',
  ];

  for (const url of testUrls) {
    await suslink.scanUrl(url, 'test-user-123');
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  await new Promise((resolve) => setTimeout(resolve, 200));
}

async function showStats() {
  console.log('\n' + '='.repeat(70));
  console.log('Final Statistics');
  console.log('='.repeat(70));

  const stats = eventRouter.getStats();
  console.log('\n📊 Event Router:');
  console.log(`  Total Subscriptions: ${stats.totalSubscriptions}`);
  console.log(`  Event Types: ${stats.eventTypes}`);
  console.log(`  History Size: ${stats.historySize}`);

  const history = eventRouter.getHistory({ limit: 5 });
  console.log(`\n📜 Recent Events (last ${history.length}):`);
  history.forEach((event: any, i: any) => {
    console.log(`  ${i + 1}. ${event.type} from ${event.source}`);
  });
}

async function main() {
  try {
    await testCommands();
    await testEmbeds();
    await testFormatters();
    await testEventIntegration();
    await showStats();

    console.log('\n' + '='.repeat(70));
    console.log('✅ All Tests Passed!');
    console.log('='.repeat(70));

    console.log('\n💡 Next Steps:');
    console.log('  1. Create a Discord bot at https://discord.com/developers');
    console.log('  2. Copy .env.example to .env and add your bot token');
    console.log('  3. Run: npx tsx apps/discord-bot/src/deploy-commands.ts');
    console.log('  4. Run: npx pnpm --filter @tiltcheck/discord-bot dev');
    console.log('  5. Invite bot to your server and use /scan command!');
    
    console.log('\n' + '='.repeat(70));
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

main();
