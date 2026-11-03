#!/usr/bin/env node
/* © 2024–2026 TiltCheck Ecosystem. All Rights Reserved. Last Updated: 2026-11-03 */
/**
 * TiltCheck CLI
 * Offline provably fair verifier and casino intelligence toolkit.
 * Runs completely locally with zero remote API dependencies.
 */

import { Command } from 'commander';
import { verifyCommand } from './commands/verify.js';
import { rtpCommand } from './commands/rtp.js';
import { trustCommand } from './commands/trust.js';
import { cooldownCommand } from './commands/cooldown.js';

export { verifyCommand, computeProvablyFair } from './commands/verify.js';
export { rtpCommand, buildOperatorRtpReport } from './commands/rtp.js';
export { trustCommand, buildOperatorTrustReport } from './commands/trust.js';
export { cooldownCommand, generateCooldownLock } from './commands/cooldown.js';

export function printAbout(): void {
  console.log([
    '======================================================================',
    'TILTCHECK: NON-CUSTODIAL CASINO INTELLIGENCE & BANKROLL DEFENSE',
    '======================================================================',
    '',
    'MISSION:',
    '  TiltCheck equips online casino players with unvarnished mathematical',
    '  facts, offline provably fair verification, and cryptographic cooldown',
    '  commitments. Zero remote API dependencies. Zero trackers. Zero fluff.',
    '',
    'CORE PRINCIPLES:',
    '  1. Non-Custodial: We never touch your funds, wallets, or private keys.',
    '  2. Local-First: All hashes, signatures, and RTP analyses run offline.',
    '  3. Unvarnished Reality: We expose hidden slot downgrades and rogue operators.',
    '',
    'COMMANDS:',
    '  tiltcheck verify <serverSeed> <clientSeed> <nonce>  Verify bet hash offline',
    '  tiltcheck rtp <operator>                            Inspect reported RTP & downgrades',
    '  tiltcheck trust <operator>                          Inspect licenses & trust grades',
    '  tiltcheck cooldown <hours>                          Generate Ed25519 lock token',
    '======================================================================',
    'Made for Degens. By Degens.',
  ].join('\n'));
}

const program = new Command();

program
  .name('tiltcheck')
  .description('TiltCheck CLI - Offline Provably Fair Verifier and Casino Intelligence')
  .version('0.2.0')
  .option('--about', 'Display TiltCheck mission, architecture, and brand values')
  .addHelpText('after', '\n  Made for Degens. By Degens.\n')
  .action((options) => {
    if (options.about) {
      printAbout();
      return;
    }
    program.help();
  });

// Also support `tiltcheck about` command
const aboutCommand = new Command('about')
  .description('Display TiltCheck mission, architecture, and brand values')
  .action(() => {
    printAbout();
  });

// Local-first offline commands
program.addCommand(verifyCommand);
program.addCommand(rtpCommand);
program.addCommand(trustCommand);
program.addCommand(cooldownCommand);
program.addCommand(aboutCommand);

program.parse();
