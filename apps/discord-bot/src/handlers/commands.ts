/* Copyright (c) 2026 TiltCheck. All rights reserved. */
/**
 * Command Handler
 * 
 * Loads and manages slash commands.
 */

import { Collection } from 'discord.js';
import type { Command, CommandCollection } from '../types.js';
import * as commands from '../commands/index.js';
import { loadCommands as dynamicLoadCommands } from '../commands/loader.js';

export class CommandHandler {
  private commands: CommandCollection;

  constructor() {
    this.commands = new Collection();
  }

  /**
   * Load all commands
   */
  loadCommands(): void {
    const serviceId = process.env.SERVICE_ID || 'tiltcheck-bot';

    // Define which commands belong to which bot
    const dadBotCommands = ['lobby', 'degens-help', 'triviadrop', 'linkwallet', 'recover'];
    const tiltCheckBotCommands = [
      'status', 'tether', 'odds', 'verify', 'goal', 'intervene',
      'lockvault', 'casino', 'juicedrop', 'jackpot',
      'support', 'terms', 'dashboard', 'help', 'reputation', 'jme',
      'recover', 'linkwallet', 'scan',
    ];

    const allowedCommands = serviceId === 'tiltcheck-degens-bot'
      ? dadBotCommands
      : tiltCheckBotCommands;

    // Load commands from the commands directory
    const commandModules = Object.values(commands);

    for (const command of commandModules) {
      if ('data' in command && 'execute' in command) {
        const cmdName = command.data.name;

        if (allowedCommands.includes(cmdName)) {
          this.commands.set(cmdName, command as Command);
          console.log(`  📄 /${cmdName}`);
        }
      }
    }

    console.log(`  └── ${this.commands.size} commands loaded for ${serviceId}`);
  }

  /**
   * Get a command by name
   */
  getCommand(name: string): Command | undefined {
    return this.commands.get(name);
  }

  /**
   * Get all commands
   */
  getAllCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get command data for registration
   */
  getCommandData() {
    return this.getAllCommands().map((cmd) => cmd.data.toJSON());
  }

  /**
   * Dynamically discover and load all command files from the commands/
   * directory using the fs.readdir-based loader. This supplements (and
   * may replace) the static `loadCommands()` barrel import approach.
   *
   * After this resolves, the internal collection is replaced with the
   * dynamically-discovered set.
   */
  async loadCommandsDynamic(): Promise<void> {
    const discovered = await dynamicLoadCommands();
    this.commands = discovered as unknown as CommandCollection;
    console.log(`  [CommandHandler] Dynamic load complete – ${this.commands.size} command(s) active`);
  }
}
